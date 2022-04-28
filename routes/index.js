const router = require('express').Router();
const pico = require("picocolors")
const fetch = require("node-fetch")
const FormData = require("form-data")
const log = console.log;
const devs = require('../BotData');
const loadSettings = require('../utils/guildSettings.js')
const loadBotGuilds = require('../utils/getBotGuilds.js')
const { thread, mid } = require("../database/connection");

// =============== CACHE =============== //
const developers = new Set()
const stats = new Map()
const guilds = new Map()


// Clear Cache
setInterval(async () => {
  developers.clear()
}, 604800000) // 7 days

setInterval(async () => {
  guilds.clear()
}, 1000 * 60 * 10) // 10 Minuten

setInterval(async () => {
  stats.clear()
  await getStats()
}, 1000 * 60) // 1 Minute

// =============== FUNCTIONS =============== //
const forceAuth = (req, res, next) => { // Only connect with login
  if (!req.session.user) return res.redirect('/login')
  return next();
}

const validateForData = async function(bot)
{
  if(bot == process.env.ThreadManager) { return devs.ThreadManagerData }
  else if(bot == process.env.Midnight) { return devs.MidnightData }
  else if(bot == process.env.TipicoX) { return devs.TipicoXData }
  else if(bot == process.env.InfinityLounge) { return devs.InfinityLoungeData }
  else return false
}
//                      Sebi                  N.T.W                 Itachi                Stern                 Zerul                 MooVoo                Semicolon
const developersArr = ["280094303429197844", "310115562305093632", "718231134336581692", "472020196119281684", "474732997006852097", "278255521629339650", "603609359989342208"]
const getDevelopers = async function(bot)
{
  // Get Data from Discord and add into Set
  if(developers.size !== developersArr.length)
  {
    if(!(await validateForData(bot))) return; // if bot does not exist
    log(pico.yellow("Reloading Discord Dev Data"))
    const arrayOfIds = developersArr
    const link = "https://discord.com/api/v9/users"

    for(const id of arrayOfIds) {
      const profile = await fetch(`${link}/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bot ${process.env.SebisTownhallToken}`,
        },
      }).then((res) => res.json());
      developers.add(profile)
    }
    log(pico.yellow("Discord Dev Data Reload Successful!"))
  }

  // Load Requested Developers
  const needed = (await validateForData(bot)).developers
  let all = [...developers]
  let devsForBot = []

  needed.forEach(item =>  {
    devsForBot.push((Object.entries(all).find(([key, value]) => value.id === item.id))[1])
  })

  return devsForBot
}

const getStats = async function(){
  if(stats.length !== 4)
  {
    stats.clear()
      const Midnight = await fetch("http://localhost:1025/stats", {
      method: "GET",
    }).then((res) => res.json()).catch((err) => function(){return});
    stats.set("Midnight", Midnight)

    const InfinityLounge = await fetch("http://localhost:1026/stats", {
      method: "GET",
    }).then((res) => res.json()).catch((err) => function(){return});
    stats.set("InfinityLounge", InfinityLounge)

    const TipicoX = await fetch("http://localhost:1027/stats", {
      method: "GET",
    }).then((res) => res.json()).catch((err) => function(){return});
    stats.set("TipicoX", TipicoX)

    const ThreadManager = await fetch("http://localhost:1028/stats", {
      method: "GET",
    }).then((res) => res.json()).catch((err) => function(){return});
    stats.set("ThreadManager", ThreadManager)
  }
  return stats;
}
getStats() // Fill Stats for start

// =============== GET =============== //

router.get('/login', async (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.redirect(process.env.LOGIN_WITH_DISCORD_LINK)
})

router.get("/logout", (req, res) => {
  req.session.destroy()
  res.redirect("/")
})

router.get('/auth/callback/guild', async (req, res) => {
  const redirectTo = decodeURIComponent(req.cookies.url) || '/';
  res.redirect(redirectTo)
})

