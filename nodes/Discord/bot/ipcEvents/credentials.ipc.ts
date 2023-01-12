import Ipc from 'node-ipc';
import { Client } from 'discord.js';
import { ICredentials, addLog } from '../helpers';
import state from '../state';
import commands from '../commands';

export default async function (ipc: typeof Ipc, client: Client) {
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
}
