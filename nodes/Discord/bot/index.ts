import {
  ChannelType,
  Client,
  GatewayIntentBits,
  TextChannel,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  SelectMenuBuilder,
  SelectMenuComponentOptionData,
  GuildMemberRoleManager,
  Role,
  GuildBasedChannel,
  Channel,
  ColorResolvable,
  Message,
  MessageEditOptions,
  MessageCreateOptions,
  PresenceStatusData,
} from 'discord.js';
import ipc from 'node-ipc';
import { uid } from 'uid';
import axios from 'axios';
import commands from './commands';
import state from './state';
import {
  triggerWorkflow,
  addLog,
  pollingPromptData,
  execution,
  placeholderLoading,
  IExecutionData,
  ICredentials,
} from './helpers';
import {
  IDiscordNodeMessageParameters,
  IDiscordNodePromptParameters,
  IDiscordNodeActionParameters,
} from '../Discord.node';

export default function () {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
    ],
    allowedMentions: {
      parse: ['roles'],
    },
  });

  client.on('ready', () => {
    addLog(`Logged in as ${client.user?.tag}`, client);
  });

  // listen to users changing their status events
  client.on('presenceUpdate', (oldPresence, newPresence) => {
    console.log('presenceUpdate', oldPresence, newPresence);
    // userId, status (online, offline, idle, dnd)
    // get roles ?
  });

  client.on('guildMemberUpdate', (oldMember, newMember) => {
    console.log('guildMemberUpdate', oldMember, newMember);
    // nickname, roles
    // newMember.roles.cache.forEach((role) => {
    //   console.log('role', role);
    // });
  });

  // user joined a server
  client.on('guildMemberAdd', (member) => {
    console.log('member joined', member);
    // userId
    try {
      if (member.user.bot || member.user.system) return;
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key];
        channel.forEach(async (trigger) => {
          if (trigger.type === 'userJoins') {
            // key
            addLog(`triggerWorkflow ${trigger.webhookId}`, client);
            const placeholderMatchingId = trigger.placeholder ? uid() : '';
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              member.user,
              key,
            ).catch((e) => e);
            if (isEnabled && trigger.placeholder) {
              const channel = client.channels.cache.get(key);
              const placeholder = await (channel as TextChannel)
                .send(trigger.placeholder)
                .catch((e: any) => addLog(`${e}`, client));
              if (placeholder)
                placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder);
            }
          }
        });
      });
    } catch (e) {
      addLog(`${e}`, client);
    }
  });

  // user leaving a server
  client.on('guildMemberRemove', (member) => {
    console.log('member leaving', member);
    // user.id user.username user.discriminator user.bot (boolean) user.system (boolean)
    console.log('roles', member.roles.cache);
  });

  // the bot listen to all messages and check if it matches a referenced trigger
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot || message.author.system) return;
      const userRoles = message.member?.roles.cache.map((role) => role.id);
      const clientId = client.user?.id;
      const botMention = message.mentions.users.some((user) => user.id === clientId);
      message.content = message.content.replace(/<@!?\d+>/g, '').trim();

      if (state.channels[message.channelId]) {
        state.channels[message.channelId].forEach(async (trigger) => {
          if (trigger.type === 'message') {
            if (trigger.roleIds.length) {
              const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role));
              if (!hasRole) return;
            }
            if (trigger.botMention && !botMention) return;
            const escapedTriggerValue = (trigger.value ?? '')
              .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
              .replace(/-/g, '\\x2d');
            let regStr = `^${escapedTriggerValue}$`;
            if (trigger.pattern === 'start') regStr = `^${escapedTriggerValue}`;
            else if (trigger.pattern === 'end') regStr = `${escapedTriggerValue}$`;
            else if (trigger.pattern === 'contain') regStr = `${escapedTriggerValue}`;
            else if (trigger.pattern === 'regex') regStr = `${trigger.value}`;
            const reg = new RegExp(regStr, trigger.caseSensitive ? '' : 'i');
            if (reg.test(message.content)) {
              addLog(`triggerWorkflow ${trigger.webhookId}`, client);
              const placeholderMatchingId = trigger.placeholder ? uid() : '';
              const isEnabled = await triggerWorkflow(
                trigger.webhookId,
                message,
                placeholderMatchingId,
                state.baseUrl,
              ).catch((e) => e);
              if (isEnabled && trigger.placeholder) {
                const channel = client.channels.cache.get(message.channelId);
                const placeholder = await (channel as TextChannel)
                  .send(trigger.placeholder)
                  .catch((e: any) => addLog(`${e}`, client));
                if (placeholder)
                  placeholderLoading(placeholder, placeholderMatchingId, trigger.placeholder);
              }
            }
          }
        });
      }
    } catch (e) {
      addLog(`${e}`, client);
    }
  });

  // the bot listen to all interactions and check if it matches a waiting prompt
  client.on('interactionCreate', (interaction) => {
    try {
      if (!interaction.isButton() && !interaction.isSelectMenu()) return;
      const promptData = state.promptData[interaction.message.id];
      const userRoles = (interaction.member?.roles as GuildMemberRoleManager).cache.map(
        (role) => role.id,
      );

      // if not part of a dialog interaction
      if (!promptData) {
        return;
      }

      // check user right & reply proper message
      if (promptData.restrictToRoles) {
        const hasRole = promptData.mentionRoles.some((role: string) => userRoles?.includes(role));
        if (!hasRole) {
          interaction.reply({ content: `You are not allowed to do this`, ephemeral: true });
          return;
        }
      }
      const triggeringUserId = state.executionMatching[promptData.executionId]?.userId;
      if (
        promptData.restrictToTriggeringUser &&
        triggeringUserId &&
        interaction.user.id !== triggeringUserId
      ) {
        interaction.reply({ content: `You are not allowed to do this`, ephemeral: true });
        return;
      }

      // no restriction or user authorized
      if (promptData && !promptData.value) {
        const bt = interaction.isButton()
          ? promptData.buttons?.button.find((b: any) => b.value === interaction.customId)
          : promptData.select?.select.find((b: any) => b.value === interaction.values[0]);
        addLog(`User interact: ${bt.label}`, client);
        promptData.value = interaction.isButton() ? interaction.customId : interaction.values[0];
        promptData.userId = interaction.user.id;
        promptData.userName = interaction.user.username;
        promptData.userTag = interaction.user.tag;
        promptData.channelId = interaction.message.channelId;
        promptData.messageId = interaction.message.id;
        interaction.update({ components: [] }).catch((e: any) => e);
        const channel = client.channels.cache.get(interaction.message.channelId);
        (channel as TextChannel).send(`<@${interaction.user.id}>: ` + bt.label);
        setTimeout(async () => {
          const message = await (channel as TextChannel).messages
            .fetch(interaction.message.id)
            .catch((e: any) => e);
          if (message)
            message.edit({ content: promptData.content, components: [] }).catch((e: any) => e);
        }, 1000);
      }
    } catch (e) {
      addLog(`${e}`, client);
    }
  });

  ipc.config.id = 'bot';
  ipc.config.retry = 1500;

  // nodes are executed in a child process, the Discord bot is executed in the main process
  // so it's not stopped when a node execution end
  // we use ipc to communicate between the node execution process and the bot
  // ipc is serving in the main process & childs connect to it using the ipc client
  ipc.serve(function () {
    addLog(`ipc bot server started`, client);
    ipc.server.on('credentials', (data: ICredentials, socket: any) => {
      try {
        if (
          (!state.login && !state.ready) ||
          (state.ready && (state.clientId !== data.clientId || state.token !== data.token))
        ) {
          if (data.token && data.clientId) {
            state.login = true;
            client.destroy();
            commands(data.token, data.clientId, client).catch((e) => {
              addLog(`${e}`, client);
            });
            client
              .login(data.token)
              .then(() => {
                state.ready = true;
                state.login = false;
                state.clientId = data.clientId;
                state.token = data.token;
                ipc.server.emit(socket, 'credentials', 'ready');
                addLog(`credentials ready`, client);
              })
              .catch((e) => {
                state.login = false;
                ipc.server.emit(socket, 'credentials', 'error');
                addLog(`credentials error`, client);
              });
          } else {
            ipc.server.emit(socket, 'credentials', 'missing');
            addLog(`credentials missing`, client);
          }
        } else if (state.login) {
          ipc.server.emit(socket, 'credentials', 'login');
          addLog(`credentials login`, client);
        } else {
          ipc.server.emit(socket, 'credentials', 'already');
        }
      } catch (e) {
        addLog(`${e}`, client);
      }
    });

    // when a trigger is activated or updated, we get the trigger data et parse it
    // so when a message is received we can check if it matches a trigger
    ipc.server.on('trigger', (data: any) => {
      try {
        addLog(`trigger ${data.webhookId} update`, client);
        state.triggers[data.webhookId] = data;
        state.channels = {};
        state.baseUrl = data.baseUrl;
        Object.keys(state.triggers).forEach((webhookId) => {
          const parameters = state.triggers[webhookId];
          parameters.channelIds.forEach((channelId) => {
            if (!state.channels[channelId] && parameters.active)
              state.channels[channelId] = [parameters];
            else {
              if (parameters.active) state.channels[channelId].push(parameters);
              else delete state.channels[channelId];
            }
          });
        });
      } catch (e) {
        addLog(`${e}`, client);
      }
    });

    // used to handle channels selection in the n8n UI
    ipc.server.on('list:channels', (data: undefined, socket: any) => {
      try {
        if (state.ready) {
          const guild = client.guilds.cache.first();
          const channels =
            guild?.channels.cache.filter((c) => c.type === ChannelType.GuildText) ?? ([] as any);

          const channelsList = channels.map((channel: GuildBasedChannel) => {
            return {
              name: channel?.name,
              value: channel.id,
            };
          });

          ipc.server.emit(socket, 'list:channels', channelsList);
          addLog(`list:channels`, client);
        }
      } catch (e) {
        addLog(`${e}`, client);
      }
    });

    // used to handle roles selection in the n8n UI
    ipc.server.on('list:roles', (data: undefined, socket: any) => {
      try {
        if (state.ready) {
          const guild = client.guilds.cache.first();
          const roles = guild?.roles.cache ?? ([] as any);

          const rolesList = roles.map((role: Role) => {
            return {
              name: role.name,
              value: role.id,
            };
          });

          ipc.server.emit(socket, 'list:roles', rolesList);
          addLog(`list:roles`, client);
        }
      } catch (e) {
        addLog(`${e}`, client);
      }
    });

    // used send button prompt or select prompt in a channel
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
                    .setPlaceholder('Nothing selected')
                    .addOptions(options);
                  row = new ActionRowBuilder().addComponents(select);
                }

                let mentions = '';
                nodeParameters.mentionRoles.forEach((role: string) => {
                  mentions += ` <@&${role}>`;
                });

                let content = '';
                if (nodeParameters.content) content += nodeParameters.content;
                if (mentions) content += mentions;

                const sendObject = {
                  content:
                    content + (nodeParameters.timeout ? ` (${nodeParameters.timeout}s)` : ''),
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
                const message = await channel
                  .send(sendObject as MessageCreateOptions)
                  .catch((e: any) => {
                    addLog(`${e}`, client);
                  });
                if (message && message.id) {
                  promptProcessing(message);
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

    // used to send message to a channel
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
                      const buffer = Buffer.from(
                        nodeParameters.thumbnailUrl.split(',')[1],
                        'base64',
                      );
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

    // used to perform an action in a channel
    ipc.server.on(
      'send:action',
      async (nodeParameters: IDiscordNodeActionParameters, socket: any) => {
        try {
          if (state.ready) {
            const executionMatching = state.executionMatching[nodeParameters.executionId];
            let channelId: string = '';
            if (nodeParameters.triggerPlaceholder || nodeParameters.triggerChannel)
              channelId = executionMatching.channelId;
            else channelId = nodeParameters.channelId;

            if (!channelId && !nodeParameters.actionType) {
              ipc.server.emit(socket, 'send:action', false);
              return;
            }

            client.channels
              .fetch(channelId)
              .then(async (channel: Channel | null) => {
                if (!channel || !channel.isTextBased()) return;

                const performAction = async () => {
                  if (nodeParameters.actionType === 'removeMessages') {
                    await (channel as TextChannel)
                      .bulkDelete(nodeParameters.removeMessagesNumber)
                      .catch((e: any) => addLog(`${e}`, client));
                  }
                };

                if (nodeParameters.triggerPlaceholder && executionMatching.placeholderId) {
                  const realPlaceholderId =
                    state.placeholderMatching[executionMatching.placeholderId];
                  if (realPlaceholderId) {
                    const message = (await channel.messages
                      .fetch(realPlaceholderId)
                      .catch((e: any) => {
                        addLog(`${e}`, client);
                      })) as any;
                    delete state.placeholderMatching[executionMatching.placeholderId];
                    if (message && message.remove) {
                      let t = 0;
                      const retry = async () => {
                        if (state.placeholderWaiting[executionMatching.placeholderId] && t < 10) {
                          t++;
                          setTimeout(() => retry(), 300);
                        } else {
                          await message.delete().catch((e: any) => {
                            addLog(`${e}`, client);
                          });

                          await performAction();
                          ipc.server.emit(socket, 'send:action', {
                            channelId,
                            action: 'removeMessages',
                          });
                        }
                      };
                      retry();
                      return;
                    }
                  }
                }

                await performAction();
                ipc.server.emit(socket, 'send:action', { channelId, action: 'removeMessages' });
              })
              .catch((e: any) => {
                addLog(`${e}`, client);
                ipc.server.emit(socket, 'send:action', false);
              });
          }
        } catch (e) {
          addLog(`${e}`, client);
          ipc.server.emit(socket, 'send:action', false);
        }
      },
    );

    ipc.server.on(
      'bot:status',
      async (
        data: { botActivity: string; botActivityType: number; botStatus: PresenceStatusData },
        socket: any,
      ) => {
        try {
          ipc.server.emit(socket, 'bot:status', true);
          if (state.ready) {
            client.user?.setPresence({
              activities: [{ name: data.botActivity, type: data.botActivityType }],
              status: data.botStatus,
            });
          }
        } catch (e) {
          addLog(`${e}`, client);
        }
      },
    );

    // used to initiate node execution (message, prompt)
    ipc.server.on('execution', async (data: IExecutionData, socket: any) => {
      try {
        ipc.server.emit(socket, 'execution', true);
        if (data.executionId && data.channelId) {
          state.executionMatching[data.executionId] = {
            channelId: data.channelId,
            ...(data.userId ? { userId: data.userId } : {}),
          };
          if (data.placeholderId && data.apiKey && data.baseUrl) {
            state.executionMatching[data.executionId].placeholderId = data.placeholderId;
            const checkExecution = async (
              placeholderId: string,
              executionId: string,
              apiKey: string,
              baseUrl: string,
            ) => {
              const headers = {
                accept: 'application/json',
                'X-N8N-API-KEY': apiKey,
              };
              const res = await axios
                .get(`${data.baseUrl}/executions/${executionId}`, { headers })
                .catch((e) => e);
              if (res && res.data && res.data.finished === false && res.data.stoppedAt === null) {
                setTimeout(() => {
                  if (state.placeholderMatching[placeholderId])
                    checkExecution(placeholderId, executionId, apiKey, baseUrl);
                }, 3000);
              } else {
                delete state.placeholderMatching[placeholderId];
                delete state.executionMatching[data.executionId];
              }
            };
            checkExecution(data.placeholderId, data.executionId, data.apiKey, data.baseUrl);
          }
        }
      } catch (e) {
        addLog(`${e}`, client);
      }
    });
  });

  ipc.server.start();
}
