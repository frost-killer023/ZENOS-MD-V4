const { formatUptime, randomItem, randomInt, OWNER_NUMBER } = require('../lib/helper');
const { getAllCommands } = require('../lib/commandHandler');
const fs   = require('fs-extra');
const path = require('path');
const axios = require('axios');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
const CATBOX_CACHE = path.join(__dirname, '..', 'data', 'catbox_cache.json');

function getSettings() {
    try { return fs.readJsonSync(settingsPath); }
    catch { const d = { theme:'galaxy', prefix:'!', botName:'ZENOS-MD-V1', language:'fr' }; fs.writeJsonSync(settingsPath, d, {spaces:2}); return d; }
}

// ─── IMAGE TANJIRO via catbox.moe ─────────────────────────────────────────────
// Sources Tanjiro Kamado (Demon Slayer) — plusieurs fallbacks
const TANJIRO_SOURCES = [
    'https://static.wikia.nocookie.net/kimetsu-no-yaiba/images/2/24/Tanjiro_Kamado_Anime.png',
    'https://i.pinimg.com/originals/6b/d7/2b/6bd72b7d67ce17ff9df4b2c57b1e3e29.jpg',
    'https://i.imgur.com/C5ZrFUm.jpg'
];

let cachedMenuImage = null;

async function getMenuImage() {
    if (cachedMenuImage) return cachedMenuImage;

    // Vérifier le cache local (catbox URL sauvegardée)
    try {
        const cache = fs.readJsonSync(CATBOX_CACHE);
        if (cache.tanjiroUrl) {
            cachedMenuImage = cache.tanjiroUrl;
            return cachedMenuImage;
        }
    } catch {}

    // Essayer d'uploader sur catbox.moe
    for (const src of TANJIRO_SOURCES) {
        try {
            const resp = await axios.post(
                'https://catbox.moe/user/api.php',
                `reqtype=urlupload&url=${encodeURIComponent(src)}`,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
            );
            const url = (resp.data || '').trim();
            if (url.startsWith('https://files.catbox.moe/')) {
                cachedMenuImage = url;
                try { fs.writeJsonSync(CATBOX_CACHE, { tanjiroUrl: url, uploadedAt: new Date().toISOString() }, { spaces: 2 }); } catch {}
                console.log('✅ Image Tanjiro uploadée sur catbox:', url);
                return url;
            }
        } catch {}
    }

    // Fallback: source directe
    for (const src of TANJIRO_SOURCES) {
        try {
            const test = await axios.head(src, { timeout: 5000 });
            if (test.status === 200) {
                cachedMenuImage = src;
                return src;
            }
        } catch {}
    }
    return null;
}

// Lancer le chargement de l'image en arrière-plan au démarrage
setTimeout(() => getMenuImage().catch(() => {}), 5000);

