const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const POPCAT = 'https://api.popcat.xyz';

// ─── Télécharge image depuis message direct ou cité ───────────────────────────
async function getImageBuffer(msg) {
    const tryDownload = async (msgObj) => {
        const types = ['imageMessage', 'stickerMessage'];
        for (const key of types) {
            if (msgObj?.[key]) {
                const type = key.replace('Message', '');
                try {
                    const stream = await downloadContentFromMessage(msgObj[key], type);
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    return Buffer.concat(chunks);
                } catch {}
            }
        }
        return null;
    };

    // 1. Message direct
    let buf = await tryDownload(msg.message);
    if (buf) return buf;

    // 2. Message cité
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
        buf = await tryDownload(quoted);
        if (buf) return buf;
    }

    return null;
}

// ─── Upload image vers Telegraph (le plus fiable) ────────────────────────────
async function uploadImage(buffer) {
    // Méthode 1 : Telegraph
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const res = await axios.post('https://telegra.ph/upload', form, {
            headers: form.getHeaders(), timeout: 20000
        });
        if (res.data?.[0]?.src) return `https://telegra.ph${res.data[0].src}`;
    } catch {}

    // Méthode 2 : Catbox
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(), timeout: 20000
        });
        if (res.data && res.data.startsWith('https://')) return res.data.trim();
    } catch {}

    // Méthode 3 : tmpfiles
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
        const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders(), timeout: 20000
        });
        const url = res.data?.data?.url;
        if (url) return url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    } catch {}

    throw new Error('Impossible d\'uploader l\'image (tous les services ont échoué)');
}

// ─── Applique un effet Popcat via URL ─────────────────────────────────────────
async function popcatEffect(endpoint, imageUrl) {
    const res = await axios.get(`${POPCAT}/${endpoint}?image=${encodeURIComponent(imageUrl)}`, {
        responseType: 'arraybuffer', timeout: 30000
    });
    return Buffer.from(res.data);
}

// ─── Fabrique une commande d'effet image ──────────────────────────────────────
function effectCmd(endpoint, caption) {
    return async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const buffer = await getImageBuffer(msg);
        if (!buffer) return sock.sendMessage(jid, { text: '❌ Envoie une image ou cite une image avec cette commande' });
        await sock.sendMessage(jid, { text: '⏳ Application de l\'effet...' });
        try {
            const imageUrl = await uploadImage(buffer);
            const result = await popcatEffect(endpoint, imageUrl);
            await sock.sendMessage(jid, { image: result, caption: caption || `✅ Effet *${endpoint}*` });
        } catch (e) {
            await sock.sendMessage(jid, { text: `❌ Erreur effet ${endpoint}: ${e.message}` });
        }
    };
}

// ─── Commandes sharp (traitement local) ───────────────────────────────────────
function sharpCmd(fn, caption) {
    return async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        const buffer = await getImageBuffer(msg);
        if (!buffer) return sock.sendMessage(jid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const result = await fn(sharp, buffer, args);
            await sock.sendMessage(jid, { image: result, caption });
        } catch (e) {
            await sock.sendMessage(jid, { text: `❌ Erreur: ${e.message}` });
        }
    };
}

const commands = {
    // ─── Effets via API Popcat ─────────────────────────────────────────────────
    wasted:    effectCmd('wasted',    '💀 *Wasted!*'),
    wanted:    effectCmd('wanted',    '🤠 *Wanted!*'),
    trigger:   effectCmd('triggered', '😡 *TRIGGERED!*'),
    rip:       effectCmd('rip',       '⚰️ *R.I.P*'),
    beautiful: effectCmd('beautiful', '✨ *Beautiful!*'),
    jail:      effectCmd('jail',      '🔒 *En prison!*'),
    facepalm:  effectCmd('facepalm',  '🤦 *Facepalm*'),
    trash:     effectCmd('trash',     '🗑️ *Trash*'),
    affect:    effectCmd('affect',    '😢 *Affect*'),

    // ─── Effets locaux via sharp ───────────────────────────────────────────────
    sepia: sharpCmd(
        async (sharp, buf) => sharp(buf).recomb([[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]]).jpeg().toBuffer(),
        '🟤 *Effet Sépia*'
    ),
    greyscale: sharpCmd(
        async (sharp, buf) => sharp(buf).greyscale().jpeg().toBuffer(),
        '⚫ *Noir & Blanc*'
    ),
    invert1: sharpCmd(
        async (sharp, buf) => sharp(buf).negate().jpeg().toBuffer(),
        '🔄 *Couleurs inversées*'
    ),
    blur: sharpCmd(
        async (sharp, buf, args) => {
            const sigma = parseFloat(args?.[0]) || 10;
            return sharp(buf).blur(sigma).jpeg().toBuffer();
        },
        '💫 *Flou appliqué*'
    ),
    pixelate: sharpCmd(
        async (sharp, buf, args) => {
            const size = parseInt(args?.[0]) || 20;
            const img = sharp(buf);
            const meta = await img.metadata();
            const w = Math.max(1, Math.floor(meta.width / size));
            const h = Math.max(1, Math.floor(meta.height / size));
            return sharp(buf).resize(w, h).resize(meta.width, meta.height, { kernel: 'nearest' }).jpeg().toBuffer();
        },
        '🟦 *Pixelisé*'
    ),
    rainbow: sharpCmd(
        async (sharp, buf) => sharp(buf).modulate({ saturation: 3, brightness: 1.1 }).jpeg().toBuffer(),
        '🌈 *Arc-en-ciel*'
    ),
    darkness: sharpCmd(
        async (sharp, buf) => sharp(buf).modulate({ brightness: 0.3 }).jpeg().toBuffer(),
        '🌑 *Assombri*'
    ),
    sharpen: sharpCmd(
        async (sharp, buf) => sharp(buf).sharpen().jpeg().toBuffer(),
        '🔪 *Image nette*'
    ),
    contrast: sharpCmd(
        async (sharp, buf) => sharp(buf).linear(1.5, -50).jpeg().toBuffer(),
        '⚡ *Contraste augmenté*'
    ),
    flip: sharpCmd(
        async (sharp, buf) => sharp(buf).flip().jpeg().toBuffer(),
        '↕️ *Image retournée verticalement*'
    ),
    flop: sharpCmd(
        async (sharp, buf) => sharp(buf).flop().jpeg().toBuffer(),
        '↔️ *Image retournée horizontalement*'
    )
};

const aliases = {
    'gris': 'greyscale',
    'grey': 'greyscale',
    'bw': 'greyscale',
    'inverse': 'invert1',
    'flou': 'blur',
    'pixel': 'pixelate',
    'trig': 'trigger'
};

module.exports = { commands, aliases };
