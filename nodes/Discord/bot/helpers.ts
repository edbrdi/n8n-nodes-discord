import ipc from 'node-ipc';
import { INodePropertyOptions } from 'n8n-workflow';
import { Client, Message, User } from 'discord.js';
import axios from 'axios';
import state from './state';

export interface ICredentials {
  clientId: string;
  token: string;
  apiKey: string;
  baseUrl: string;
}

export const connection = (credentials: ICredentials): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!credentials || !credentials.token || !credentials.clientId) {
      reject('credentials missing');
      return;
    }

    const timeout = setTimeout(() => reject('timeout'), 15000);

    ipc.config.retry = 1500;
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit('credentials', credentials);

      ipc.of.bot.on('credentials', (data: string) => {
        clearTimeout(timeout);
        if (data === 'error') reject('Invalid credentials');
        else if (data === 'missing') reject('Token or clientId missing');
        else if (data === 'login') reject('Already logging in');
        else if (data === 'different') resolve('Already logging in with different credentials');
        else resolve(data); // ready / already
      });
    });
  });
};

export const getChannels = async (that: any): Promise<INodePropertyOptions[]> => {
  const endMessage = ' - Close and reopen this node modal once you have made changes.';

  console.log('credentials');
  const credentials = await that.getCredentials('discordApi').catch((e: any) => e);
  const res = await connection(credentials).catch((e) => e);
  if (!['ready', 'already'].includes(res)) {
    return [
      {
        name: res + endMessage,
        value: 'false',
      },
    ];
  }

  const channelsRequest = () =>
    new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(''), 5000);

      ipc.config.retry = 1500;
      ipc.connectTo('bot', () => {
        ipc.of.bot.emit('list:channels');

        ipc.of.bot.on('list:channels', (data: { name: string; value: string }[]) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });
    });

  const channels = await channelsRequest().catch((e) => e);

  let message = 'Unexpected error';

  if (channels) {
    if (Array.isArray(channels) && channels.length) return channels;
    else
      message =
        'Your Discord server has no text channels, please add at least one text channel' +
        endMessage;
  }

  return [
    {
      name: message,
      value: 'false',
    },
  ];
};

export interface IRole {
  name: string;
  id: string;
}

export const getRoles = async (that: any): Promise<INodePropertyOptions[]> => {
  const endMessage = ' - Close and reopen this node modal once you have made changes.';

  const credentials = await that.getCredentials('discordApi').catch((e: any) => e);
  const res = await connection(credentials).catch((e) => e);
  if (!['ready', 'already'].includes(res)) {
    return [
      {
        name: res + endMessage,
        value: 'false',
      },
    ];
  }

  const rolesRequest = () =>
    new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(''), 5000);

      ipc.config.retry = 1500;
      ipc.connectTo('bot', () => {
        ipc.of.bot.emit('list:roles');

        ipc.of.bot.on('list:roles', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });
    });

  const roles = await rolesRequest().catch((e) => e);

  let message = 'Unexpected error';

  if (roles) {
    if (Array.isArray(roles)) {
      const filtered = roles.filter((r: any) => r.name !== '@everyone');
      if (filtered.length) return filtered;
      else
        message =
          'Your Discord server has no roles, please add at least one if you want to restrict the trigger to specific users' +
          endMessage;
    } else message = 'Something went wrong' + endMessage;
  }

  return [
    {
      name: message,
      value: 'false',
    },
  ];
};

