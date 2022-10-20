const state: {
	ready: boolean;
	login: boolean;
	testMode: boolean;
	clientId: string;
	token: string;
	webhookHost: string;
	triggers: {
		[key: string]: {
			webhookHost?: string;
			webhookId: string;
			channelIds: string[];
			roleIds: string[];
			type: string;
			pattern?: string;
			value?: string;
			caseSensitive?: boolean;
			botMention?: boolean;
			placeholder?: string;
			active: boolean;
		};
	};
	channels: {
		[key: string]: [
			{
				webhookId: string;
				roleIds: string[];
				type: string;
				pattern?: string;
				value?: string;
				caseSensitive?: boolean;
				botMention?: boolean;
				placeholder?: string;
			},
		];
	};
	logs: string[];
	autoLogs: boolean;
	autoLogsChannelId: string;
	placeholderMatching: {
		[key: string]: string;
	};
	executionMatching: {
		[key: string]: any;
	};
	promptData: {
		[key: string]: any;
	};
} = {
	ready: false,
	login: false,
	testMode: false,
	clientId: '',
	token: '',
	webhookHost: process.env?.WEBHOOK_URL?.replace(/\/$/, '') || 'http://localhost:5678',
	triggers: {},
	channels: {},
	logs: [],
	autoLogs: false,
	autoLogsChannelId: '',
	placeholderMatching: {},
	executionMatching: {},
	promptData: {},
};

export default state;
