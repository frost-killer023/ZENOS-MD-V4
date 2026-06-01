const axios = require('axios');
const { downloadMedia, downloadMediaFromQuoted } = require('../lib/helper');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs-extra');
const path = require('path');

// ─── Création de sticker depuis image ────────────────────────────────────────
async function makeSticker(buffer, mediaType) {
    const sharp = require('sharp');
    if (mediaType === 'image') {
        return await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 80 })
            .toBuffer();
    }
    // Pour vidéo/gif → tenter ffmpeg
    const tmpIn = `/tmp/sticker_in_${Date.now()}.mp4`;
    const tmpOut = `/tmp/sticker_out_${Date.now()}.webp`;
    fs.writeFileSync(tmpIn, buffer);
    await new Promise((resolve, reject) => {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg(tmpIn)
            .setStartTime(0)
            .duration(3)
            .outputOptions(['-vf', 'fps=15,scale=512:512:flags=lanczos', '-loop', '0', '-an', '-vsync', '0'])
            .toFormat('webp')
            .save(tmpOut)
            .on('end', resolve)
            .on('error', reject);
    });
    const result = fs.readFileSync(tmpOut);
    fs.removeSync(tmpIn);
    fs.removeSync(tmpOut);
    return result;
}

// ─── Télécharge media depuis message direct ou cité ──────────────────────────
async function getMedia(msg, types = ['image', 'video', 'sticker']) {
    // Message direct
    for (const type of types) {
        const key = `${type}Message`;
        if (msg.message?.[key]) {
            try {
                const stream = await downloadContentFromMessage(msg.message[key], type);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                return { buffer: Buffer.concat(chunks), type };
            } catch {}
        }
    }
    // Message cité
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (quoted) {
        for (const type of types) {
            const key = `${type}Message`;
            if (quoted[key]) {
                try {
                    const stream = await downloadContentFromMessage(quoted[key], type);
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    return { buffer: Buffer.concat(chunks), type };
                } catch {}
            }
        }
    }
    return null;
}

