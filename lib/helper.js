const fs = require('fs-extra');
const path = require('path');

const OWNER_NUMBER = (process.env.OWNER_NUMBER || '25766486303').replace(/[^0-9]/g, '');

// ─── FIX: Multi-device WhatsApp JID format = "25766486303:0@s.whatsapp.net"
// Le ":0" est l'identifiant de l'appareil lié (linked device)
// On sépare AVANT le ":" et AVANT le "@" pour obtenir le vrai numéro
function isOwner(sender) {
    if (!sender) return false;
    const num = sender.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    return num === OWNER_NUMBER;
}

function getOwnerJid() {
    return `${OWNER_NUMBER}@s.whatsapp.net`;
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}j`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
}

function readJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) { fs.writeJsonSync(filePath, {}); return {}; }
        return fs.readJsonSync(filePath);
    } catch { return {}; }
}

function writeJson(filePath, data) {
    try { fs.writeJsonSync(filePath, data, { spaces: 2 }); return true; } catch { return false; }
}

function getDataPath(filename) {
    return path.join(__dirname, '..', 'data', filename);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function cleanText(text) { return text ? text.trim() : ''; }

function getSenderNumber(sender) {
    // Handle multi-device JID: "25766486303:0@s.whatsapp.net" → "25766486303"
    return sender.split('@')[0].split(':')[0];
}

async function downloadMedia(msg, sock) {
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    let type = '';
    let content = null;
    if (msg.message?.imageMessage)    { type = 'image';   content = msg.message.imageMessage; }
    else if (msg.message?.videoMessage)   { type = 'video';   content = msg.message.videoMessage; }
    else if (msg.message?.audioMessage)   { type = 'audio';   content = msg.message.audioMessage; }
    else if (msg.message?.stickerMessage) { type = 'sticker'; content = msg.message.stickerMessage; }
    else if (msg.message?.documentMessage){ type = 'document';content = msg.message.documentMessage; }
    if (!content) return null;
    try {
        const stream = await downloadContentFromMessage(content, type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), type };
    } catch (e) {
        console.error('Erreur téléchargement média:', e.message);
        return null;
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

module.exports = {
    isOwner, getOwnerJid, formatUptime, readJson, writeJson,
    getDataPath, randomInt, randomItem, cleanText, getSenderNumber,
    downloadMedia, formatBytes, OWNER_NUMBER
};
