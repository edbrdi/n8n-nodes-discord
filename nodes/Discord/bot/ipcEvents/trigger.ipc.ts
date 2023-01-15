import Ipc from 'node-ipc';
import { Client } from 'discord.js';
import { addLog } from '../helpers';
import state from '../state';

export default async function (ipc: typeof Ipc, client: Client) {
  ipc.server.on('trigger', (data: any) => {
    try {
      addLog(`trigger ${data.webhookId} update`, client);
      state.triggers[data.webhookId] = data;
      state.channels = {};
      state.baseUrl = data.baseUrl;
      Object.keys(state.triggers).forEach((webhookId) => {
        const parameters = state.triggers[webhookId];
        // if no chanellIds are specified, listen to all channels using the 'all' key
        if (!parameters.channelIds || !parameters.channelIds.length) parameters.channelIds = ['all'];
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
}