router.get('/auth/callback', async (req, res) => {
  if (req.session.user) return res.redirect('/');
  const redirectTo = decodeURIComponent(req.cookies.url) || '/';
  const code = req.query.code;
  if(!code) return res.json({ message: 'Invalid access token' });
  
  const data = new FormData()
  data.append("client_id", process.env.SebisTownhallID);
  data.append("client_secret", process.env.SebisTownhallSecret);
  data.append("grant_type", "authorization_code");
  data.append("redirect_uri", process.env.LOCAL_AUTH_REDIRECT); // Prod Recirect
  //data.append("redirect_uri", process.env.AUTH_REDIRECT); // Local Redirect
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
  response.access_token = discord_token.access_token
  req.session.user = response // set user
  
  await fetch(`https://discord.com/api/guilds/${process.env.SebisTownhallGuildID}/members/${response.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${process.env.SebisTownhallToken}`,
    },
    body: JSON.stringify({ access_token: discord_token.access_token }),
  });
  res.redirect(redirectTo)
})

router.get("/:bot/settings/:id", forceAuth, async (req, res) => {
  res.cookie('url', req.url)
  const bot = req.params.bot
  let botname = "";
  if(bot === process.env.ThreadManager) { botname = "Thread Manager" }
  else if(bot === process.env.Midnight) { botname = "Midnight" }
  else return res.redirect("/")
  if(botname == "") return res.redirect("/")

  const serverid = req.params.id;
  const user = req.session.user;
  const serverdata = await loadSettings.getGuildSettings(serverid, bot)
  const botGuilds = await loadBotGuilds.getBotGuilds(bot); // All ID's of Servers the bot is in

  if (!(await guilds.get(`${user.id}-${bot}-guilds`))) {
    let guildArray = [];
    const guildsFetch = await fetch("https://discord.com/api/v9/users/@me/guilds", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }).then((res) => res.json());

    for (const guild of guildsFetch) {
      if (parseInt(guild.permissions) & 32) {
        guild.bot = botGuilds;
        guildArray.push(guild);
      }
    }
    guilds.set(`${user.id}-${bot}-guilds`, JSON.stringify(guildArray));
  }

  const guildData = JSON.parse((guilds.get(`${user.id}-${bot}-guilds`))).filter(guild => guild.id === serverid)

  if(bot == process.env.Midnight)
  {
    const links_detected = 0
    const links_deleted = 0
    const links_scanned = 0
    const user_punished  = 0
    const users_prevented_from_joining = 0
    mid.query(
      {
        sql: `SELECT * FROM ${process.env.DB_DATABASENAME} WHERE id=?`,
        timeout: 10000, // 10s
        values: [serverid],
      },
      async function (err, result, fields) {
          if (err) throw err;
          res.render(`${bot}/settings_guild.ejs`, {
            links_detected: parseInt(result[0].links_detected),
            links_deleted: parseInt(result[0].links_deleted),
            links_scanned: parseInt(result[0].links_scanned),
            users_punished : parseInt(result[0].users_punished),
            users_prevented_from_joining: parseInt(result[0].users_prevented_from_joining),
            botname,
            bot,
            version: process.env.DASHBOARD_VERSION,
            date: new Date().toDateString(),
            invite: process.env.DISCORD_INVITE,
            user: req.session.user,
            guild: guildData[0],
            serverid,
          })
      })
  }
  else
  {
    res.send("Nope!")
    /*
    res.render(`${bot}/settings_guild.ejs`, {
      botname,
      bot,
      version: process.env.DASHBOARD_VERSION,
      date: new Date().toDateString(),
      invite: process.env.DISCORD_INVITE,
      user: req.session.user,
      guild: guildData[0],
      serverid,
    })*/
  }
});

