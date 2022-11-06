import { IExecuteFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { options } from './Discord.node.options';
import bot from './bot';
import {
  connection,
  getChannels as getChannelsHelper,
  getRoles as getRolesHelper,
  ipcRequest,
  ICredentials,
} from './bot/helpers';

// we start the bot if we are in the main process
if (!process.send) bot();

const nodeDescription: INodeTypeDescription = {
  displayName: 'Discord Send',
  name: 'discord',
  group: ['discord'],
  version: 1,
  description: 'Sends messages, embeds and prompts to Discord',
  defaults: {
    name: 'Discord Send',
  },
  icon: 'file:discord.svg',
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'discordApi',
      required: true,
    },
  ],
  properties: options,
};

export interface IDiscordNodeMessageParameters {
  executionId: string;
  triggerPlaceholder: boolean;
  triggerChannel: boolean;
  channelId: string;
  embed: boolean;
  title: string;
  description: string;
  url: string;
  color: string;
  timestamp: string;
  footerText: string;
  footerIconUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
  authorName: string;
  authorIconUrl: string;
  authorUrl: string;
  fields: {
    field?: {
      name: string;
      value: string;
      inline: boolean;
    }[];
  };
  mentionRoles: string[];
  content: string;
  files: {
    file?: {
      url: string;
    }[];
  };
}

export interface IDiscordNodePromptParameters {
  executionId: string;
  triggerPlaceholder: boolean;
  triggerChannel: boolean;
  channelId: string;
  mentionRoles: string[];
  content: string;
  timeout: number;
  placeholder: string;
  apiKey: string;
  baseUrl: string;
  buttons: {
    button?: {
      value: string;
      label: string;
      style: number;
    }[];
  };
  select: {
    select?: {
      value: string;
      label: string;
      description: string;
    }[];
  };
}

export interface IDiscordNodeActionParameters {
  executionId: string;
  triggerPlaceholder: boolean;
  triggerChannel: boolean;
  channelId: string;
  apiKey: string;
  baseUrl: string;
  actionType: string;
  removeMessagesNumber: number;
}

export class Discord implements INodeType {
  description: INodeTypeDescription = nodeDescription;

  methods = {
    loadOptions: {
      async getChannels(): Promise<INodePropertyOptions[]> {
        return await getChannelsHelper(this).catch((e) => e);
      },
      async getRoles(): Promise<INodePropertyOptions[]> {
        return await getRolesHelper(this).catch((e) => e);
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // @ts-ignore
    const executionId = this.getExecutionId();
    const returnData: INodeExecutionData[] = [];

    // connection
    const credentials = (await this.getCredentials('discordApi').catch(
      (e) => e,
    )) as any as ICredentials;
    await connection(credentials).catch((e) => {
      throw new Error(e);
    });

    // execution
    const nodeParameters: any = {};
    Object.keys(this.getNode().parameters).forEach((key) => {
      nodeParameters[key] = this.getNodeParameter(key, 0, '') as any;
    });
    nodeParameters.executionId = executionId;
    nodeParameters.apiKey = credentials.apiKey;
    nodeParameters.baseUrl = credentials.baseUrl;

    if (nodeParameters.channelId || nodeParameters.executionId) {
      // return the interaction result if there is one
      const res = await ipcRequest(
        `send:${
          ['select', 'button'].includes(nodeParameters.type)
            ? 'prompt'
            : nodeParameters.type === 'none'
            ? 'action'
            : nodeParameters.type
        }`,
        nodeParameters,
      ).catch((e) => {
        throw new Error(e);
      });

      returnData.push({
        json: {
          value: res?.value,
          channelId: res?.channelId,
          userId: res?.userId,
          userName: res?.userName,
          userTag: res?.userTag,
          messageId: res?.messageId,
          action: res?.action,
        }, // todo: add triggeringUser if executed following a discord trigger
      });
    }

    if (nodeParameters.placeholder) await new Promise((resolve) => setTimeout(resolve, 1000));

    return this.prepareOutputData(returnData);
  }
}
