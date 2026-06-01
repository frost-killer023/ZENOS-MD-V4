const axios = require('axios');
const cheerio = require('cheerio');

async function generateLogoEphoto(effectUrl, text) {
    const baseUrl = 'https://en.ephoto360.com';
    const fullUrl = `${baseUrl}${effectUrl}`;
    const params = new URLSearchParams({ text });
    const res = await axios.post(fullUrl, params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': fullUrl,
            'Origin': baseUrl
        },
        timeout: 30000
    });
    const $ = cheerio.load(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
    const imgUrl = $('img.output-image').attr('src') || $('img[class*="result"]').attr('src') || $('img').filter((i, el) => $(el).attr('src')?.includes('output')).first().attr('src');
    if (!imgUrl) throw new Error('Image non générée');
    return imgUrl.startsWith('http') ? imgUrl : baseUrl + imgUrl;
}

async function generateLogoPollinationsText(text, style) {
    const prompt = `${style} style logo text: "${text}", professional design, high quality`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=512&seed=${Date.now()}&nologo=true`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 });
    return Buffer.from(res.data);
}

function createLogoCommand(style) {
    return async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: !${style} <texte>` });
        await sock.sendMessage(msg.key.remoteJid, { text: `🎨 Génération effet *${style}*...` });
        try {
            const buffer = await generateLogoPollinationsText(body, style);
            await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption: `✅ Effet *${style}* pour: "${body}"` });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur génération logo ${style}: ${e.message}` });
        }
    };
}

const logoStyles = [
    'dragonball', 'deadpool', 'blackpink', 'neon1', 'football', 'steel', 'paint',
    'thunder', 'thor', 'graffiti1', 'gold2', 'neon2', 'effacer', 'galaxy',
    'vintage', 'gold1', 'graffiti2', 'hacker', 'rain', 'typography', 'gold3',
    'wood', 'captain_america', 'cubic', 'green_effect', 'naruto', 'sand',
    'plasma', 'avengers', 'underwater', 'glass', 'graffiti3', 'summery',
    'gold4', 'cloud', 'metal', 'watercolor', 'sci_fi', 'gold5', 'blackpink2',
    'cloud2', 'neon3', 'space', 'blackpink3', 'onepiece', 'dragonball2',
    'football2', 'football3', 'futuris'
];

const commands = {};
for (const style of logoStyles) {
    commands[style] = createLogoCommand(style);
}

const aliases = {
    'neon': 'neon1',
    'graffiti': 'graffiti1',
    'gold': 'gold1'
};

module.exports = { commands, aliases };
