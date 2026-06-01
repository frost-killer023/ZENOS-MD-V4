const { readJson, writeJson, getDataPath, formatUptime } = require('../lib/helper');
const path = require('path');

const statsPath = getDataPath('stats.json');

function getStats() {
    return readJson(statsPath) || { commands: {}, errors: {}, totalCalls: 0, startedAt: Date.now() };
}

function saveStats(data) {
    writeJson(statsPath, data);
}

function recordCommand(cmdName) {
    const stats = getStats();
    stats.totalCalls = (stats.totalCalls || 0) + 1;
    if (!stats.commands[cmdName]) stats.commands[cmdName] = 0;
    stats.commands[cmdName]++;
    saveStats(stats);
}

function recordError(cmdName) {
    const stats = getStats();
    if (!stats.errors) stats.errors = {};
    if (!stats.errors[cmdName]) stats.errors[cmdName] = 0;
    stats.errors[cmdName]++;
    saveStats(stats);
}

const commands = {
    stats: async ({ sock, msg, startTime }) => {
        const stats = getStats();
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));

        const sortedCmds = Object.entries(stats.commands || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        const sortedErrors = Object.entries(stats.errors || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const topCmds = sortedCmds.length
            ? sortedCmds.map(([cmd, count], i) => `${i + 1}. !${cmd} → *${count}x*`).join('\n')
            : 'Aucune commande utilisée';

        const topErrors = sortedErrors.length
            ? sortedErrors.map(([cmd, count]) => `• !${cmd}: ${count} erreur(s)`).join('\n')
            : '✅ Aucune erreur';

        const uniqueCmds = Object.keys(stats.commands || {}).length;

        const text = `📊 *Statistiques ZENOS-MD-V1*\n\n` +
            `⏰ Uptime: ${uptime}\n` +
            `🔢 Total appels: *${stats.totalCalls || 0}*\n` +
            `🎯 Commandes uniques utilisées: *${uniqueCmds}*\n\n` +
            `🏆 *Top 10 commandes:*\n${topCmds}\n\n` +
            `❌ *Erreurs récentes:*\n${topErrors}`;

        await sock.sendMessage(msg.key.remoteJid, { text });
    },

    resetstats: async ({ sock, msg }) => {
        saveStats({ commands: {}, errors: {}, totalCalls: 0, startedAt: Date.now() });
        await sock.sendMessage(msg.key.remoteJid, { text: '✅ Statistiques réinitialisées!' });
    }
};

const aliases = {
    'statistiques': 'stats',
    'stat': 'stats'
};

module.exports = { commands, aliases, recordCommand, recordError };
