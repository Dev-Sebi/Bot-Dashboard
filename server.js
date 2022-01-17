'use strict';
console.clear()

require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT

const pico = require("picocolors")
const fetch = require("node-fetch")
const FormData = require("form-data")
const log = console.log;

app.set("view-engine", "ejs")
app.use(express.static(__dirname + '/public')); //static directory
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// =============== GET =============== //
app.get('/auth/callback/:bot', async (req, res) => {
  const bot = req.params.bot;
  const code = req.query.code;
  let id, secret, token;
  if(bot == process.env.SebisTownhall) { id = process.env.SebisTownhallID; secret = process.env.SebisTownhallSecret, token = process.env.SebisTownhallToken }
  else return res.json({ message: 'Application does not exist' });
  if(!code) return res.json({ message: 'Invalid access token' });
  
  const data = new FormData()
  data.append("client_id", id);
  data.append("client_secret", secret);
  data.append("grant_type", "authorization_code");
  data.append("redirect_uri", process.env.LOCAL_AUTH_REDIRECT);
  data.append("scope", "guilds.join identify"); // split every needed scope with space
  data.append("code", code);
  
  const discord_token = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: data,
  }).then((res) => res.json());
  
  const response = await fetch("https://discord.com/api/users/@me", {
    method: "GET",
    headers: {
      authorization: `${discord_token.token_type} ${discord_token.access_token}`,
    },
  }).then((res) => res.json());
  
  await fetch(`https://discord.com/api/guilds/${process.env.SebisTownhallGuildID}/members/${response.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify({ access_token: discord_token.access_token }),
  });
  
  return res.send("Successfully Logged in! You can close this window now!")
})

app.get('/', async (req, res) => {
  res.render('home.ejs', { 
    loginlink: process.env.LOGIN_WITH_DISCORD_LINK,
    version: process.env.DASHBOARD_VERSION,
    date: new Date().toDateString(),
    threadmanagerinvite: process.env.ThreadManagerInvite,
    midnightinvite: process.env.MidnightInvite,
    tipicoxinvite: process.env.TipicoInvite,
    infinityloungeinvite: process.env.InfinityLoungeInvite,
    invite: process.env.DISCORD_INVITE,
  })
});

app.get('/:bot/terms-of-service', async (req, res) => {
  const bot = req.params.bot
  const link = `${bot}/terms-of-service.ejs`
  if(bot == process.env.ThreadManager) { res.render(link, { bot: "Thread Manager" }) }
  else if(bot == process.env.Midnight) { res.render(link, { bot: "Midnight" }) }
  else if(bot == process.env.TipicoX) { res.render(link, { bot: "TipicoX" }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { bot: "Infinity Lounge" }) }
  else return res.json({ message: 'Application does not exist' });
})

app.get('/:bot/index', async (req, res) => {
  const bot = req.params.bot
  const link = `${bot}/index.ejs`
  if(bot == process.env.ThreadManager) { res.render(link, { bot: "Thread Manager" }) }
  else if(bot == process.env.Midnight) { res.render(link, { bot: "Midnight" }) }
  else if(bot == process.env.TipicoX) { res.render(link, { bot: "TipicoX" }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { bot: "Infinity Lounge" }) }
  else return res.json({ message: 'Application does not exist' });
})

app.get('/:bot/developers', async (req, res) => {
  const bot = req.params.bot
  const link = `${bot}/developers.ejs`
  if(bot == process.env.ThreadManager) { res.render(link, { bot: "Thread Manager", botname: process.env.ThreadManager }) }
  else if(bot == process.env.Midnight) { res.render(link, { bot: "Midnight", botname: process.env.Midnight  }) }
  else if(bot == process.env.TipicoX) { res.render(link, { bot: "TipicoX", botname: process.env.TipicoX  }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { bot: "Infinity Lounge", botname: process.env.InfinityLounge  }) }
  else return res.json({ message: 'Application does not exist' });
})

app.get('/discord', async (req, res) => {
  res.redirect(process.env.DISCORD_INVITE)
})




// =============== POST =============== //
const apiv1 = "/api/v1/"
const developers = require("./developers.json")
app.post(apiv1 + 'developers', async (req, res) => {
  res.json(developers)
})




//If URL not found redirect to index
app.get('/*', (req, res) => {
  res.redirect('/')
})

app.listen(port, () => {
  log(pico.green(`Dashboard listening on Port ${port}`))
})