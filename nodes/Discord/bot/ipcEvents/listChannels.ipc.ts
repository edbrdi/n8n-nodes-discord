import Ipc from 'node-ipc';
import { Client, GuildBasedChannel, ChannelType } from 'discord.js';
import { addLog } from '../helpers';
import state from '../state';

export default async function (ipc: typeof Ipc, client: Client) {
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
}
