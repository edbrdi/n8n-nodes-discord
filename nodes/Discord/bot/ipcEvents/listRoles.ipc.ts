import Ipc from 'node-ipc';
import { Client, Role } from 'discord.js';
import { addLog } from '../helpers';
import state from '../state';

export default async function (ipc: typeof Ipc, client: Client) {
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
}
