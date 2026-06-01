const { formatUptime, OWNER_NUMBER } = require('../lib/helper');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

function getSettings() {
    try { return fs.readJsonSync(settingsPath); } catch { return { theme: 'default', prefix: '!', botName: 'ZENOS-MD-V1' }; }
}

const { THEMES, allCategories } = require('./theme');

const commands = {
    test: async ({ sock, msg }) => {
        const start = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Test de connectivité...' });
        const ping = Date.now() - start;
        const mem = process.memoryUsage();
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ *Test de connectivité:*\n\n🏓 Ping: ${ping}ms\n💾 RAM: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n🖥️ Platform: ${process.platform}\n📦 Node: ${process.version}\n✅ Statut: *EN LIGNE*`
        });
    },

    system_status: async ({ sock, msg }) => {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💻 *Statut Système*\n\n🖥️ OS: ${process.platform}\n📦 Node.js: ${process.version}\n⏰ Uptime: ${h}h ${m}m ${s}s\n💾 Heap utilisé: ${Math.round(mem.heapUsed / 1024 / 1024)}MB\n💾 Heap total: ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n💾 RSS: ${Math.round(mem.rss / 1024 / 1024)}MB\n🔄 PID: ${process.pid}`
        });
    },

    ping: async ({ sock, msg }) => {
        const start = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong! ' + (Date.now() - start) + 'ms' });
    },

    uptime: async ({ sock, msg, startTime }) => {
        const up = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(msg.key.remoteJid, { text: `⏰ *Uptime:* ${up}` });
    },

    translate: async ({ sock, msg, args }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !translate <lang> <texte>' });
        const lang = args[0];
        const text = args.slice(1).join(' ');
        try {
            const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|${lang}`, { timeout: 10000 });
            await sock.sendMessage(msg.key.remoteJid, { text: `🌐 *Traduction (${lang}):*\n${res.data.responseData.translatedText}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur traduction' });
        }
    },

    capture: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !capture <url>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '📸 Capture en cours...' });
        try {
            const res = await axios.get(`https://api.screenshotmachine.com/?key=free&url=${encodeURIComponent(body)}&dimension=1366x768`, { responseType: 'arraybuffer', timeout: 30000 });
            if (res.data.byteLength < 1000) throw new Error('Capture vide');
            await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(res.data), caption: `📸 Capture de: ${body}` });
        } catch {
            try {
                const res2 = await axios.get(`https://image.thum.io/get/width/1280/crop/720/${encodeURIComponent(body)}`, { responseType: 'arraybuffer', timeout: 30000 });
                await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(res2.data), caption: `📸 Capture de: ${body}` });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de capturer ce site' });
            }
        }
    },

    tempmail: async ({ sock, msg }) => {
        try {
            const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1', { timeout: 10000 });
            const email = res.data[0];
            await sock.sendMessage(msg.key.remoteJid, { text: `📧 *Email Temporaire créé:*\n\n📬 ${email}\n\n⏳ Valide ~1 heure\n📥 Utilise !tempinbox ${email} pour voir les messages` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur création email temporaire' });
        }
    },

    tempinbox: async ({ sock, msg, args }) => {
        if (!args[0] || !args[0].includes('@')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !tempinbox <email>' });
        const [login, domain] = args[0].split('@');
        try {
            const res = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`, { timeout: 10000 });
            if (!res.data.length) return sock.sendMessage(msg.key.remoteJid, { text: '📭 Boîte de réception vide' });
            const mails = res.data.slice(0, 5).map((m, i) => `${i + 1}. 📧 De: ${m.from}\n   📌 Sujet: ${m.subject}`).join('\n\n');
            await sock.sendMessage(msg.key.remoteJid, { text: `📥 *Boîte: ${args[0]}*\n\n${mails}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur lecture inbox' });
        }
    },

    owner: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `👑 *Propriétaire du bot:*\n📱 +${OWNER_NUMBER}` });
    },

    developpeur: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `💻 *Développeur de ZENOS-MD-V1:*\n📱 +${OWNER_NUMBER}\n🤖 Bot créé avec Baileys & Node.js` });
    },

    support: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `📞 *Support ZENOS-MD-V1:*\n\nContacte le développeur:\n📱 +${OWNER_NUMBER}\n\n🌐 GitHub: https://github.com/zenos-md` });
    },

    repo: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `📦 *ZENOS-MD-V1*\n\n🔗 Repository: https://github.com/zenos-md/zenos-md-v1\n⚡ Stack: Node.js + Baileys\n📌 Version: 1.0.0\n\n_Open source bot WhatsApp multiservices_` });
    },

    obfuscate: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !obfuscate <code_js>' });
        const encoded = Buffer.from(body).toString('base64');
        const obf = `eval(Buffer.from("${encoded}","base64").toString())`;
        await sock.sendMessage(msg.key.remoteJid, { text: `🔐 *Code obfusqué:*\n\n\`\`\`${obf}\`\`\`` });
    },

    menu: async ({ sock, msg, startTime, botName, prefix }) => {
        const settings = getSettings();
        const themeName = settings.theme || 'default';
        const theme = THEMES[themeName] || THEMES.default;
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        const menu = theme.renderMenu(allCategories, {
            botName: settings.botName || botName,
            prefix: settings.prefix || prefix,
            uptime,
            cmdCount: '150+'
        });
        await sock.sendMessage(msg.key.remoteJid, { text: menu });
    },

    vv: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '👁️ *Vue unique:* Cette fonctionnalité nécessite un média en pièce jointe.' });
    },

    qr: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !qr <texte>' });
        const QRCode = require('qrcode');
        const buf = await QRCode.toBuffer(body, { width: 512 });
        await sock.sendMessage(msg.key.remoteJid, { image: buf, caption: `📱 QR Code pour: ${body}` });
    },

    description: async ({ sock, msg, args }) => {
        const cat = args[0]?.toLowerCase() || '';
        const help = {
            general: '📌 Commandes générales: menu, ping, info, uptime, botname, owner, hello, date, about',
            fun: '🎭 Commandes fun: joke, fact, quote, 8ball, flip, dice, random, love, reverse, mock, roast, story, riddle',
            media: '📸 Médias: sticker, toimg, ytmp3, ytmp4, tiktok, instagram, qr, image',
            utils: '🛠️ Utilitaires: calc, translate, weather, currency, password, hash, ip, define, bmi, age',
            ia: '🤖 IA: gpt, gemini, claude, blackbox, llama, dalle',
            groupe: '👥 Groupe: tagall, kick, promote, demote, link, ginfo, warn, antilink, welcome',
            economie: '💰 Économie: myecon, depot, retrait, bonus, vol, pari, slot, transfer, don'
        };
        const text = help[cat] || Object.entries(help).map(([k, v]) => `• *${k}*: ${v.split(':')[0]}`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, { text: `📚 *Aide:*\n\n${text}` });
    }
};

const aliases = {
    'desc': 'description',
    'help': 'description',
    'upt': 'uptime',
    'trt': 'translate',
    'dev': 'developpeur',
    'sc': 'repo',
    'script': 'repo',
    'code_source': 'repo',
    'repository': 'repo',
    'obf': 'obfuscate'
};

module.exports = { commands, aliases };
