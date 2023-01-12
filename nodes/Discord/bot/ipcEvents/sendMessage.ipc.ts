import Ipc from 'node-ipc';
import {
  Client,
  Channel,
  Message,
  EmbedBuilder,
  ColorResolvable,
  AttachmentBuilder,
} from 'discord.js';
import { addLog } from '../helpers';
import state from '../state';
import { IDiscordNodeMessageParameters } from '../../Discord.node';

export default async function (ipc: typeof Ipc, client: Client) {
  ipc.server.on(
    'send:message',
    async (nodeParameters: IDiscordNodeMessageParameters, socket: any) => {
      try {
        if (state.ready) {
          const executionMatching = state.executionMatching[nodeParameters.executionId];
          let channelId: string = '';
          if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel)
            channelId = executionMatching.channelId;
          else channelId = nodeParameters.channelId;

          client.channels
            .fetch(channelId)
            .then(async (channel: Channel | null) => {
              if (!channel || !channel.isTextBased()) return;

              const embedFiles = [];

              addLog(`send:message to ${channelId}`, client);

              let embed: EmbedBuilder | undefined;
              if (nodeParameters.embed) {
                embed = new EmbedBuilder();
                if (nodeParameters.title) embed.setTitle(nodeParameters.title);
                if (nodeParameters.url) embed.setURL(nodeParameters.url);
                if (nodeParameters.description) embed.setDescription(nodeParameters.description);
                if (nodeParameters.color) embed.setColor(nodeParameters.color as ColorResolvable);
                if (nodeParameters.timestamp)
                  embed.setTimestamp(Date.parse(nodeParameters.timestamp));
                if (nodeParameters.footerText) {
                  let iconURL = nodeParameters.footerIconUrl;
                  if (iconURL && iconURL.match(/^data:/)) {
                    const buffer = Buffer.from(iconURL.split(',')[1], 'base64');
                    const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                    let mime = reg.exec(nodeParameters.footerIconUrl) ?? [];
                    const file = new AttachmentBuilder(buffer, { name: `footer.${mime[1]}` });
                    embedFiles.push(file);
                    iconURL = `attachment://footer.${mime[1]}`;
                  }
                  embed.setFooter({
                    text: nodeParameters.footerText,
                    ...(iconURL ? { iconURL } : {}),
                  });
                }
                if (nodeParameters.imageUrl) {
                  if (nodeParameters.imageUrl.match(/^data:/)) {
                    const buffer = Buffer.from(nodeParameters.imageUrl.split(',')[1], 'base64');
                    const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                    let mime = reg.exec(nodeParameters.imageUrl) ?? [];
                    const file = new AttachmentBuilder(buffer, { name: `image.${mime[1]}` });
                    embedFiles.push(file);
                    embed.setImage(`attachment://image.${mime[1]}`);
                  } else embed.setImage(nodeParameters.imageUrl);
                }
                if (nodeParameters.thumbnailUrl) {
                  if (nodeParameters.thumbnailUrl.match(/^data:/)) {
                    const buffer = Buffer.from(nodeParameters.thumbnailUrl.split(',')[1], 'base64');
                    const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                    let mime = reg.exec(nodeParameters.thumbnailUrl) ?? [];
                    const file = new AttachmentBuilder(buffer, { name: `thumbnail.${mime[1]}` });
                    embedFiles.push(file);
                    embed.setThumbnail(`attachment://thumbnail.${mime[1]}`);
                  } else embed.setThumbnail(nodeParameters.thumbnailUrl);
                }
                if (nodeParameters.authorName) {
                  let iconURL = nodeParameters.authorIconUrl;
                  if (iconURL && iconURL.match(/^data:/)) {
                    const buffer = Buffer.from(iconURL.split(',')[1], 'base64');
                    const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                    let mime = reg.exec(nodeParameters.authorIconUrl) ?? [];
                    const file = new AttachmentBuilder(buffer, { name: `author.${mime[1]}` });
                    embedFiles.push(file);
                    iconURL = `attachment://author.${mime[1]}`;
                  }
                  embed.setAuthor({
                    name: nodeParameters.authorName,
                    ...(iconURL ? { iconURL } : {}),
                    ...(nodeParameters.authorUrl ? { url: nodeParameters.authorUrl } : {}),
                  });
                }
                if (nodeParameters.fields?.field) {
                  nodeParameters.fields.field.forEach(
                    (field: { name?: string; value?: string; inline?: boolean }) => {
                      if (embed && field.name && field.value)
                        embed.addFields({
                          name: field.name,
                          value: field.value,
                          inline: field.inline,
                        });
                      else if (embed) embed.addFields({ name: '\u200B', value: '\u200B' });
                    },
                  );
                }
              }

              let mentions = '';
              nodeParameters.mentionRoles.forEach((role: string) => {
                mentions += ` <@&${role}>`;
              });

              let content = '';
              if (nodeParameters.content) content += nodeParameters.content;
              if (mentions) content += mentions;

              // embedFiles
              let files: any[] = [];
              if (nodeParameters.files?.file) {
                files = nodeParameters.files?.file.map((file: { url: string }) => {
                  if (file.url.match(/^data:/)) {
                    return Buffer.from(file.url.split(',')[1], 'base64');
                  }
                  return file.url;
                });
              }
              if (embedFiles.length) files = files.concat(embedFiles);

              const sendObject = {
                content: content ?? '',
                ...(embed ? { embeds: [embed] } : {}),
                ...(files.length ? { files } : {}),
              };

              if (nodeParameters.triggerPlaceholder && executionMatching.placeholderId) {
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
                        await message.edit(sendObject).catch((e: any) => {
                          addLog(`${e}`, client);
                        });
                        ipc.server.emit(socket, 'send:message', {
                          channelId,
                          messageId: message.id,
                        });
                      }
                    };
                    retry();
                    return;
                  }
                }
              }
              const message = (await channel.send(sendObject).catch((e: any) => {
                addLog(`${e}`, client);
              })) as Message;
              ipc.server.emit(socket, 'send:message', { channelId, messageId: message.id });
            })
            .catch((e: any) => {
              addLog(`${e}`, client);
              ipc.server.emit(socket, 'send:message', false);
            });
        }
      } catch (e) {
        addLog(`${e}`, client);
        ipc.server.emit(socket, 'send:message', false);
      }
    },
  );
}
