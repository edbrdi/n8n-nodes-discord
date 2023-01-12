import Ipc from 'node-ipc';
import { Client } from 'discord.js';
import axios from 'axios';
import { addLog, IExecutionData } from '../helpers';
import state from '../state';

export default async function (ipc: typeof Ipc, client: Client) {
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
}
