import { INodeProperties } from 'n8n-workflow';

export const options: INodeProperties[] = [
  {
    displayName: 'Listen to',
    name: 'channelIds',
    required: false,
    type: 'multiOptions',
    typeOptions: {
      loadOptionsMethod: 'getChannels',
    },
    default: [],
    description: `Let you select the text channels you want to listen to for triggering the workflow. If none selected, all channels will be listen to. Your credentials must be set and the bot running, you also need at least one text channel available. If you do not meet these requirements, make the changes then close and reopen the modal (the channels list is loaded when the modal opens).`,
  },
  {
    displayName: 'From roles',
    name: 'roleIds',
    required: false,
    type: 'multiOptions',
    displayOptions: {
      show: {
        type: [
          'message',
          'command',
          'userLeaves',
          'userPresenceUpdate',
          'userRoleAdded',
          'userRoleRemoved',
          'interaction',
        ],
      },
    },
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
        description: 'When a message is sent in the selected channels.',
      },
      {
        name: 'Command',
        value: 'command',
        description: 'When a command is sent in the selected channels.',
      },
      {
        name: 'Interaction',
        value: 'interaction',
        description: 'When a user interact with a persisted button/select.',
      },
      {
        name: 'User joins',
        value: 'userJoins',
        description: 'When a user joins the server.',
      },
      {
        name: 'User leaves',
        value: 'userLeaves',
        description: 'When a user leaves the server.',
      },
      {
        name: 'User presence update',
        value: 'userPresenceUpdate',
        description: 'When a user presence is updated.',
      },
      {
        name: 'User role added',
        value: 'userRoleAdded',
        description: 'When a user role is added.',
      },
      {
        name: 'User role removed',
        value: 'userRoleRemoved',
        description: 'When a user role is removed.',
      },
    ],
    default: 'message',
    description: `Type of event to listen to. User events must specify a channel to listen to if you want to use a placeholder or the option "send to the trigger channel" in a Discord Send node.`,
  },
  {
    displayName: 'Which roles',
    name: 'roleUpdateIds',
    required: false,
    type: 'multiOptions',
    displayOptions: {
      show: {
        type: ['userRoleAdded', 'userRoleRemoved'],
      },
    },
    typeOptions: {
      loadOptionsMethod: 'getRoles',
    },
    default: [],
    description: `If you don't select any role it will listen to @everyone.`,
  },
  {
    displayName: 'Presence',
    name: 'presence',
    required: false,
    type: 'options',
    displayOptions: {
      show: {
        type: ['userPresenceUpdate'],
      },
    },
    options: [
      {
        name: 'Any change',
        value: 'any',
        description: 'When a user presence is updated.',
      },
      {
        name: 'Online',
        value: 'online',
        description: 'When a user presence is set to online.',
      },
      {
        name: 'Offline',
        value: 'offline',
        description: 'When a user presence is set to offline.',
      },
      {
        name: 'Do not disturb',
        value: 'dnd',
        description: 'When a user presence is set to do not disturb.',
      },
      {
        name: 'Idle',
        value: 'idle',
        description: 'When a user presence is set to idle.',
      },
    ],
    default: 'any',
    description: `Type of presence change to listen to.`,
  },
  {
    displayName: 'Pattern',
    name: 'pattern',
    required: false,
    type: 'options',
    displayOptions: {
      show: {
        type: ['message'],
      },
    },
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
    displayOptions: {
      show: {
        type: ['message'],
      },
    },
    required: true,
    default: '',
    description: 'The value you will test on all messages listened to.',
  },
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    displayOptions: {
      show: {
        type: ['command'],
      },
    },
    required: true,
    default: '',
    description: `The name of the command you want to listen to (use only alphanumeric characters). If the command don't show up in Discord, check if the trigger is active and restart your Discord client.`,
  },
  {
    displayName: 'Description',
    name: 'description',
    type: 'string',
    displayOptions: {
      show: {
        type: ['command'],
      },
    },
    required: true,
    default: '',
    description: `The description of the command you want to listen to.`,
  },
  {
    displayName: 'Input field type',
    name: 'commandFieldType',
    required: true,
    type: 'options',
    displayOptions: {
      show: {
        type: ['command'],
      },
    },
    options: [
      {
        name: 'None',
        value: 'none',
        description: '',
      },
      {
        name: 'Text',
        value: 'text',
        description: '',
      },
      {
        name: 'Number',
        value: 'number',
        description: '',
      },
      {
        name: 'Integer',
        value: 'integer',
        description: '',
      },
      {
        name: 'Boolean',
        value: 'boolean',
        description: '',
      },
    ],
    default: 'none',
    description: `The type of the input field.`,
  },
  {
    displayName: 'Input field description',
    name: 'commandFieldDescription',
    type: 'string',
    displayOptions: {
      show: {
        type: ['command'],
        commandFieldType: ['text', 'number', 'integer', 'boolean'],
      },
    },
    required: true,
    default: '',
    description: `The description of the input field.`,
  },
  {
    displayName: 'Input field required',
    name: 'commandFieldRequired',
    type: 'boolean',
    displayOptions: {
      show: {
        type: ['command'],
        commandFieldType: ['text', 'number', 'integer', 'boolean'],
      },
    },
    required: false,
    default: false,
    description: `If the input field is required or not.`,
  },
  {
    displayName: 'Case Sensitive',
    name: 'caseSensitive',
    type: 'boolean',
    displayOptions: {
      show: {
        type: ['message'],
      },
    },
    required: false,
    default: false,
    description: 'Determine if it will be sensible to the case when matching the value.',
  },
  {
    displayName: 'Bot Mention',
    name: 'botMention',
    type: 'boolean',
    displayOptions: {
      show: {
        type: ['message'],
      },
    },
    required: false,
    default: false,
    description: `If true, a message will also need to mention the bot to trigger the workflow (this does not exclude the other criteria).`,
  },
  {
    displayName: 'Message ID',
    name: 'interactionMessageId',
    type: 'string',
    displayOptions: {
      show: {
        type: ['interaction'],
      },
    },
    required: true,
    default: '',
    description: `The message ID of the button/select to listen to.`,
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
