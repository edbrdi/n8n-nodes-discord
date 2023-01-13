import { Client, TextChannel } from 'discord.js';
import { uid } from 'uid';
import { addLog, triggerWorkflow, placeholderLoading } from '../helpers';
import state from '../state';

export default async function (client: Client) {
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
}
