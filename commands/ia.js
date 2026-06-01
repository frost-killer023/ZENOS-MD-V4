const axios = require('axios');

async function queryBlackbox(prompt) {
    const res = await axios.post('https://www.blackbox.ai/api/chat', {
        messages: [{ role: 'user', content: prompt }],
        id: 'chatcmpl-' + Date.now(),
        previewToken: null,
        userId: null,
        codeModelMode: true,
        agentMode: {},
        trendingAgentMode: {},
        isMicMode: false,
        maxTokens: 1024,
        webSearchMode: false,
        isChromeExt: false,
        githubToken: null
    }, { timeout: 30000, headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
    const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return text.replace(/\$@\$.*?\$@\$/g, '').trim().substring(0, 3000);
}

async function queryPollinationsAI(prompt, model = 'openai') {
    const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${model}&seed=${Date.now()}`, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return String(res.data).substring(0, 3000);
}

const commands = {
    gpt: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gpt <question>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Traitement en cours...' });
        try {
            const response = await queryPollinationsAI(body, 'openai');
            await sock.sendMessage(msg.key.remoteJid, { text: `🤖 *GPT:*\n\n${response}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur GPT, réessaie plus tard' });
        }
    },

    blackbox: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !blackbox <question>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '🖥️ Blackbox IA en cours...' });
        try {
            const response = await queryBlackbox(body);
            await sock.sendMessage(msg.key.remoteJid, { text: `🖥️ *Blackbox IA:*\n\n${response}` });
        } catch {
            try {
                const fallback = await queryPollinationsAI(body);
                await sock.sendMessage(msg.key.remoteJid, { text: `🖥️ *IA:*\n\n${fallback}` });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur Blackbox IA' });
            }
        }
    },

    gemini: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gemini <question>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '✨ Gemini IA en cours...' });
        try {
            const response = await queryPollinationsAI(body, 'gemini');
            await sock.sendMessage(msg.key.remoteJid, { text: `✨ *Gemini:*\n\n${response}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur Gemini IA' });
        }
    },

    llama: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !llama <question>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '🦙 Llama IA en cours...' });
        try {
            const response = await queryPollinationsAI(body, 'llama');
            await sock.sendMessage(msg.key.remoteJid, { text: `🦙 *Llama:*\n\n${response}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur Llama IA' });
        }
    },

    claude: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !claude <question>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '🔵 Claude IA en cours...' });
        try {
            const res = await axios.post('https://claude.ai/api/append_message', {
                prompt: body,
                max_tokens_to_sample: 1024
            }, { timeout: 20000 });
            const text = res.data?.completion || res.data?.content?.[0]?.text || 'Réponse non disponible';
            await sock.sendMessage(msg.key.remoteJid, { text: `🔵 *Claude:*\n\n${String(text).substring(0, 3000)}` });
        } catch {
            try {
                const fallback = await queryPollinationsAI(`Réponds en français: ${body}`, 'openai');
                await sock.sendMessage(msg.key.remoteJid, { text: `🔵 *IA Claude (proxy):*\n\n${fallback}` });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur Claude IA' });
            }
        }
    },

    copilot: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !copilot <question>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '🪟 Copilot IA en cours...' });
        try {
            const response = await queryPollinationsAI(body, 'phi');
            await sock.sendMessage(msg.key.remoteJid, { text: `🪟 *Copilot:*\n\n${response}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur Copilot IA' });
        }
    },

    dalle: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !dalle <description>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '🎨 Génération d\'image en cours...' });
        try {
            const prompt = encodeURIComponent(body);
            const seed = Math.floor(Math.random() * 99999);
            const url = `https://image.pollinations.ai/prompt/${prompt}?width=1024&height=1024&seed=${seed}&nologo=true`;
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 });
            await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(res.data), caption: `🎨 *Image générée pour:*\n"${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur génération image DALL-E' });
        }
    }
};

const aliases = {
    'ai': 'gpt',
    'ask': 'gpt',
    'ia': 'gpt',
    'image': 'dalle',
    'imagine': 'dalle'
};

module.exports = { commands, aliases };
