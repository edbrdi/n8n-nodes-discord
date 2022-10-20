import { INodeProperties } from 'n8n-workflow';

export const options: INodeProperties[] = [
	{
		displayName: 'Listen to',
		name: 'channelIds',
		required: true,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		default: [],
		description: `Let you select the text channels you want to listen to for triggering the workflow. Your credentials must be set and the bot running, you also need at least one text channel available. If you do not meet these requirements, make the changes then close and reopen the modal (the channels list is loaded when the modal opens).`,
	},
	{
		displayName: 'From roles',
		name: 'roleIds',
		required: false,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getRoles',
		},
		default: [],
		description: `The same logic apply here for roles, except it is optional. If you don't select any role it will listen to @everyone.`,
	},
	{
		displayName: 'Trigger type',
		name: 'type',
		required: false,
		type: 'options',
		options: [
			{
				name: 'Message',
				value: 'message',
				description: '',
			},
		],
		default: 'message',
		description: `At the moment it's only triggered by messages but other types will be managed in the future.`,
	},
	{
		displayName: 'Pattern',
		name: 'pattern',
		required: false,
		type: 'options',
		options: [
			{
				name: 'Equals',
				value: 'equal',
				description: 'Match the exact same value.',
			},
			{
				name: 'Starts with',
				value: 'start',
				description: 'Match the message beginning with the specified value.',
			},
			{
				name: 'Contains',
				value: 'contain',
				description: 'Match the value in any position in the message.',
			},
			{
				name: 'Ends with',
				value: 'end',
				description: 'Match the message ending with the specified value.',
			},
			{
				name: 'Regex',
				value: 'regex',
				description: 'Match the custom ECMAScript regex provided.',
			},
		],
		default: 'start',
		description: `Select how the value below will be recognized. ⚠ Keep in mind that the value will be tested with all mentions removed and a trim applied (whitespaces removed at the beginning and at the end). For example "@bot hello" will be tested on "hello"`,
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		description: 'The value you will test on all messages listened to.',
	},
	{
		displayName: 'Case Sensitive',
		name: 'caseSensitive',
		type: 'boolean',
		required: false,
		default: false,
		description: 'Determine if it will be sensible to the case when matching the value.',
	},
	{
		displayName: 'Bot Mention',
		name: 'botMention',
		type: 'boolean',
		required: false,
		default: false,
		description: `If true, a message will also need to mention the bot to trigger the workflow (this does not exclude the other criteria).`,
	},
	{
		displayName: 'Placeholder',
		name: 'placeholder',
		type: 'string',
		required: false,
		default: '',
		description: `The placeholder is a message that will appear in the channel that triggers the workflow. Three animated dots added to the placeholder indicate that the workflow is running. From a Discord Send node, you can set up a response message which will then take the place of this placeholder.`,
	},
];