export const triggerWorkflow = async (
  webhookId: string,
  message: Message | null,
  placeholderId: string,
  baseUrl: string,
  user?: User,
  channelId?: string,
  presence?: string,
  addedRoles?: string[],
  removedRoles?: string[],
  interactionMessageId?: string,
  interactionValues?: string[],
  userRoles?: string[],
): Promise<boolean> => {
  const headers = {
    accept: 'application/json',
  };

  console.log('webhoooooook', webhookId);

  const res = await axios
    .post(
      `${baseUrl}/webhook${state.testMode ? '-test' : ''}/${webhookId}/webhook`,
      {
        content: message?.content,
        channelId: message?.channelId ?? channelId,
        placeholderId,
        userId: message?.author.id ?? user?.id,
        userName: message?.author.username ?? user?.username,
        userTag: message?.author.tag ?? user?.tag,
        messageId: message?.id,
        attachments: message?.attachments,
        presence,
        addedRoles,
        removedRoles,
        interactionMessageId,
        interactionValues,
        userRoles,
      },
      { headers },
    )
    .catch((e) => {
      console.log(e);
      if (state.triggers[webhookId] && !state.testMode) {
        state.triggers[webhookId].active = false;
        ipc.connectTo('bot', () => {
          ipc.of.bot.emit('trigger', { ...state.triggers[webhookId], baseUrl: state.baseUrl });
        });
      }
    });

  if (res) return true;
  return false;
};

export const addLog = (message: string, client: Client) => {
  console.log(message);
  if (state.logs.length > 99) state.logs.shift();
  const log = `${new Date().toISOString()} -  ${message}`;
  state.logs.push(log);

  if (state.ready && state.autoLogs) {
    const channel = client.channels.cache.get(state.autoLogsChannelId) as any;
    if (channel) channel.send('**' + log + '**');
  }
};

export const ipcRequest = (type: string, parameters: any): Promise<any> => {
  return new Promise((resolve) => {
    ipc.config.retry = 1500;
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit(type, parameters);
      if (parameters.botCustomization && parameters.botActivity)
        ipc.of.bot.emit('bot:status', parameters);

      ipc.of.bot.on(type, (data: any) => {
        resolve(data);
      });
    });
  });
};

export const pollingPromptData = (
  message: any,
  content: string,
  seconds: number,
  client: any,
): Promise<boolean> => {
  return new Promise((resolve) => {
    let i = 1;
    const waiting = async () => {
      if (state.promptData[message.id]?.value || (seconds && i > seconds)) {
        if (!state.promptData[message.id]?.value) {
          await message.edit({ content: content, components: [] }).catch((e: any) => e);
          const channel = client.channels.cache.get(message.channelId) as any;
          if (channel) await channel.send('Timeout reached').catch((e: any) => e);
        }
        resolve(true);
        return;
      } else if (seconds && !state.promptData[message.id]?.value) {
        await message.edit({ content: content + ` (${seconds - i}s)` }).catch((e: any) => e);
      }
      i++;
      setTimeout(() => waiting(), 1000);
    };
    waiting();
  });
};

export interface IExecutionData {
  executionId: string;
  placeholderId: string;
  channelId: string;
  apiKey: string;
  baseUrl: string;
  userId?: string;
}

export const execution = async (
  executionId: string,
  placeholderId: string,
  channelId: string,
  apiKey: string,
  baseUrl: string,
  userId?: string,
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject('timeout'), 15000);
    ipc.connectTo('bot', () => {
      ipc.of.bot.emit('execution', {
        executionId,
        placeholderId,
        channelId,
        apiKey,
        baseUrl,
        userId,
      });
      ipc.of.bot.on('execution', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  });
};

export const placeholderLoading = async (
  placeholder: Message,
  placeholderMatchingId: string,
  txt: string,
) => {
  state.placeholderMatching[placeholderMatchingId] = placeholder.id;
  state.placeholderWaiting[placeholderMatchingId] = true;
  let i = 0;
  const waiting = async () => {
    i++;
    if (i > 3) i = 0;
    let content = txt + '';
    for (let j = 0; j < i; j++) content += '.';

    if (!state.placeholderMatching[placeholderMatchingId]) {
      await placeholder.edit(txt).catch((e: any) => e);
      delete state.placeholderWaiting[placeholderMatchingId];
      return;
    }
    await placeholder.edit(content).catch((e: any) => e);
    setTimeout(async () => {
      if (state.placeholderMatching[placeholderMatchingId]) waiting();
      else {
        await placeholder.edit(txt).catch((e: any) => e);
        delete state.placeholderWaiting[placeholderMatchingId];
      }
    }, 800);
  };
  waiting();
};
