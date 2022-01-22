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
const devs = require('./developers');
const session = require('express-session')

app.set("view-engine", "ejs")
app.use(express.static(__dirname + '/public')); //static directory
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  expires: 604800000,
}));

// =============== FUNCTIONS =============== //

const forceAuth = (req, res, next) => { // Only connect with login
  if (!req.session.user) return res.redirect('/login')
  else return next();
}

const validateForData = async function(bot)
{
  if(bot == process.env.ThreadManager) { return devs.ThreadManagerData }
  else if(bot == process.env.Midnight) { return devs.MidnightData }
  else if(bot == process.env.TipicoX) { return devs.TipicoXData }
  else if(bot == process.env.InfinityLounge) { return devs.InfinityLoungeData }
  else return false
}

// Cache
const developers = new Set()
// Clear Cache
setInterval(() => {
  developers.clear()
}, 604800000) // 7 days

const getDevelopers = async function(bot)
{
  //if(!developers.size)
  //{
    if(!(await validateForData(bot))) return; // if bot exists
    const arrayOfIds = (await validateForData(bot)).developers
    const link = "https://discord.com/api/v9/users"
    let ids = []
    let profiles = []

    for(const [key, value] of Object.entries(arrayOfIds))
    {
      ids.push(value.id)
    }

    for(const id of ids) {
      const profile = await fetch(`${link}/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bot ${process.env.SebisTownhallToken}`,
        },
      }).then((res) => res.json());
      profiles.push(profile)
      developers.add(profile)
    }
    // []
    return profiles
  //}
  //return developers
}

// =============== GET =============== //

app.get('/login', async (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.redirect(process.env.LOGIN_WITH_DISCORD_LINK)
})

app.get("/logout", (req, res) => {
  req.session.destroy()
  res.redirect("/")
})

app.get('/auth/callback', async (req, res) => {
  if (req.session.user) return res.redirect('/');
  const code = req.query.code;
  if(!code) return res.json({ message: 'Invalid access token' });
  
  const data = new FormData()
  data.append("client_id", process.env.SebisTownhallID);
  data.append("client_secret", process.env.SebisTownhallSecret);
  data.append("grant_type", "authorization_code");
  data.append("redirect_uri", process.env.LOCAL_AUTH_REDIRECT);
  data.append("scope", "guilds.join identify guilds"); // split every needed scope with space
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

  response.tag = `${response.username}#${response.discriminator}`
  response.avatarURL = response.avatar ? `https://cdn.discordapp.com/avatars/${response.id}/${response.avatar}.png` : null
  req.session.user = response
  
  await fetch(`https://discord.com/api/guilds/${process.env.SebisTownhallGuildID}/members/${response.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.SebisTownhallToken}`,
    },
    body: JSON.stringify({ access_token: discord_token.access_token }),
  });
  res.redirect('/')
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
    user: req.session.user
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
  const data = await getDevelopers(bot)
  if(!data) { return res.json({ message: 'Application does not exist' }); }
  if(bot == process.env.ThreadManager) { res.render(link, { devs: data, bot: "Thread Manager", botname: process.env.ThreadManager }) }
  else if(bot == process.env.Midnight) { res.render(link, { devs: data, bot: "Midnight", botname: process.env.Midnight  }) }
  else if(bot == process.env.TipicoX) { res.render(link, { devs: data, bot: "TipicoX", botname: process.env.TipicoX  }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { devs: data, bot: "Infinity Lounge", botname: process.env.InfinityLounge  }) }
  else return res.json({ message: 'Application does not exist' });
})

app.get('/:bot/docs', async (req, res) => {
  const bot = req.params.bot
  const link = `${bot}/docs.ejs`
  if(bot == process.env.ThreadManager) { res.render(link, { bot: "Thread Manager", botname: process.env.ThreadManager }) }
  else if(bot == process.env.Midnight) { res.render(link, { bot: "Midnight", botname: process.env.Midnight  }) }
  else if(bot == process.env.TipicoX) { res.render(link, { bot: "TipicoX", botname: process.env.TipicoX  }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { bot: "Infinity Lounge", botname: process.env.InfinityLounge  }) }
  else return res.json({ message: 'Application does not exist' });
})

app.get('/discord', async (req, res) => {
  res.redirect(process.env.DISCORD_INVITE)
})



//If URL not found redirect to index
app.get('/*', (req, res) => {
  res.redirect('/')
})

app.listen(port, () => {
  log(pico.green(`Dashboard listening on Port ${port}`))
})