const commands = {
    // ─── STICKER ──────────────────────────────────────────────────────────────
    sticker: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const media = await getMedia(msg, ['image', 'video', 'sticker']);

        if (!media) {
            return sock.sendMessage(jid, {
                text: '❌ *Usage:*\n• Envoie une image avec *!sticker* en légende\n• Ou cite une image et tape *!sticker*'
            });
        }

        await sock.sendMessage(jid, { text: '⏳ Création du sticker...' });

        try {
            const webpBuffer = await makeSticker(media.buffer, media.type);
            await sock.sendMessage(jid, { sticker: webpBuffer });
        } catch (e) {
            // Fallback: envoyer comme image si la conversion échoue
            try {
                const sharp = require('sharp');
                const fallback = await sharp(media.buffer).webp().toBuffer();
                await sock.sendMessage(jid, { sticker: fallback });
            } catch {
                await sock.sendMessage(jid, { text: `❌ Erreur sticker: ${e.message}` });
            }
        }
    },

    // ─── TOIMG (sticker → image) ──────────────────────────────────────────────
    toimg: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const media = await getMedia(msg, ['sticker']);
        if (!media) return sock.sendMessage(jid, { text: '❌ Envoie ou cite un sticker' });
        try {
            const sharp = require('sharp');
            const png = await sharp(media.buffer).png().toBuffer();
            await sock.sendMessage(jid, { image: png, caption: '🖼️ *Sticker → Image*' });
        } catch (e) {
            await sock.sendMessage(jid, { text: `❌ Erreur conversion: ${e.message}` });
        }
    },

    // ─── YOUTUBE MP3 ──────────────────────────────────────────────────────────
    ytmp3: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ytmp3 <url_youtube>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement audio YouTube...' });
        try {
            const apiUrl = `https://api.fabdl.com/youtube/get?url=${encodeURIComponent(body)}`;
            const res = await axios.get(apiUrl, { timeout: 20000 });
            const data = res.data?.result;
            if (!data) throw new Error('Pas de résultat');
            const dlRes = await axios.get(`https://api.fabdl.com/youtube/mp3/${data.process_id}`, { timeout: 30000 });
            const dlUrl = dlRes.data?.result?.download_url;
            if (!dlUrl) throw new Error('URL de téléchargement non disponible');
            const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(msg.key.remoteJid, {
                audio: Buffer.from(audioRes.data), mimetype: 'audio/mpeg', ptt: false
            });
        } catch {
            try {
                const res2 = await axios.get(`https://ytdlp.online/api/convert?url=${encodeURIComponent(body)}&format=mp3`, { timeout: 30000 });
                if (res2.data?.url) {
                    const audio = await axios.get(res2.data.url, { responseType: 'arraybuffer', timeout: 60000 });
                    await sock.sendMessage(msg.key.remoteJid, { audio: Buffer.from(audio.data), mimetype: 'audio/mpeg' });
                } else throw new Error('No URL');
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Échec téléchargement YouTube MP3.' });
            }
        }
    },

    // ─── YOUTUBE MP4 ──────────────────────────────────────────────────────────
    ytmp4: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ytmp4 <url_youtube>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement vidéo YouTube...' });
        try {
            const res = await axios.get(`https://api.fabdl.com/youtube/get?url=${encodeURIComponent(body)}`, { timeout: 20000 });
            const data = res.data?.result;
            if (!data) throw new Error('No result');
            const dlRes = await axios.get(`https://api.fabdl.com/youtube/mp4/${data.process_id}`, { timeout: 30000 });
            const dlUrl = dlRes.data?.result?.download_url;
            if (!dlUrl) throw new Error('No URL');
            const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 });
            await sock.sendMessage(msg.key.remoteJid, {
                video: Buffer.from(videoRes.data), mimetype: 'video/mp4', caption: '📹 Vidéo YouTube'
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Échec téléchargement YouTube. API temporairement indisponible.' });
        }
    },

    // ─── TIKTOK ───────────────────────────────────────────────────────────────
    tiktok: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !tiktok <url_tiktok>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement TikTok...' });
        try {
            const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(body)}`, { timeout: 30000 });
            const data = res.data?.data;
            if (!data?.play) throw new Error('No data');
            const videoRes = await axios.get(data.play, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(msg.key.remoteJid, {
                video: Buffer.from(videoRes.data), mimetype: 'video/mp4',
                caption: `🎵 *TikTok* (sans watermark)\n👤 @${data.author?.unique_id || 'N/A'}\n💬 ${(data.title || '').slice(0, 100)}`
            });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Échec TikTok: ${e.message}` });
        }
    },

    // ─── INSTAGRAM ────────────────────────────────────────────────────────────
    instagram: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !instagram <url>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement Instagram...' });
        try {
            const res = await axios.get(`https://igdownloader.app/api/download?url=${encodeURIComponent(body)}`, { timeout: 30000 });
            const dlUrl = res.data?.url || res.data?.download_url;
            if (!dlUrl) throw new Error('URL non disponible');
            const mediaRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const isVideo = dlUrl.includes('.mp4') || res.data?.type === 'video';
            if (isVideo) {
                await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(mediaRes.data), mimetype: 'video/mp4', caption: '📸 Instagram' });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(mediaRes.data), caption: '📸 Instagram' });
            }
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de télécharger ce contenu Instagram.' });
        }
    },

    // ─── TWITTER/X ────────────────────────────────────────────────────────────
    twitter: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !twitter <url_tweet>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement Twitter/X...' });
        try {
            const res = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(body)}`, {
                timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const dlUrl = res.data?.videos?.[0]?.url;
            if (!dlUrl) throw new Error('URL non disponible');
            const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(videoRes.data), mimetype: 'video/mp4', caption: '🐦 Twitter/X' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de télécharger cette vidéo Twitter/X.' });
        }
    },

    // ─── FACEBOOK ─────────────────────────────────────────────────────────────
    facebook: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !facebook <url>' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📘 *Facebook Downloader*\n\nLien reçu: ${body}\n\n⚠️ Utilise https://fdown.net pour les vidéos Facebook.`
        });
    },

    // ─── GÉNÉRATION D'IMAGE IA ────────────────────────────────────────────────
    image: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !image <description>' });
        await sock.sendMessage(msg.key.remoteJid, { text: `🎨 Génération d'image: *${body}*...` });
        try {
            const seed = Math.floor(Math.random() * 99999);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(body)}?width=1024&height=1024&seed=${seed}&nologo=true`;
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 });
            await sock.sendMessage(msg.key.remoteJid, {
                image: Buffer.from(res.data), caption: `🖼️ *Image IA:* "${body}"`
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de générer l\'image. Réessaie.' });
        }
    }
};

const aliases = {
    'stk': 'sticker',
    'yt': 'ytmp3',
    'yta': 'ytmp3',
    'ytv': 'ytmp4',
    'fb': 'facebook',
    'ig': 'instagram',
    'tw': 'twitter',
    'tt': 'tiktok',
    'img': 'image',
    'imagine': 'image'
};

module.exports = { commands, aliases };
