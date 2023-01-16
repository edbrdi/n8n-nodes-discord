import { Client } from 'discord.js';
// import { TextChannel, ComponentType, GuildMemberRoleManager } from 'discord.js';
// import { uid } from 'uid';
// import { addLog, triggerWorkflow, placeholderLoading } from '../helpers';
// import state from '../state';

export default async function (client: Client) {
  client.on('interactionCreate', (interaction) => {
    try {
      if (!interaction.isChatInputCommand()) return;
      if (!interaction.guildId) {
        interaction.reply({ content: 'Commands work only inside channels' });
        return;
      }
    } catch (e) {
      // addLog(`${e}`, client);
    }
  });
}
