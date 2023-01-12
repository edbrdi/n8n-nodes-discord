import {
  Client,
  GatewayIntentBits,
  TextChannel,
  GuildMemberRoleManager,
  ComponentType,
} from 'discord.js';
import ipc from 'node-ipc';
import { uid } from 'uid';
import state from './state';
import { triggerWorkflow, addLog, placeholderLoading } from './helpers';
import credentialsIpc from './ipcEvents/credentials.ipc';
import triggerIpc from './ipcEvents/trigger.ipc';
import listChannelsIpc from './ipcEvents/listChannels.ipc';
import listRolesIpc from './ipcEvents/listRoles.ipc';
import sendPromptIpc from './ipcEvents/sendPrompt.ipc';
import sendMessageIpc from './ipcEvents/sendMessage.ipc';
import sendActionIpc from './ipcEvents/sendAction.ipc';
import botStatusIpc from './ipcEvents/botStatus.ipc';
import executionIpc from './ipcEvents/execution.ipc';

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
      parse: ['roles', 'users', 'everyone'],
    },
  });

  client.on('ready', () => {
    addLog(`Logged in as ${client.user?.tag}`, client);
  });

  // listen to users changing their status events
  client.on('presenceUpdate', (oldPresence, newPresence) => {
    const member = newPresence.member;
    try {
      if (!member || member.user.bot || member.user.system) return;
      const userRoles = member.roles.cache.map((role) => role.id);
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key];
        channel.forEach(async (trigger) => {
          if (trigger.roleIds.length) {
            const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role));
            if (!hasRole) return;
          }
          if (
            trigger.type === 'userPresenceUpdate' &&
            (trigger.presence === newPresence.status || trigger.presence === 'any')
          ) {
            addLog(`triggerWorkflow ${trigger.webhookId}`, client);
            const placeholderMatchingId = trigger.placeholder ? uid() : '';
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              member.user,
              key,
              newPresence.status,
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

  // listen to users updates (roles)
  client.on('guildMemberUpdate', (oldMember, member) => {
    try {
      if (!member || member.user.bot || member.user.system) return;
      const previousUserRoles = oldMember.roles.cache.map((role) => role.id);
      const currentUserRoles = member.roles.cache.map((role) => role.id);
      const addedRoles = currentUserRoles.filter((role) => !previousUserRoles.includes(role));
      const removedRoles = previousUserRoles.filter((role) => !currentUserRoles.includes(role));
      if (addedRoles.length || removedRoles.length) {
        Object.keys(state.channels).forEach((key) => {
          const channel = state.channels[key];
          channel.forEach(async (trigger) => {
            if (trigger.roleIds.length) {
              const hasRole = trigger.roleIds.some((role) => previousUserRoles?.includes(role));
              if (!hasRole) return;
            }
            if (
              (addedRoles.length && trigger.type === 'userRoleAdded') ||
              (removedRoles.length && trigger.type === 'userRoleRemoved')
            ) {
              if (trigger.type === 'userRoleAdded' && trigger.roleUpdateIds.length) {
                const hasRole = trigger.roleUpdateIds.some((role) => addedRoles?.includes(role));
                if (!hasRole) return;
              }
              if (trigger.type === 'userRoleRemoved' && trigger.roleUpdateIds.length) {
                const hasRole = trigger.roleUpdateIds.some((role) => removedRoles?.includes(role));
                if (!hasRole) return;
              }

              addLog(`triggerWorkflow ${trigger.webhookId}`, client);
              const placeholderMatchingId = trigger.placeholder ? uid() : '';
              const isEnabled = await triggerWorkflow(
                trigger.webhookId,
                null,
                placeholderMatchingId,
                state.baseUrl,
                member.user,
                key,
                undefined,
                addedRoles,
                removedRoles,
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
      }
    } catch (e) {
      addLog(`${e}`, client);
    }
  });

  // user joined a server
  client.on('guildMemberAdd', (member) => {
    try {
      if (member.user.bot || member.user.system) return;
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key];
        channel.forEach(async (trigger) => {
          if (trigger.type === 'userJoins') {
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
    try {
      if (member.user.bot || member.user.system) return;
      const userRoles = member.roles.cache.map((role) => role.id);
      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key];
        channel.forEach(async (trigger) => {
          if (trigger.roleIds.length) {
            const hasRole = trigger.roleIds.some((role) => userRoles?.includes(role));
            if (!hasRole) return;
          }
          if (trigger.type === 'userLeaves') {
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

      const userRoles = (interaction.member?.roles as GuildMemberRoleManager).cache.map(
        (role) => role.id,
      );

      Object.keys(state.channels).forEach((key) => {
        const channel = state.channels[key];
        channel.forEach(async (trigger) => {
          if (
            trigger.type === 'interaction' &&
            trigger.interactionMessageId === interaction.message.id
          ) {
            if (trigger.roleIds.length) {
              const hasRole = trigger.roleIds.some((role: string) => userRoles?.includes(role));
              if (!hasRole) {
                interaction.reply({ content: `You are not allowed to do this`, ephemeral: true });
                return;
              }
            }

            addLog(`triggerWorkflow ${trigger.webhookId}`, client);
            const placeholderMatchingId = trigger.placeholder ? uid() : '';
            const interactionValues = interaction.isButton()
              ? [interaction.customId]
              : interaction.values;
            const isEnabled = await triggerWorkflow(
              trigger.webhookId,
              null,
              placeholderMatchingId,
              state.baseUrl,
              interaction.user,
              key,
              undefined,
              undefined,
              undefined,
              interaction.message.id,
              interactionValues,
              userRoles,
            ).catch((e) => e);

            const labels: string[] = [];

            interaction.message.components.forEach((component) => {
              component.components.forEach((element) => {
                if (
                  element.type === ComponentType.Button &&
                  element.customId === interaction.customId
                ) {
                  if (element.label) labels.push(element.label);
                } else if (element.type === ComponentType.SelectMenu) {
                  element.options.forEach((option) => {
                    // @ts-ignore
                    if (interaction.values.includes(option.value)) labels.push(option.label);
                  });
                }
              });
            });

            interaction.deferUpdate();

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

      const promptData = state.promptData[interaction.message.id];

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
    credentialsIpc(ipc, client);

    // when a trigger is activated or updated, we get the trigger data et parse it
    // so when a message is received we can check if it matches a trigger
    triggerIpc(ipc, client);

    // used to handle channels selection in the n8n UI
    listChannelsIpc(ipc, client);

    // used to handle roles selection in the n8n UI
    listRolesIpc(ipc, client);

    // used send button prompt or select prompt in a channel
    sendPromptIpc(ipc, client);

    // used to send message to a channel
    sendMessageIpc(ipc, client);

    // used to perform an action in a channel
    sendActionIpc(ipc, client);

    // used to change the bot status
    botStatusIpc(ipc, client);

    // used to initiate node execution (message, prompt)
    executionIpc(ipc, client);
  });

  ipc.server.start();
}
