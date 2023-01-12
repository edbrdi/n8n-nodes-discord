import Ipc from 'node-ipc';
import { Client, PresenceStatusData } from 'discord.js';
import { addLog } from '../helpers';
import state from '../state';

export default async function (ipc: typeof Ipc, client: Client) {
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
}
