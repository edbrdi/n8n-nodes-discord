import { SlashCommandBuilder, SlashCommandBooleanOption } from 'discord.js';
import state from '../state';

const name = 'test';

export default {
	params: {
		autoRemove: true, // remove the reply message
	},

	registerCommand: () => {
		return new SlashCommandBuilder()
			.setName(name)
			.setDescription('Toggle test mode')
			.setDMPermission(false)
			.addBooleanOption((option: SlashCommandBooleanOption) =>
				option
					.setName('input')
					.setDescription('Specify if test mode is enabled or not')
					.setRequired(false),
			);
	},

	executeCommand: async (param: boolean | undefined): Promise<string> => {
		if (param === undefined) state.testMode = !state.testMode;
		else state.testMode = param;
		return 'Test mode: ' + state.testMode;
	},
};
