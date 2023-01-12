import Ipc from 'node-ipc';
import {
  Client,
  Channel,
  Message,
  ActionRowBuilder,
  SelectMenuBuilder,
  ButtonBuilder,
  MessageEditOptions,
  MessageCreateOptions,
  SelectMenuComponentOptionData,
} from 'discord.js';
import { addLog, pollingPromptData, execution, placeholderLoading } from '../helpers';
import state from '../state';
import { IDiscordNodePromptParameters } from '../../Discord.node';

export default async function (ipc: typeof Ipc, client: Client) {
  ipc.server.on(
    'send:prompt',
    async (nodeParameters: IDiscordNodePromptParameters, socket: any) => {
      try {
        if (state.ready) {
          const executionMatching = state.executionMatching[nodeParameters.executionId];
          let channelId: string = '';
          if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel)
            channelId = executionMatching?.channelId;
          else channelId = nodeParameters.channelId;

          client.channels
            .fetch(channelId)
            .then(async (channel: Channel | null) => {
              if (!channel || !channel.isTextBased()) return;

              addLog(`send:prompt to ${channelId}`, client);

              const promptProcessing = async (message: Message) => {
                state.promptData[message.id] = nodeParameters;
                await pollingPromptData(
                  message,
                  nodeParameters.content,
                  nodeParameters.timeout,
                  client,
                ).catch((e: any) => addLog(`${e}`, client));
                ipc.server.emit(socket, 'send:prompt', state.promptData[message.id]);
                delete state.promptData[message.id];
                if (nodeParameters.placeholder) {
                  const message = await channel
                    .send({ content: nodeParameters.placeholder })
                    .catch((e: any) => e);
                  await execution(
                    nodeParameters.executionId,
                    message.id,
                    channel.id,
                    nodeParameters.apiKey,
                    nodeParameters.baseUrl,
                  ).catch((e) => e);
                  placeholderLoading(message, message.id, nodeParameters.placeholder);
                }
              };

              let row: ActionRowBuilder;

              if (nodeParameters.buttons) {
                const buttons: ButtonBuilder[] = [];
                (nodeParameters.buttons.button ?? []).forEach(
                  (button: { label: string; value: string; style: number }) => {
                    buttons.push(
                      new ButtonBuilder()
                        .setCustomId(button.value)
                        .setLabel(button.label)
                        .setStyle(button.style),
                    );
                  },
                );
                row = new ActionRowBuilder().addComponents(buttons);
              } else {
                const options: SelectMenuComponentOptionData[] = [];
                (nodeParameters.select.select ?? []).forEach(
                  (select: { label: string; description: string; value: string }) => {
                    options.push({
                      label: select.label,
                      ...(select.description ? { description: select.description } : {}),
                      value: select.value,
                    });
                  },
                );
                const select = new SelectMenuBuilder()
                  .setCustomId('select')
                  .setPlaceholder('...')
                  .setMinValues(nodeParameters.persistent ? nodeParameters.minSelect : 1)
                  .setMaxValues(nodeParameters.persistent ? nodeParameters.maxSelect : 1)
                  .addOptions(options);
                row = new ActionRowBuilder().addComponents(select);
              }

              let mentions = '';
              if (nodeParameters.mentionRoles) {
                nodeParameters.mentionRoles.forEach((role: string) => {
                  mentions += ` <@&${role}>`;
                });
              }

              let content = '';
              if (nodeParameters.content) content += nodeParameters.content;
              if (mentions) content += mentions;

              const sendObject = {
                content: content + (nodeParameters.timeout ? ` (${nodeParameters.timeout}s)` : ''),
                components: [row],
              };

              if (nodeParameters.triggerPlaceholder && executionMatching?.placeholderId) {
                const realPlaceholderId =
                  state.placeholderMatching[executionMatching.placeholderId];
                if (realPlaceholderId) {
                  const message = await channel.messages
                    .fetch(realPlaceholderId)
                    .catch((e: any) => {
                      addLog(`${e}`, client);
                    });
                  delete state.placeholderMatching[executionMatching.placeholderId];
                  if (message && message.edit) {
                    let t = 0;
                    const retry = async () => {
                      if (state.placeholderWaiting[executionMatching.placeholderId] && t < 10) {
                        t++;
                        setTimeout(() => retry(), 300);
                      } else {
                        await message.edit(sendObject as MessageEditOptions).catch((e: any) => {
                          addLog(`${e}`, client);
                        });
                        promptProcessing(message);
                      }
                    };
                    retry();
                    return;
                  }
                }
              }
              if (executionMatching?.placeholderId)
                delete state.placeholderMatching[executionMatching.placeholderId];

              let message;

              if (nodeParameters.updateMessageId) {
                const messageToEdit = await channel.messages
                  .fetch(nodeParameters.updateMessageId)
                  .catch((e: any) => {
                    addLog(`${e}`, client);
                  });
                if (messageToEdit && messageToEdit.edit) {
                  message = await messageToEdit
                    .edit(sendObject as MessageEditOptions)
                    .catch((e: any) => {
                      addLog(`${e}`, client);
                    });
                }
              } else {
                message = await channel.send(sendObject as MessageCreateOptions).catch((e: any) => {
                  addLog(`${e}`, client);
                });
              }

              if (message && message.id && !nodeParameters.persistent) {
                promptProcessing(message);
              } else if (message && message.id && nodeParameters.persistent) {
                ipc.server.emit(socket, 'send:prompt', {
                  channelId: channel.id,
                  messageId: message.id,
                });
              }
            })
            .catch((e: any) => {
              addLog(`${e}`, client);
              ipc.server.emit(socket, 'send:prompt', false);
            });
        }
      } catch (e) {
        addLog(`${e}`, client);
        ipc.server.emit(socket, 'send:prompt', false);
      }
    },
  );
}
