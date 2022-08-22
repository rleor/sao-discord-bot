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
import {MessageEmbed} from 'discord.js';
import moment from 'moment';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// Parse request body and verifies incoming requests using discord-interactions package
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
  var hasErr = false
  discordRoles.forEach(dr => {
    roles.forEach(async r => {
      if (r.toLowerCase() === dr.name.toLowerCase()) {
        var endpoint = `guilds/${process.env.GUILD_ID}/members/${discordUserId}/roles/${dr.id}`
        // TODO: discord request error handling.
        console.log("grant role: ", endpoint);
        try {
          await DiscordRequest(endpoint, {method: 'put'});
        } catch (e) {
                console.log("assign role error:", e);
                hasErr = true;
        }
      }
    });
  });

  if (hasErr) {
          return res.send(500);
  } else {
          return res.send(200);
  }
});

app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

// Store for in-progress games. In production, you'd want to use a DB

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */

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
        console.log("verify-wallet");
      const userId = req.body.member.user.id;
        //  content: `${process.env.VERIFY_BASE_URL}?user=${userId}`,
      const exampleEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Please read instructions carefully before connecting')
                .setAuthor({ name: 'SAOBot', iconURL: 'https://www.gitbook.com/cdn-cgi/image/width=40,height=40,fit=contain,dpr=2,format=auto/https%3A%2F%2F3280704082-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FJ1lcmSyp0T4hJjEZ5QwT%252Ficon%252FpcUfhMSa30fnERzPTqsG%252Flogo-1.png%3Falt%3Dmedia%26token%3D564319b7-a85e-4ffd-aaab-bbeddc40c335'})
                .setDescription('You should expect to sign the following message when prompted by a non-custodial wallet such as MetaMask:\n'+
                        ' SAO asks you to sign this'+
                        ' message for the purpose of verifying your account\n'+
                        ' ownership. This is READ-ONLY access and will NOT trigger\n'+
                        ' any blockchain transactions or incur any fees.\n'+
                        ' \n'+
                        '   - Community: SAO\n'+
                        '   - User: '+ req.body.member.user.username +'#'+req.body.member.user.discriminator+'\n' +
                        '   - Discord Interaction: ' + process.env.APP_ID + '\n' +
                        '   - Timestamp: '+moment().format())
                .setFooter({text: 'Make sure you sign the EXACT message(some wallets may use \\n for new lines)\nand NEVER share your seed phrase or private key.'});
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Use this custom link to connect\nGuild: ${process.env.GUILD_ID} Members: ${userId}`,
	  flags: InteractionResponseFlags.EPHEMERAL,
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