router.get("/:bot/settings/", forceAuth, async (req, res) => {
  res.cookie('url', req.url)
  const bot = req.params.bot
  let botname = "";
  if(bot === process.env.ThreadManager) { botname = "Thread Manager" }
  else if(bot === process.env.Midnight) { botname = "Midnight" }
  else return res.redirect("/")
  if(botname == "") return res.redirect("/")

  const user = req.session.user;
  const botGuilds = await loadBotGuilds.getBotGuilds(bot); // All ID's of Servers the bot is in

  if (!(await guilds.get(`${user.id}-${bot}-guilds`))) {
    //https://discord.com/api/v9/users/@me/guilds
    let guildArray = [];
    const guildsFetch = await fetch("https://discord.com/api/v9/users/@me/guilds", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.access_token}`,
      },
    }).then((res) => res.json());

    for (const guild of guildsFetch) {
      if (parseInt(guild.permissions) & 32) {
        guild.bot = botGuilds;
        guildArray.push(guild);
      }
    }
    guilds.set(`${user.id}-${bot}-guilds`, JSON.stringify(guildArray));
  }

  res.render(`${bot}/settings.ejs`, {
    botname: botname,
    bot,
    version: process.env.DASHBOARD_VERSION,
    date: new Date().toDateString(),
    threadmanagerinvite: process.env.ThreadManagerInvite,
    midnightinvite: process.env.MidnightInvite,
    invite: process.env.DISCORD_INVITE,
    user,
    guilds: await guilds.get(`${user.id}-${bot}-guilds`),
  })
});

router.get('/', async (req, res) => {
  res.cookie('url', req.url)
  res.render('home.ejs', { 
    loginlink: process.env.LOGIN_WITH_DISCORD_LINK,
    version: process.env.DASHBOARD_VERSION,
    date: new Date().toDateString(),
    threadmanagerinvite: process.env.ThreadManagerInvite,
    midnightinvite: process.env.MidnightInvite,
    tipicoxinvite: process.env.TipicoInvite,
    infinityloungeinvite: process.env.InfinityLoungeInvite,
    invite: process.env.DISCORD_INVITE,
    user: req.session.user,
    botstats: await getStats()
  })
});

router.get('/:bot/docs', async (req, res) => {
  res.cookie('url', req.url)
  const bot = req.params.bot
  const link = `${bot}/docs.ejs`
  if(bot == process.env.ThreadManager) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "Thread Manager", botname: process.env.ThreadManager }) }
  else if(bot == process.env.Midnight) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "Midnight", botname: process.env.Midnight  }) }
  else if(bot == process.env.TipicoX) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "TipicoX", botname: process.env.TipicoX  }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "Infinity Lounge", botname: process.env.InfinityLounge  }) }
  else return res.json({ message: 'Application does not exist' });
})

router.get('/:bot/developers', async (req, res) => {
  res.cookie('url', req.url)
  const bot = req.params.bot
  const link = `${bot}/developers.ejs`
  const data = await getDevelopers(bot)
  if(!data) { return res.json({ message: 'Application does not exist' }); }
  if(bot == process.env.ThreadManager) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, devs: data, bot: "Thread Manager", botname: process.env.ThreadManager }) }
  else if(bot == process.env.Midnight) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, devs: data, bot: "Midnight", botname: process.env.Midnight  }) }
  else if(bot == process.env.TipicoX) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, devs: data, bot: "TipicoX", botname: process.env.TipicoX  }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, devs: data, bot: "Infinity Lounge", botname: process.env.InfinityLounge  }) }
  else return res.json({ message: 'Application does not exist' });
})

router.get('/:bot/terms-of-service', async (req, res) => {
  res.cookie('url', req.url)
  const bot = req.params.bot
  const link = `${bot}/terms-of-service.ejs`
  if(bot == process.env.ThreadManager) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "Thread Manager" }) }
  else if(bot == process.env.Midnight) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "Midnight" }) }
  else if(bot == process.env.TipicoX) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "TipicoX" }) }
  else if(bot == process.env.InfinityLounge) { res.render(link, { invite: process.env.DISCORD_INVITE, version: process.env.DASHBOARD_VERSION, user: req.session.user, bot: "Infinity Lounge" }) }
  else return res.json({ message: 'Application does not exist' });
})

router.get('/discord', async (req, res) => {
  res.redirect(process.env.DISCORD_INVITE)
})

//If URL not found redirect to index
router.get('/*', (req, res) => {
  res.redirect('/')
})

module.exports = router;