const axios = require('axios');
const { downloadMedia } = require('../lib/helper');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

async function getQuotedMedia(msg, sock) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    const fakeMsg = { message: quoted, key: { remoteJid: msg.key.remoteJid } };
    return downloadMedia(fakeMsg, sock);
}

const commands = {
    sticker: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image/vidéo/GIF pour créer un sticker' });
        try {
            const { type, buffer } = media;
            if (type === 'image') {
                const sharp = require('sharp');
                const webp = await sharp(buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toBuffer();
                await sock.sendMessage(msg.key.remoteJid, { sticker: webp });
            } else if (type === 'video' || type === 'sticker') {
                await sock.sendMessage(msg.key.remoteJid, { sticker: buffer });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Format non supporté pour les stickers' });
            }
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur création sticker: ${e.message}` });
        }
    },

    toimage: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite un sticker' });
        try {
            const sharp = require('sharp');
            const png = await sharp(media.buffer).png().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: png, caption: '🖼️ Sticker converti en image' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur conversion: ${e.message}` });
        }
    },

    circle: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const size = 512;
            const circleSvg = Buffer.from(`<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
            const webp = await sharp(media.buffer).resize(size, size).composite([{ input: circleSvg, blend: 'dest-in' }]).webp().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { sticker: webp });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur sticker circulaire: ${e.message}` });
        }
    },

    round: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const size = 512;
            const r = 80;
            const svg = Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
            const webp = await sharp(media.buffer).resize(size, size).composite([{ input: svg, blend: 'dest-in' }]).webp().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { sticker: webp });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    tts: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !tts <texte>' });
        try {
            const url = `https://api.voicerss.org/?key=free&hl=fr-fr&src=${encodeURIComponent(body)}&f=16khz_16bit_stereo`;
            const res = await axios.get(`https://tts-api.com/tts.mp3?lang=fr&text=${encodeURIComponent(body)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(msg.key.remoteJid, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg', ptt: false });
        } catch {
            try {
                const googleTTS = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(body)}&tl=fr&client=tw-ob`;
                const res2 = await axios.get(googleTTS, { responseType: 'arraybuffer', timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                await sock.sendMessage(msg.key.remoteJid, { audio: Buffer.from(res2.data), mimetype: 'audio/mpeg', ptt: false });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur TTS' });
            }
        }
    },

    toaudio: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media || media.type !== 'video') return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une vidéo' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Conversion en cours...' });
        try {
            const ffmpeg = require('fluent-ffmpeg');
            const tmpIn = path.join(__dirname, '..', 'data', `tmp_${Date.now()}.mp4`);
            const tmpOut = path.join(__dirname, '..', 'data', `tmp_${Date.now()}.mp3`);
            await fs.writeFile(tmpIn, media.buffer);
            await new Promise((res, rej) => {
                ffmpeg(tmpIn).noVideo().audioCodec('libmp3lame').save(tmpOut).on('end', res).on('error', rej);
            });
            const audioBuf = await fs.readFile(tmpOut);
            await sock.sendMessage(msg.key.remoteJid, { audio: audioBuf, mimetype: 'audio/mpeg' });
            await fs.remove(tmpIn);
            await fs.remove(tmpOut);
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur conversion: ${e.message}` });
        }
    },

    emix: async ({ sock, msg, args }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !emix <emoji1> <emoji2>' });
        try {
            const e1 = encodeURIComponent(args[0]);
            const e2 = encodeURIComponent(args[1]);
            const url = `https://emojikitchen.dev/api/?emoji1=${e1}&emoji2=${e2}`;
            const res = await axios.get(url, { timeout: 10000 });
            if (res.data?.result) {
                const imgRes = await axios.get(res.data.result, { responseType: 'arraybuffer', timeout: 10000 });
                await sock.sendMessage(msg.key.remoteJid, { sticker: Buffer.from(imgRes.data) });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Mix d\'emoji non disponible pour ces emojis' });
            }
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur mix emoji' });
        }
    },

    ttp: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ttp <texte>' });
        try {
            const res = await axios.get(`https://api.popcat.xyz/ttp?text=${encodeURIComponent(body)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(msg.key.remoteJid, { sticker: Buffer.from(res.data) });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur génération sticker texte' });
        }
    },

    attp: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !attp <texte>' });
        try {
            const res = await axios.get(`https://api.popcat.xyz/attp?text=${encodeURIComponent(body)}`, { responseType: 'arraybuffer', timeout: 15000 });
            await sock.sendMessage(msg.key.remoteJid, { sticker: Buffer.from(res.data) });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur sticker animé' });
        }
    },

    url: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite un fichier' });
        try {
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', media.buffer, { filename: `file.${media.type === 'image' ? 'jpg' : media.type === 'video' ? 'mp4' : 'bin'}` });
            const res = await axios.post('https://catbox.moe/user.php', form, { headers: form.getHeaders(), timeout: 30000 });
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Fichier uploadé:\n🔗 ${res.data}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur upload fichier' });
        }
    },

    crop: async ({ sock, msg }) => {
        const media = await downloadMedia(msg, sock) || await getQuotedMedia(msg, sock);
        if (!media) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const webp = await sharp(media.buffer).resize(512, 512, { fit: 'cover' }).webp().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { sticker: webp });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur crop: ${e.message}` });
        }
    }
};

const aliases = {
    's': 'sticker',
    'stick': 'sticker',
    'toimg': 'toimage',
    'photo': 'toimage',
    'stovid': 'stickertovideo',
    'q': 'quotely'
};

module.exports = { commands, aliases };
