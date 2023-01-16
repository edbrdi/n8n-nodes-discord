import { Client, GatewayIntentBits } from 'discord.js';
import ipc from 'node-ipc';
import { addLog } from './helpers';
import credentialsIpc from './ipcEvents/credentials.ipc';
import triggerIpc from './ipcEvents/trigger.ipc';
import listChannelsIpc from './ipcEvents/listChannels.ipc';
import listRolesIpc from './ipcEvents/listRoles.ipc';
import sendPromptIpc from './ipcEvents/sendPrompt.ipc';
import sendMessageIpc from './ipcEvents/sendMessage.ipc';
import sendActionIpc from './ipcEvents/sendAction.ipc';
import botStatusIpc from './ipcEvents/botStatus.ipc';
import executionIpc from './ipcEvents/execution.ipc';
import presenceUpdateEvent from './discordClientEvents/presenceUpdate.event';
import guildMemberUpdateEvent from './discordClientEvents/guildMemberUpdate.event';
import guildMemberAddEvent from './discordClientEvents/guildMemberAdd.event';
import guildMemberRemoveEvent from './discordClientEvents/guildMemberRemove.event';
import messageCreateEvent from './discordClientEvents/messageCreate.event';
import interactionCreateEventUI from './discordClientEvents/interactionCreateUI.event';

export default function () {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
    ],
    allowedMentions: {
      parse: ['roles', 'users', 'everyone'],
    },
  });

  client.on('ready', () => {
    addLog(`Logged in as ${client.user?.tag}`, client);
  });

  // listen to users changing their status events
  presenceUpdateEvent(client);

  // listen to users updates (roles)
  guildMemberUpdateEvent(client);

  // user joined a server
  guildMemberAddEvent(client);

  // user leaving a server
  guildMemberRemoveEvent(client);

  // the bot listen to all messages and check if it matches a referenced trigger
  messageCreateEvent(client);

  // the bot listen to all interactions (button/select) and check if it matches a waiting prompt
  interactionCreateEventUI(client);

  ipc.config.id = 'bot';
  ipc.config.retry = 1500;

  // nodes are executed in a child process, the Discord bot is executed in the main process
  // so it's not stopped when a node execution end
  // we use ipc to communicate between the node execution process and the bot
  // ipc is serving in the main process & childs connect to it using the ipc client
  ipc.serve(function () {
    addLog(`ipc bot server started`, client);
    credentialsIpc(ipc, client);

    // when a trigger is activated or updated, we get the trigger data et parse it
    // so when a message is received we can check if it matches a trigger
    triggerIpc(ipc, client);

    // used to handle channels selection in the n8n UI
    listChannelsIpc(ipc, client);

    // used to handle roles selection in the n8n UI
    listRolesIpc(ipc, client);

    // used send button prompt or select prompt in a channel
    sendPromptIpc(ipc, client);

    // used to send message to a channel
    sendMessageIpc(ipc, client);

    // used to perform an action in a channel
    sendActionIpc(ipc, client);

    // used to change the bot status
    botStatusIpc(ipc, client);

    // used to initiate node execution (message, prompt)
    executionIpc(ipc, client);
  });

  ipc.server.start();
}
