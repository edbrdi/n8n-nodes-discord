import { Routes, GuildMember, PermissionResolvable, Interaction, Client } from 'discord.js';
import { REST } from '@discordjs/rest';

const imports = ['clear', 'test', 'logs'];

const awaitingCommands: Promise<{
	params: Object;
	registerCommand: Function;
	executeCommand: Function;
}>[] = [];

imports.forEach((commandName) => {
	const command = import(`./commands/${commandName}`);
	awaitingCommands.push(command);
});

export default async function (token: string, clientId: string, client: Client) {
	const commands = await Promise.all(awaitingCommands).catch((e) => e);

	// commands deployment
	const rest = new REST({ version: '10' }).setToken(token);

	const parsedCommands = commands.map((e: any) => {
		return e.default.registerCommand().toJSON();
	});

	rest
		.put(Routes.applicationCommands(clientId), {
			body: parsedCommands,
		})
		.catch(console.error);

	// commands execution
	client.on('interactionCreate', async (interaction: Interaction) => {
		if (!interaction.isChatInputCommand()) return;
		if (!interaction.guildId) {
			interaction.reply({ content: 'Commands work only inside channels' });
			return;
		}

		const member = interaction.member as GuildMember;
		if (!member.permissions.has('ADMINISTRATOR' as PermissionResolvable)) return;

		const { commandName, options } = interaction;

		const i = imports.indexOf(commandName);
		if (i === -1) return;

		const command = commands[i].default;

		const reply = await command
			.executeCommand(options.get('input')?.value, interaction)
			.catch((e: any) => e);
		const botReply = await interaction.reply({ content: reply, fetchReply: true }).catch((e) => e);

		if (command.params.autoRemove || reply === 'Done!') {
			setTimeout(async () => {
				botReply.delete().catch((e: any) => console.log(e));
			}, 2000);
		}
	});
}