// ─── CATEGORIES du menu ───────────────────────────────────────────────────────
const CATEGORY_MAP = {
    general:       { emoji: '📌', name: 'Général',         cmds: ['menu','ping','info','uptime','botname','owner','hello','date','about','aide','allmenu','choose','coinflip','roll','timer','repeat'] },
    fun:           { emoji: '🎭', name: 'Fun & Créatif',   cmds: ['joke','fact','quote','8ball','flip','dice','fortune','horoscope','aesthetic','clap','vaporwave','zalgo','truth','dare','wyr','nhie','compliment','love_meter','spirit_animal','superpower'] },
    jeux:          { emoji: '🎮', name: 'Jeux',            cmds: ['pendu','trivia','math','pfc','chiffre','vof','devinette','compat','sort','jeux'] },
    media:         { emoji: '📸', name: 'Médias',          cmds: ['sticker','toimg','ytmp3','ytmp4','tiktok','instagram'] },
    utils:         { emoji: '🛠️', name: 'Utilitaires',     cmds: ['calc','password','bmi','age','percentage','palindrome','count','upper','lower','encode64','decode64','hex','binary','morse','unmorse','uuid','reverse','wordcount'] },
    info:          { emoji: 'ℹ️', name: 'Informations',    cmds: ['wiki','crypto','country','anime','lyrics','define','news'] },
    ia:            { emoji: '🤖', name: 'Intelligence IA', cmds: ['gpt','gemini','blackbox','llama','imagine','chat'] },
    groupe:        { emoji: '👥', name: 'Groupe',          cmds: ['add','kick','promote','demote','link','ginfo','gmembers','tagall','tagadmin','mute','unmute','gname','gdesc','warn','warns','clearwarn','antilink','welcome'] },
    admin:         { emoji: '👑', name: 'Administration',  cmds: ['restart','session','status','eval','shell','broadcast','logs','block','unblock','sysinfo'] },
    image_edits:   { emoji: '🖼️', name: 'Édition Image',  cmds: ['wasted','wanted','trigger','rip','sepia','greyscale','blur','pixelate','beautiful','jail','facepalm','trash','rainbow','darkness','invert1'] },
    conversion:    { emoji: '🔄', name: 'Conversion',      cmds: ['convert','tempconv','lengthconv','weightconv'] },
    fx_audio:      { emoji: '🎵', name: 'FX Audio',        cmds: ['bass','nightcore','slowdown','reverse_audio','echo','robot','pitch'] },
    economie:      { emoji: '💰', name: 'Économie',        cmds: ['daily','balance','bet','slots','blackjack','transfer','richlist','bonus'] },
    logo:          { emoji: '🎨', name: 'Logos & Effets',  cmds: ['glitch','neon_text','fire_text','matrix_text','retro_text'] },
    confidentialite:{ emoji: '🔒', name: 'Confidentialité',cmds: ['disappear','viewonce','phantom','ghost'] },
    outils:        { emoji: '⚙️', name: 'Outils Bot',      cmds: ['stats','theme','setprefix','setname','language'] }
};

// ─── RENDU DU MENU (envoi en 2 messages: image + texte séparé) ───────────────
// IMPORTANT: WhatsApp tronque les captions d'image à ~1024 chars.
// Solution: envoyer l'image SANS caption, puis le texte séparé.
function buildMenuText(botInfo) {
    const { botName, prefix, uptime, cmdCount, ownerNum } = botInfo;
    const catLines = Object.entries(CATEGORY_MAP)
        .map(([, cat]) => `│ ${cat.emoji} *${cat.name}*  ·  ${cat.cmds.length} cmds`)
        .join('\n');

    return `╭──────────────────────────────╮
│  ✨🌌  Z E N O S - M D  🌌✨  │
│       ꧁  V E R S I O N  1  ꧂  │
╰──────────────────────────────╯
🌟━━━━━━━━━━━━━━━━━━━━━━━🌟
│ 🤖 Bot    : ${botName}
│ 👑 Owner  : +${ownerNum}
│ ⚡ Prefix : ${prefix}
│ 📡 Status : En ligne ✅
│ ⏱️ Uptime : ${uptime}
│ 🧩 Cmds   : ${cmdCount}+ commandes
🌟━━━━━━━━━━━━━━━━━━━━━━━🌟

✦ 🌸  C A T É G O R I E S  🌸 ✦

${catLines}

✨━━━━━━━━━━━━━━━━━━━━━━━✨
💡 Tape *${prefix}menu <catégorie>*
   Ex: *${prefix}menu fun* · *${prefix}menu jeux*
_*   BY : ANOS • ZENOS-MD-V1*_
✨━━━━━━━━━━━━━━━━━━━━━━━✨`;
}

