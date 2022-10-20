import { INodeProperties } from 'n8n-workflow';

export const options: INodeProperties[] = [
	{
		displayName: 'Replace the trigger placeholder',
		name: 'triggerPlaceholder',
		type: 'boolean',
		required: false,
		displayOptions: {
			hide: {
				triggerChannel: [true],
			},
		},
		default: false,
		description: `If active, the message produced by this node will replace the previous placeholder set. It can be a placeholder set by the Discord Trigger node or by another Discord Send node.`,
	},
	{
		displayName: 'Send to the trigger channel',
		name: 'triggerChannel',
		type: 'boolean',
		required: false,
		displayOptions: {
			hide: {
				triggerPlaceholder: [true],
			},
		},
		default: false,
		description: `If active, the message produced will be sent to the same channel were the workflow was triggered (but not replace the placeholder if there is one).`,
	},
	{
		displayName: 'Send to',
		name: 'channelId',
		required: false,
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
		},
		displayOptions: {
			show: {
				triggerPlaceholder: [false],
				triggerChannel: [false],
			},
		},
		default: '',
		description: `Let you specify the text channels where you want to send the message. Your credentials must be set and the bot running, you also need at least one text channel available. If you do not meet these requirements, make the changes then close and reopen the modal (the channels list is loaded when the modal opens).`,
	},
	{
		displayName: 'Type',
		name: 'type',
		required: false,
		type: 'options',
		options: [
			{
				name: 'Message',
				value: 'message',
				description:
					'This is the default type, it allows you to send a message without requiering any form of response.',
			},
			{
				name: 'Button Prompt',
				value: 'button',
				description:
					'It allows you to send an interactive dialog along with buttons users can click on. The workflow execution will wait untill someone answer.',
			},
			{
				name: 'Select Prompt',
				value: 'select',
				description: 'Same as button prompt, but it will display dropdown list instead of buttons.',
			},
		],
		default: 'message',
		description: 'Let you choose the type of interaction you want to send.',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				type: ['message', 'button', 'select'],
			},
		},
		typeOptions: {
			rows: 4,
		},
		default: '',
		description: 'Displayed text message.',
	},
	{
		displayName: 'Embed',
		name: 'embed',
		type: 'boolean',
		displayOptions: {
			show: {
				type: ['message'],
			},
		},
		required: false,
		default: false,
		description:
			'If active it will enable the creation of rich messages. See documentation for more information.',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		default: '', // Initially selected color
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Author name',
		name: 'authorName',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Author icon URL',
		name: 'authorIconUrl',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Author URL',
		name: 'authorUrl',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Thumbnail URL',
		name: 'thumbnailUrl',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		description: '',
		default: {},
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Title',
						name: 'name',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: '',
					},
					{
						displayName: 'Inline',
						name: 'inline',
						type: 'boolean',
						required: false,
						default: false,
						description: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Buttons',
		name: 'buttons',
		placeholder: 'Add Button',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				type: ['button'],
			},
		},
		description: 'Discord allows to add up to 5 buttons.',
		default: {},
		options: [
			{
				name: 'button',
				displayName: 'Button',
				values: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						description: 'Displayed label on the button.',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value returned by the node if clicked.',
						required: true,
					},
					{
						displayName: 'Style',
						name: 'style',
						type: 'options',
						options: [
							{
								name: 'Primary',
								value: 1,
							},
							{
								name: 'Secondary',
								value: 2,
							},
							{
								name: 'Success',
								value: 3,
							},
							{
								name: 'Danger',
								value: 4,
							},
						],
						required: true,
						default: 1,
						description: 'You can choose between 4 different styles.',
					},
				],
			},
		],
	},
	{
		displayName: 'Select',
		name: 'select',
		placeholder: 'Add Option',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				type: ['select'],
			},
		},
		description: '',
		default: {},
		options: [
			{
				name: 'select',
				displayName: 'Select',
				values: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						description: 'Displayed label on the option.',
						required: true,
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Optional displayed description.',
						required: false,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value returned by the node if selected.',
						required: true,
					},
				],
			},
		],
	},
	{
		displayName: 'Footer text',
		name: 'footerText',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Footer icon URL',
		name: 'footerIconUrl',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Displayed date',
		name: 'timestamp',
		type: 'dateTime',
		default: '',
		description: '',
		displayOptions: {
			show: {
				embed: [true],
				type: ['message'],
			},
		},
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				type: ['button', 'select'],
			},
		},
		default: 0,
		description: `Time (seconds) your workflow will wait until it passes to the next node (or stops the execution). The time left will be displayed and updated at the end of the text message. If the timeout is equal 0, it will wait indefinitely.`,
	},
	{
		displayName: 'Restrict to triggering user',
		name: 'restrictToTriggeringUser',
		type: 'boolean',
		displayOptions: {
			show: {
				type: ['button', 'select'],
			},
			hide: {
				restrictToRoles: [true],
			},
		},
		required: false,
		default: false,
		description:
			'Only the user triggering the workflow will be able to interact (others will be ignored).',
	},
	{
		displayName: 'Restrict to mentioned roles',
		name: 'restrictToRoles',
		type: 'boolean',
		displayOptions: {
			show: {
				type: ['button', 'select'],
			},
			hide: {
				restrictToTriggeringUser: [true],
			},
		},
		required: false,
		default: false,
		description:
			'Only the user having one of the mentioned roles will be able to interact (others will be ignored).',
	},
	{
		displayName: 'Files',
		name: 'files',
		placeholder: 'Add File',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				type: ['message'],
			},
		},
		description: 'Allows to attach up to 5 images to the message.',
		default: {},
		options: [
			{
				name: 'file',
				displayName: 'File',
				values: [
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						default: '',
						description: 'URL of the image to attach (png, jpg).',
					},
				],
			},
		],
	},
	{
		displayName: 'Mention roles',
		name: 'mentionRoles',
		required: false,
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getRoles',
		},
		displayOptions: {
			hide: {
				type: ['custom'],
			},
		},
		default: [],
		description: `Let you specify roles you want to mention in the message. Your credentials must be set and the bot running, you also need at least one role (apart from @everyone) available. If you do not meet these requirements, make the changes then close and reopen the modal.`,
	},
	{
		displayName: 'Placeholder',
		name: 'placeholder',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				type: ['button', 'select'],
			},
		},
		default: '',
		description:
			'The placeholder is a message that will appear in the channel where the button or select prompt is displayed. Three animated dots added to the placeholder indicate that the workflow is running. From another Discord Send node, you can set up a response message which will then take the place of this placeholder.',
	},
];
