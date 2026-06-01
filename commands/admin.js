const { getOwnerJid, readJson, writeJson, getDataPath, OWNER_NUMBER } = require('../lib/helper');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const logs = [];
function addLog(entry) {
    logs.unshift(`[${new Date().toLocaleString('fr-FR')}] ${entry}`);
    if (logs.length > 100) logs.pop();
}

const commands = {
    // ─── RESTART ──────────────────────────────────────────────────────────────
    restart: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: '🔄 *Redémarrage du bot...*\n\n• La session est sauvegardée\n• Reconnexion automatique dans ~10 secondes\n• Pas besoin de rentrer le code de nouveau ✅'
        });
        addLog('Bot redémarré via !restart');
        setTimeout(() => process.exit(0), 2000);
    },

    // ─── SESSION : obtenir les credentials à mettre dans Render env var ───────
    session: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        await sock.sendMessage(jid, { text: '⏳ Génération du backup de session...' });
        try {
            let b64 = global.sessionBase64;
            if (!b64 && global.backupSession) {
                b64 = await global.backupSession();
            }
            if (!b64) {
                // Lire depuis le fichier de backup
                const backupFile = path.join(__dirname, '..', 'data', 'session_backup.txt');
                if (fs.existsSync(backupFile)) {
                    b64 = fs.readFileSync(backupFile, 'utf8').trim();
                }
            }
            if (!b64) return sock.sendMessage(jid, { text: '❌ Pas de session à exporter. Le bot doit être connecté.' });

            await sock.sendMessage(jid, {
                text: `✅ *SESSION PERSISTANTE*\n\nCopie cette valeur dans Render.com :\n*Environment > SESSION_DATA*\n\n\`\`\`${b64.slice(0, 200)}...\`\`\`\n\n_(valeur complète envoyée en fichier)_`
            });
            // Envoyer la valeur complète en document
            await sock.sendMessage(jid, {
                document: Buffer.from(b64, 'utf8'),
                mimetype: 'text/plain',
                fileName: 'SESSION_DATA.txt',
                caption: '📄 Contenu complet de SESSION_DATA — colle-le dans Render.com > Environment'
            });
        } catch (e) {
            await sock.sendMessage(jid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── STATUS ───────────────────────────────────────────────────────────────
    status: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !status <message>' });
        try {
            await sock.updateProfileStatus(body);
            addLog(`Status: ${body}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Statut: "${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de changer le statut' });
        }
    },

    // ─── SETNAME ──────────────────────────────────────────────────────────────
    setname: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !setname <nom>' });
        try {
            await sock.updateProfileName(body);
            addLog(`Nom: ${body}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Nom changé en: "${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de changer le nom' });
        }
    },

    // ─── LOGS ─────────────────────────────────────────────────────────────────
    logs: async ({ sock, msg }) => {
        const text = logs.length
            ? `📋 *Dernières actions:*\n\n${logs.slice(0, 20).join('\n')}`
            : '📋 Aucune action enregistrée.';
        await sock.sendMessage(msg.key.remoteJid, { text });
    },

    // ─── EVAL (exécution de code JS) ──────────────────────────────────────────
    eval: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !eval <code_js>' });
        try {
            let result = eval(body);
            if (result instanceof Promise) result = await result;
            await sock.sendMessage(msg.key.remoteJid, { text: `📤 *Résultat:*\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\`` });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── SHELL (commande shell) ────────────────────────────────────────────────
    shell: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !shell <commande>' });
        exec(body, { timeout: 15000 }, async (err, stdout, stderr) => {
            const out = (stdout || stderr || err?.message || 'Pas de sortie').slice(0, 2000);
            await sock.sendMessage(msg.key.remoteJid, { text: `💻 *Shell:*\n\`\`\`${out}\`\`\`` });
        });
    },

    // ─── BROADCAST ────────────────────────────────────────────────────────────
    broadcast: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !broadcast <message>' });
        try {
            const chats = Object.keys(sock.chats || {});
            let sent = 0;
            for (const jid of chats.slice(0, 10)) {
                try {
                    await sock.sendMessage(jid, { text: `📢 *Broadcast:*\n\n${body}` });
                    sent++;
                    await new Promise(r => setTimeout(r, 1500));
                } catch {}
            }
            addLog(`Broadcast envoyé à ${sent} chats`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Broadcast envoyé à ${sent} chats` });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur broadcast: ${e.message}` });
        }
    },

    // ─── BLOCK / UNBLOCK ──────────────────────────────────────────────────────
    block: async ({ sock, msg, body }) => {
        const num = (body || '').replace(/[^0-9]/g, '');
        if (!num) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !block <numéro>' });
        const jid = `${num}@s.whatsapp.net`;
        try {
            await sock.updateBlockStatus(jid, 'block');
            await sock.sendMessage(msg.key.remoteJid, { text: `🚫 @+${num} bloqué`, mentions: [jid] });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    unblock: async ({ sock, msg, body }) => {
        const num = (body || '').replace(/[^0-9]/g, '');
        if (!num) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !unblock <numéro>' });
        const jid = `${num}@s.whatsapp.net`;
        try {
            await sock.updateBlockStatus(jid, 'unblock');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @+${num} débloqué`, mentions: [jid] });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── BOT INFO SYSTÈME ─────────────────────────────────────────────────────
    sysinfo: async ({ sock, msg, startTime }) => {
        const os = require('os');
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const mem = process.memoryUsage();
        const text = `💻 *Infos Système*\n\n🖥️ OS: ${os.type()} ${os.release()}\n⚡ CPU: ${os.cpus()[0]?.model || 'N/A'}\n💾 RAM libre: ${Math.round(os.freemem() / 1048576)} MB\n📊 RAM utilisée (bot): ${Math.round(mem.heapUsed / 1048576)} MB\n⏰ Uptime bot: ${uptime}s\n🔧 Node.js: ${process.version}`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    }
};

const aliases = {
    'reboot':   'restart',
    'redemarrer': 'restart',
    'sessid':   'session',
    'sauvegarde': 'session'
};

module.exports = { commands, aliases };
