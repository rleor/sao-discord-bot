import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { VerifyDiscordRequest, DiscordRequest } from './utils.js';
import {
  WALLET_VERIFY_COMMAND,
  HasGuildCommands,
} from './commands.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
const { MessageEmbed } = require('discord.js');

app.all('*',function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

  if (req.method == 'OPTIONS') {
    res.send(200);
  } else {
    next();
  }
});
//app.use(express.json());
// verify api do not verify public key.
app.post("/verify", express.json(), async function(req, res) {
  const { discordUserId, roles } = req.body;

  var r = await DiscordRequest(`guilds/${process.env.GUILD_ID}/roles`, {method: 'get'})
  const discordRoles = await r.json();
  console.log("all discord roles:", discordRoles);
  discordRoles.forEach(dr => {
    roles.forEach(async r => {
      if (r.toLowerCase() === dr.name.toLowerCase()) {
        var endpoint = `guilds/${process.env.GUILD_ID}/members/${discordUserId}/roles/${dr.id}`
        // TODO: discord request error handling.
        console.log("grant role: ", endpoint);
        await DiscordRequest(endpoint, {method: 'put'});
      }
    });
  });

  return res.send(200);
});

app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));


// Store for in-progress games. In production, you'd want to use a DB

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * embed builder
 */
const exampleEmbed = new MessageEmbed()
	.setColor('#0099ff')
	.setTitle('Please read instructions carefully before connecting')
	.setAuthor({ name: 'SAOBot', iconURL: 'https://i.imgur.com/AfFp7pu.png'})
	.setDescription('You should expect to sign the following message when prompted by a non-custodial wallet such as MetaMask:')
	.setDescription('Collab.land (connect.collab.land) asks you to sign this')
	.setDescription('message for the purpose of verifying your account')
	.setDescription('ownership. This is READ-ONLY access and will NOT trigger')
	.setDescription('any blockchain transactions or incur any fees.')
	.setDescription(' ')
	.setDescription(' -Community: Wallet Verity')
	.setDescription(' -User: ')
	.setDescription(' -Discord Interaction:')
	.setDescription(' -Timestamp: ')
	.setField('Make sure you sign the EXACT message(some wallets may use \n for new lines)')
	.setField('and NEVER share your seed phrase or private key.')
	.setTimestamp();

app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;
        console.log("interactions");

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
	

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'verify-wallet') {
      const userId = req.body.member.user.id;
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
	  content: `Use this custom link to connect\nGuild: ${process.env.GUILD_ID} Members: ${userId}`,
          components : [
               {
                   type: 1,
                   components : [
                       {
                           type: 2,
                           label: "Connect Wallet",
                           style: 5,
                           url: `${process.env.VERIFY_BASE_URL}?user=${userId}`,
                       },
                   ],
               },
           ],
	   embeds: [exampleEmbed],
        },
      });
    }
  }

});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);

  // Check if guild commands from commands.json are installed (if not, install them)
  HasGuildCommands(process.env.APP_ID, process.env.GUILD_ID, [
    WALLET_VERIFY_COMMAND,
  ]);
});