const commands = {
    // ─── MENU PRINCIPAL ───────────────────────────────────────────────────────
    menu: async ({ sock, msg, args, startTime, botName, prefix }) => {
        const settings = getSettings();
        const jid      = msg.key.remoteJid;
        const uptime   = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        const allCmds  = getAllCommands ? getAllCommands() : null;
        const cmdCount = allCmds ? allCmds.size : Object.values(CATEGORY_MAP).reduce((s, c) => s + c.cmds.length, 0);

        // Sous-catégorie : !menu fun, !menu ia, etc.
        if (args[0]) {
            const cat = args[0].toLowerCase();
            const found = CATEGORY_MAP[cat];
            if (!found) {
                const validCats = Object.keys(CATEGORY_MAP).join(', ');
                return sock.sendMessage(jid, {
                    text: `❌ *Catégorie "${args[0]}" introuvable*\n\n📋 *Catégories disponibles:*\n${validCats}\n\n💡 Ex: *${prefix}menu fun*`
                });
            }
            const cmdList = found.cmds.map(c => `  • *${prefix}${c}*`).join('\n');
            return sock.sendMessage(jid, {
                text: `${found.emoji} *${found.name}* — ${found.cmds.length} commandes\n${'━'.repeat(30)}\n\n${cmdList}\n\n${'━'.repeat(30)}\n💡 *${prefix}menu* → Menu principal`
            });
        }

        // Menu principal : IMAGE d'abord (sans caption) puis TEXTE séparé
        // Évite la troncature des captions WhatsApp
        const botInfo = {
            botName:  settings.botName  || botName,
            prefix:   settings.prefix   || prefix,
            uptime, cmdCount,
            ownerNum: OWNER_NUMBER
        };

        const menuText = buildMenuText(botInfo);

        try {
            const imageUrl = await getMenuImage();
            if (imageUrl) {
                // Envoyer l'image Tanjiro SANS caption (caption = titre court uniquement)
                await sock.sendMessage(jid, {
                    image:   { url: imageUrl },
                    caption: `🌌 *${botInfo.botName}* • Mode Privé 🔒`
                });
            }
        } catch {}

        // Envoyer le menu complet en texte séparé (jamais tronqué)
        await sock.sendMessage(jid, { text: menuText });
    },

    // ─── PING ─────────────────────────────────────────────────────────────────
    ping: async ({ sock, msg }) => {
        const t = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: `🏓 *Pong!* \`${Date.now() - t}ms\`` });
    },

    // ─── INFO ─────────────────────────────────────────────────────────────────
    info: async ({ sock, msg, startTime, botName, prefix }) => {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(msg.key.remoteJid, {
            text: `╔══════════════════════════╗\n║    ℹ️  INFOS ZENOS-MD    ║\n╠══════════════════════════╣\n║ 🤖 Nom     : ${botName}\n║ 📌 Préfixe : ${prefix}\n║ ⏰ Uptime  : ${uptime}\n║ 🔒 Mode    : Privé\n║ 💻 Runtime : Node.js\n║ 📦 Lib     : Baileys\n║ 🌐 Version : 1.0.0\n╚══════════════════════════╝`
        });
    },

    // ─── UPTIME ───────────────────────────────────────────────────────────────
    uptime: async ({ sock, msg, startTime }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `⏰ *Uptime:* ${formatUptime(Math.floor((Date.now() - startTime) / 1000))}`
        });
    },

    botname: async ({ sock, msg, botName }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `🤖 *Nom du bot:* ${botName}` });
    },

    owner: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `👑 *Propriétaire:* +${OWNER_NUMBER}` });
    },

    hello: async ({ sock, msg }) => {
        const g = ['Bonjour! 👋','Salut! 😊','Hello! 🌟','Yo! 🤙 ZENOS actif!','Coucou! 🫡','Présent chef! ⚡'];
        await sock.sendMessage(msg.key.remoteJid, { text: randomItem(g) });
    },

    date: async ({ sock, msg }) => {
        const now = new Date();
        const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'Africa/Abidjan' };
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📅 *Date et heure*\n\n📆 ${now.toLocaleDateString('fr-FR', opts)}\n⏰ ${now.toLocaleTimeString('fr-FR', {timeZone:'Africa/Abidjan'})}\n🌍 UTC+0`
        });
    },

    about: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `╔══════════════════════════╗\n║    🤖 ZENOS-MD-V1        ║\n╠══════════════════════════╣\n║ Bot WhatsApp multiservices\n║ privé • codé en Node.js  \n║ avec la lib Baileys      \n║                          \n║ ✨ 280+ commandes        \n║ 🎮 17 catégories         \n║ 💓 Keep-alive 24h/24     \n║ 💾 Session persistante   \n║ 🌌 Thème galaxy (défaut) \n║                          \n║   _By : ANOS ★ VOLDIGO_  \n╚══════════════════════════╝`
        });
    },

    aide: async ({ sock, msg, args, prefix }) => {
        const cat = args[0]?.toLowerCase();
        if (cat && CATEGORY_MAP[cat]) {
            const found = CATEGORY_MAP[cat];
            const cmdList = found.cmds.map(c => `• *${prefix}${c}*`).join('\n');
            return sock.sendMessage(msg.key.remoteJid, { text: `${found.emoji} *${found.name}*\n\n${cmdList}` });
        }
        const list = Object.entries(CATEGORY_MAP).map(([k, v]) => `${v.emoji} *${k}* — ${v.name}`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, { text: `📚 *Catégories:*\n\n${list}\n\n💡 *${prefix}aide <cat>* pour voir les commandes` });
    },

    allmenu: async ({ sock, msg, prefix }) => {
        const sections = Object.entries(CATEGORY_MAP).map(([, cat]) => {
            const cmds = cat.cmds.map(c => `${prefix}${c}`).join('  ');
            return `${cat.emoji} *${cat.name}*\n${cmds}`;
        }).join('\n\n');
        await sock.sendMessage(msg.key.remoteJid, { text: `📋 *TOUTES LES COMMANDES*\n${'━'.repeat(30)}\n\n${sections}` });
    },

    // ─── CHOOSE (choisir parmi des options) ───────────────────────────────────
    choose: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !choose option1|option2|option3\nEx: !choose Pizza|Burger|Sushi' });
        const opts = body.split('|').map(s => s.trim()).filter(Boolean);
        if (opts.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Donne au moins 2 options séparées par |' });
        const chosen = randomItem(opts);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎲 *CHOIX ALÉATOIRE*\n\nOptions: ${opts.join(' · ')}\n\n🏆 Le choix est: *${chosen}*`
        });
    },

    // ─── COINFLIP ─────────────────────────────────────────────────────────────
    coinflip: async ({ sock, msg }) => {
        const result = Math.random() < 0.5 ? '🟡 *PILE*' : '🔵 *FACE*';
        await sock.sendMessage(msg.key.remoteJid, { text: `🪙 *PILE OU FACE*\n\nRésultat: ${result}` });
    },

    // ─── ROLL (lancer de dés) ─────────────────────────────────────────────────
    roll: async ({ sock, msg, args }) => {
        const input = args[0] || '1d6';
        const match = input.match(/^(\d+)d(\d+)$/i);
        if (!match) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !roll 2d6 (nombre de dés × faces)\nEx: !roll 1d20 · !roll 3d6' });
        const [, diceCount, faces] = match.map(Number);
        if (diceCount > 20 || faces > 1000) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Max: 20 dés × 1000 faces' });
        const rolls = Array.from({ length: diceCount }, () => randomInt(1, faces));
        const total = rolls.reduce((a, b) => a + b, 0);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎲 *${diceCount}d${faces}*\n\nRésultats: ${rolls.join(', ')}\n🏆 Total: *${total}*`
        });
    },

    // ─── TIMER ────────────────────────────────────────────────────────────────
    timer: async ({ sock, msg, args }) => {
        const secs = parseInt(args[0]);
        if (!secs || secs < 1 || secs > 300) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !timer <secondes> (1–300)\nEx: !timer 30' });
        await sock.sendMessage(msg.key.remoteJid, { text: `⏱️ Minuterie de *${secs}s* lancée! Je te préviendrai.` });
        setTimeout(async () => {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `⏰ *DING DING!* Ta minuterie de *${secs}s* est terminée! 🔔`
                });
            } catch {}
        }, secs * 1000);
    },

    // ─── REPEAT ───────────────────────────────────────────────────────────────
    repeat: async ({ sock, msg, args, body }) => {
        const n = parseInt(args[0]);
        const text = body.replace(/^\d+\s*/, '').trim();
        if (!n || n < 1 || n > 10 || !text) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !repeat <n> <message> (n max: 10)\nEx: !repeat 3 Hello!' });
        const repeated = Array.from({ length: n }, (_, i) => `${i + 1}. ${text}`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, { text: repeated });
    }
};

const aliases = {
    'start':  'menu',
    'help':   'aide',
    'hi':     'hello',
    'upt':    'uptime',
    'cmds':   'allmenu',
    'flip':   'coinflip',
    'dé':     'roll',
    'choisir': 'choose'
};

module.exports = { commands, aliases, CATEGORY_MAP };
