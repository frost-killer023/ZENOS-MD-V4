const fs = require('fs-extra');
const path = require('path');
const { formatUptime, OWNER_NUMBER } = require('../lib/helper');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

function getSettings() {
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
        return { theme: 'galaxy', prefix: '!', botName: 'ZENOS-MD-V1' };
    }
}
function saveSettings(data) {
    fs.writeJsonSync(settingsPath, data, { spaces: 2 });
}

const THEMES = {
    galaxy: {
        name: 'Galaxy ✨',
        emoji: '🌌',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount, ownerNum } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : [])
                .map(c => `│ ${c}`).join('\n');
            return `╭──────────────────────────────╮\n│  ✨🌌  Z E N O S - M D  🌌✨  │\n│       ꧁  V E R S I O N  1  ꧂  │\n╰──────────────────────────────╯\n🌟━━━━━━━━━━━━━━━━━━━━━━━🌟\n│ 🤖 Bot    : ${botName}\n│ 👑 Owner  : +${ownerNum || OWNER_NUMBER}\n│ ⚡ Prefix : ${prefix}\n│ 📡 Status : En ligne ✅\n│ ⏱️ Uptime : ${uptime}\n│ 🧩 Cmds   : ${cmdCount} commandes\n🌟━━━━━━━━━━━━━━━━━━━━━━━🌟\n\n✦ ☄️  C A T É G O R I E S  ☄️ ✦\n\n${catLines}\n\n✨━━━━━━━━━━━━━━━━━━━━━━━✨\n💡 Tape *${prefix}menu [catégorie]*\n   Ex: *${prefix}menu fun* · *${prefix}menu ia*\n_*   BY : ANOS.*_\n✨━━━━━━━━━━━━━━━━━━━━━━━✨\n   🌌 *ZENOS-MD-V1* • 24/7 Online 🚀`;
        }
    },

    neon: {
        name: 'Neon 💜',
        emoji: '💜',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount, ownerNum } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : [])
                .map(c => `┃ ▸ ${c}`).join('\n');
            return `┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  🌌 *${botName}* 🌌\n┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ ⚡ Préfixe : ${prefix}\n┃ 🔮 Mode    : Privé 🔒\n┃ 🧩 Cmds    : ${cmdCount}\n┃ ⏰ Uptime  : ${uptime}\n┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n┃ 🌟 *CATÉGORIES*\n${catLines}\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n💜 *${prefix}menu <cat>* · By ANOS`;
        }
    },

    default: {
        name: 'Default ⚪',
        emoji: '⚪',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : [])
                .map(c => `║ • ${c}`).join('\n');
            return `╔══════════════════════════╗\n║      🤖 ${botName}\n╠══════════════════════════╣\n║ Préfixe : ${prefix}\n║ Mode    : Privé 🔒\n║ Cmds    : ${cmdCount}\n║ Uptime  : ${uptime}\n╠══════════════════════════╣\n║ 📌 CATÉGORIES\n${catLines}\n╚══════════════════════════╝\n*${prefix}menu <cat>*`;
        }
    },

    minimal: {
        name: 'Minimal ⬜',
        emoji: '⬜',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : []).map(c => `  · ${c}`).join('\n');
            return `${botName}\n─────────────────────\nprefix: ${prefix} | mode: privé | cmds: ${cmdCount}\nuptime: ${uptime}\n─────────────────────\ncatégories:\n${catLines}\n─────────────────────\n${prefix}menu <catégorie>`;
        }
    },

    fire: {
        name: 'Fire 🔥',
        emoji: '🔥',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : []).map(c => `🔥 ${c}`).join('\n');
            return `🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n🔥  *${botName}*  🔥\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n🔥 Préfixe : ${prefix}\n🔥 Mode    : Privé 🔒\n🔥 Cmds    : ${cmdCount}\n🔥 Uptime  : ${uptime}\n🔥🔥🔥 CATÉGORIES 🔥🔥🔥\n${catLines}\n🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥\n*${prefix}menu <cat>*`;
        }
    },

    ocean: {
        name: 'Ocean 🌊',
        emoji: '🌊',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : []).map(c => `🐟 ${c}`).join('\n');
            return `🌊〰️〰️〰️〰️〰️〰️〰️🌊\n🐋 *${botName}* 🐋\n🌊〰️〰️〰️〰️〰️〰️〰️🌊\n🐠 Préfixe : ${prefix}\n🐠 Mode    : Privé 🔒\n🐠 Cmds    : ${cmdCount}\n🐠 Uptime  : ${uptime}\n🌊〰️ CATÉGORIES 〰️🌊\n${catLines}\n🌊〰️〰️〰️〰️〰️〰️〰️🌊\n*${prefix}menu <cat>*`;
        }
    },

    matrix: {
        name: 'Matrix 💚',
        emoji: '💚',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            const catLines = (Array.isArray(categories) ? categories : []).map(c => `> [+] ${c}`).join('\n');
            return `> 01001110 01000101 01001111 01001110\n> *${botName}* [SYSTEM_ONLINE]\n> ─────────────────────────\n> PREFIX: ${prefix} | SECURE_MODE: TRUE\n> COMMANDS: ${cmdCount} | UPTIME: ${uptime}\n> ─────────────────────────\n> [MODULES_LOADED]\n${catLines}\n> ─────────────────────────\n> CMD: ${prefix}menu <module>`;
        }
    }
};

const commands = {
    theme: async ({ sock, msg, args, startTime, botName, prefix }) => {
        const settings = getSettings();
        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const list = Object.entries(THEMES).map(([k, v]) => `${v.emoji} *${k}* — ${v.name}`).join('\n');
            return sock.sendMessage(msg.key.remoteJid, {
                text: `🎨 *Thèmes disponibles:*\n\n${list}\n\n• *!theme set <nom>* → Activer\n• *!theme preview <nom>* → Aperçu\n• *!theme reset* → Par défaut (galaxy)\n\n📌 Actuel: *${settings.theme}*`
            });
        }

        if (sub === 'set' && args[1]) {
            const name = args[1].toLowerCase();
            if (!THEMES[name]) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Thème "${name}" introuvable. Tape *!theme* pour voir la liste.` });
            settings.theme = name;
            saveSettings(settings);
            return sock.sendMessage(msg.key.remoteJid, { text: `✅ Thème *${name}* activé !\nTape *!menu* pour voir le résultat.` });
        }

        if (sub === 'reset') {
            settings.theme = 'galaxy';
            saveSettings(settings);
            return sock.sendMessage(msg.key.remoteJid, { text: '✅ Thème remis à *galaxy* (défaut).' });
        }

        if (sub === 'preview' && args[1]) {
            const name = args[1].toLowerCase();
            const theme = THEMES[name];
            if (!theme) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Thème introuvable.' });
            const uptime = formatUptime(Math.floor((Date.now() - (global.startTime || Date.now())) / 1000));
            const exampleCats = ['📌 Général  ·  11 cmds', '🎭 Fun  ·  16 cmds', '🤖 IA  ·  7 cmds'];
            const preview = theme.renderMenu(exampleCats, {
                botName: settings.botName || botName,
                prefix: settings.prefix || prefix,
                uptime,
                cmdCount: '247',
                ownerNum: OWNER_NUMBER
            });
            return sock.sendMessage(msg.key.remoteJid, { text: `🔍 *Aperçu: ${name}*\n\n${preview}` });
        }

        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Usage:\n• *!theme* — liste\n• *!theme set <nom>* — activer\n• *!theme preview <nom>* — aperçu\n• *!theme reset* — galaxy par défaut'
        });
    }
};

module.exports = { commands, aliases: {}, THEMES };
