require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino   = require('pino');
const fs     = require('fs-extra');
const path   = require('path');
const http   = require('http');
const { getOwnerJid, isOwner, formatUptime, OWNER_NUMBER } = require('./lib/helper');
const { loadCommands, getCommand } = require('./lib/commandHandler');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PREFIX       = process.env.PREFIX     || '!';
const BOT_NAME     = process.env.BOT_NAME   || 'ZENOS-MD-V4';
const PHONE_NUMBER = (process.env.PHONE_NUMBER || OWNER_NUMBER).replace(/[^0-9]/g, '');
const AUTH_DIR     = path.join(__dirname, 'auth_info_baileys');
const PORT         = process.env.PORT || 3000;
const startTime    = Date.now();
global.startTime   = startTime;

// ─── Dossiers ────────────────────────────────────────────────────────────────
fs.ensureDirSync('./data');
if (!fs.existsSync('./data/settings.json')) {
    fs.writeJsonSync('./data/settings.json',
        { theme: 'galaxy', prefix: '!', botName: BOT_NAME, language: 'fr' },
        { spaces: 2 });
}

process.on('uncaughtException',  err => console.error('[ERR]', err.message));
process.on('unhandledRejection', err => console.error('[REJ]', err?.message || err));

// ─── ÉTAT GLOBAL ──────────────────────────────────────────────────────────────
const STATE = {
    connected:   false,
    pairingCode: null,
    pairingAt:   null,
    user:        null,
    retries:     0
};

// ─── SESSION PERSISTANTE ─────────────────────────────────────────────────────
// Retourne true si une session valide a été restaurée depuis SESSION_DATA
function restoreSessionFromEnv() {
    const raw = process.env.SESSION_DATA;
    if (!raw || raw.trim() === '') return false;
    try {
        const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        // Vérifier que les fichiers essentiels sont présents
        if (!data['creds.json']) return false;
        fs.ensureDirSync(AUTH_DIR);
        for (const [file, content] of Object.entries(data)) {
            const fp = path.join(AUTH_DIR, file);
            if (typeof content === 'string') fs.writeFileSync(fp, content, 'utf8');
            else fs.writeJsonSync(fp, content, { spaces: 2 });
        }
        console.log('✅ Session restaurée depuis SESSION_DATA');
        return true;
    } catch (e) {
        console.error('⚠️  Restauration session échouée:', e.message);
        return false;
    }
}

async function backupSession() {
    try {
        const files = fs.readdirSync(AUTH_DIR);
        const data  = {};
        for (const f of files) {
            const fp = path.join(AUTH_DIR, f);
            try { data[f] = fs.readJsonSync(fp); } catch { data[f] = fs.readFileSync(fp, 'utf8'); }
        }
        const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
        fs.writeFileSync('./data/session_backup.txt', b64, 'utf8');
        global.sessionBase64 = b64;
        return b64;
    } catch { return null; }
}
global.backupSession = backupSession;

// ─── SERVEUR HTTP ─────────────────────────────────────────────────────────────
http.createServer((req, res) => {
    const url = req.url?.split('?')[0];

    // ── /ping ou /status ───────────────────────────────────────────────────────
    if (url === '/status' || url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: STATE.connected ? 'connected' : 'waiting',
            bot: BOT_NAME, phone: PHONE_NUMBER,
            user: STATE.user, uptime: Math.floor((Date.now() - startTime) / 1000),
            pairingCode: STATE.pairingCode,
            timestamp: new Date().toISOString()
        }));
    }

    // ── /session : exporte SESSION_DATA pour Render ────────────────────────────
    if (url === '/session') {
        const b64 = global.sessionBase64 || null;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (!b64) {
            return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="5"><title>Session — ${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #5555ff;border-radius:12px;max-width:700px}</style></head>
<body><div class="box"><h2 style="color:#ffaa00">⏳ Session pas encore disponible</h2>
<p>Connecte d'abord le bot avec le pairing code,<br>puis reviens sur cette page.</p>
<p><small style="color:#555">Rafraîchissement auto toutes les 5s</small></p>
</div></body></html>`);
        }
        return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Session — ${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{padding:40px;border:2px solid #00ff88;border-radius:12px;max-width:900px;width:90%}
h2{color:#00ff88;text-align:center}
textarea{width:100%;height:180px;background:#111;color:#ffdd00;border:1px solid #333;border-radius:6px;padding:12px;font-size:0.8em;word-break:break-all;resize:vertical}
button{margin-top:12px;padding:10px 28px;background:#00ff88;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:1em}
.steps{color:#ccc;line-height:2;margin-top:20px}</style></head>
<body><div class="box">
<h2>💾 SESSION_DATA — ${BOT_NAME}</h2>
<p style="color:#aaa;text-align:center">Copie cette valeur dans <strong>SESSION_DATA</strong> sur Render.</p>
<textarea id="sd" readonly>${b64}</textarea>
<button onclick="navigator.clipboard.writeText(document.getElementById('sd').value).then(()=>this.textContent='✅ Copié !').catch(()=>{})">📋 Copier</button>
<div class="steps">
1️⃣ Copie la valeur<br>
2️⃣ Render → Environment → <code>SESSION_DATA</code><br>
3️⃣ Redémarre → le bot se reconnecte sans code<br>
</div></div></body></html>`);
    }

    // ── Page principale ────────────────────────────────────────────────────────
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (STATE.connected) {
        return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#00ff88;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #00ff88;border-radius:12px;max-width:500px}
h1{font-size:2em;margin-bottom:10px}p{color:#aaa}
.badge{background:#00ff88;color:#000;padding:8px 20px;border-radius:20px;font-weight:bold;font-size:1.2em}</style></head>
<body><div class="box"><h1>✅ ${BOT_NAME}</h1>
<p>Bot connecté et opérationnel</p>
<p>👤 ${STATE.user || PHONE_NUMBER}</p>
<br><span class="badge">EN LIGNE</span>
<br><br><small style="color:#555">Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s</small>
<br><br><a href="/session" style="color:#00ff88">💾 Exporter la session</a>
</div></body></html>`);
    }

    const age     = STATE.pairingAt ? Math.floor((Date.now() - STATE.pairingAt) / 1000) : null;
    const expired = age !== null && age > 55;
    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="10"><title>${BOT_NAME} — Connexion</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #5555ff;border-radius:12px;max-width:620px}
h1{color:#5555ff}
.code{font-size:2.6em;letter-spacing:10px;color:#ffdd00;background:#111;padding:20px 30px;border-radius:8px;margin:20px 0;border:2px dashed #ffdd00;word-break:break-all}
.steps{text-align:left;margin-top:20px;color:#ccc;line-height:2.2}
.expired{color:#ff4444;font-weight:bold}
.ok{color:#00ff88}
.warn{color:#ffaa00}</style></head>
<body><div class="box">
<h1>🤖 ${BOT_NAME}</h1>
<p>Numéro : <strong>+${PHONE_NUMBER}</strong></p>
${STATE.pairingCode
    ? `<p>${expired
        ? '<span class="expired">⏰ Code expiré — nouveau en cours...</span>'
        : '<span class="ok">✅ Code actif (60s)</span>'}</p>
       <div class="code">${STATE.pairingCode}</div>
       <p class="warn">📲 WhatsApp t'envoie une notification sur <strong>+${PHONE_NUMBER}</strong></p>`
    : `<p>⏳ Connexion aux serveurs WhatsApp...<br><small>(le code arrive dans quelques secondes)</small></p>`}
<div class="steps">
<strong>📱 Étapes :</strong><br>
1️⃣ Ouvre WhatsApp (+${PHONE_NUMBER})<br>
2️⃣ Paramètres → <strong>Appareils connectés</strong><br>
3️⃣ <strong>Connecter un appareil</strong><br>
4️⃣ <strong>"Coupler avec un numéro de téléphone"</strong><br>
5️⃣ Entre le numéro <strong>+${PHONE_NUMBER}</strong><br>
6️⃣ Tape le code affiché ci-dessus<br>
</div>
<br><small style="color:#444">Rafraîchissement auto 10s | Tentative #${STATE.retries + 1}</small>
</div></body></html>`);
}).listen(PORT, () => console.log(`\n🌐 Interface: http://localhost:${PORT}`));

// ─── KEEP-ALIVE ───────────────────────────────────────────────────────────────
let keepAliveInterval = null;
function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    const ownerJid = getOwnerJid();
    keepAliveInterval = setInterval(async () => {
        if (!sock?.user) return;
        try {
            await sock.sendPresenceUpdate('recording', ownerJid);
            await new Promise(r => setTimeout(r, 3000));
            await sock.sendPresenceUpdate('available', ownerJid);
        } catch {}
    }, 25000);
    console.log('💓 Keep-alive actif (25s)');
}

// ─── BOT ──────────────────────────────────────────────────────────────────────
let sock           = null;
let reconnectTimer = null;
let pairingTimer   = null;
let isFirstStart   = true; // pour nettoyer l'auth seulement au 1er démarrage

async function connectToWhatsApp() {
    if (pairingTimer) { clearTimeout(pairingTimer); pairingTimer = null; }

    // ── ÉTAPE 1 : Restaurer ou nettoyer la session ─────────────────────────────
    const hasSession = restoreSessionFromEnv();

    if (!hasSession && isFirstStart) {
        // ✅ FIX CRITIQUE : Des credentials partiels d'une tentative précédente
        // dans auth_info_baileys causent le "Impossible de connecter l'appareil".
        // WhatsApp génère un code lié à ces vieux credentials corrompus.
        // Solution : toujours partir d'un état 100% propre si pas de SESSION_DATA.
        console.log('🧹 Nettoyage auth (démarrage propre sans SESSION_DATA)...');
        await fs.remove(AUTH_DIR).catch(() => {});
        fs.ensureDirSync(AUTH_DIR);
        console.log('✅ Auth dir propre → pairing code garanti valide');
    }
    isFirstStart = false;

    // ── ÉTAPE 2 : Initialiser Baileys ─────────────────────────────────────────
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version }          = await fetchLatestBaileysVersion();
    const needsPairing         = !state.creds.registered;

    console.log(`\n🚀 Baileys v${version.join('.')} | Numéro: +${PHONE_NUMBER} | Pairing requis: ${needsPairing}`);

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        // Ubuntu/Chrome = fingerprint standard reconnu par WhatsApp pour les notifs
        browser:                        ['Ubuntu', 'Chrome', '121.0.0.0'],
        markOnlineOnConnect:            true,
        generateHighQualityLinkPreview: true,
        syncFullHistory:                false,
        printQRInTerminal:              false,
        mobile:                         false,
        connectTimeoutMs:               60_000,
        defaultQueryTimeoutMs:          60_000,
        keepAliveIntervalMs:            30_000
    });
    global.sock = sock;

    // ── ÉTAPE 3 : Fonction de demande de pairing code ─────────────────────────
    async function requestCode(isRetry = false) {
        if (STATE.connected) return;
        try {
            console.log(isRetry
                ? '🔄 Renouvellement du pairing code...'
                : `🔑 Demande du pairing code pour +${PHONE_NUMBER}...`
            );

            // requestPairingCode envoie une requête aux serveurs WA qui :
            // 1. Génèrent un code temporaire (8 caractères)
            // 2. Envoient une notification PUSH sur le téléphone +PHONE_NUMBER
            const raw  = await sock.requestPairingCode(PHONE_NUMBER);
            const code = raw?.match(/.{1,4}/g)?.join('-') || raw || 'ERREUR';

            STATE.pairingCode = code;
            STATE.pairingAt   = Date.now();

            const bar = '═'.repeat(46);
            console.log(`\n╔${bar}╗`);
            console.log(`║  🔗 PAIRING CODE WHATSAPP VALIDE              ║`);
            console.log(`╠${bar}╣`);
            console.log(`║  CODE  : ${code.padEnd(36)}║`);
            console.log(`║  Pour  : +${PHONE_NUMBER.padEnd(35)}║`);
            console.log(`╠${bar}╣`);
            console.log(`║  📲 WhatsApp envoie une notification sur       ║`);
            console.log(`║     ton téléphone — entre le code dans 60s    ║`);
            console.log(`╚${bar}╝\n`);

            // Renouveler automatiquement après 55s si pas encore connecté
            if (pairingTimer) clearTimeout(pairingTimer);
            pairingTimer = setTimeout(() => requestCode(true), 55_000);

        } catch (e) {
            console.error('❌ Erreur pairing code:', e.message);
            if (!STATE.connected) {
                if (pairingTimer) clearTimeout(pairingTimer);
                pairingTimer = setTimeout(() => requestCode(false), 8_000);
            }
        }
    }

    // Exposer globalement pour !paircode
    global.requestPairingCode = (retry = false) => requestCode(retry);

    // ── ÉTAPE 4 : Événements de connexion ─────────────────────────────────────
    let pairingScheduled = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
            console.log('🔄 Connexion aux serveurs WhatsApp...');

            // Demander le pairing code UNE SEULE FOIS après que le WS est établi.
            // Le délai de 5s est nécessaire sur Render (connexion plus lente).
            if (needsPairing && !pairingScheduled && !STATE.connected) {
                pairingScheduled = true;
                if (pairingTimer) clearTimeout(pairingTimer);
                pairingTimer = setTimeout(() => requestCode(false), 5_000);
            }
        }

        if (connection === 'open') {
            STATE.connected   = true;
            STATE.pairingCode = null;
            STATE.user        = sock.user?.name || `+${sock.user?.id?.split(':')[0]}`;
            if (pairingTimer) { clearTimeout(pairingTimer); pairingTimer = null; }

            console.log(`\n✅ ${BOT_NAME} CONNECTÉ !`);
            console.log(`👤 Compte: ${STATE.user}`);

            loadCommands();
            startKeepAlive();
            await backupSession();
            setTimeout(sendWelcomeMsg, 2500);
        }

        if (connection === 'close') {
            STATE.connected  = false;
            pairingScheduled = false;
            if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }

            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Déconnecté (code ${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🗑️  Session révoquée — réinitialisation complète...');
                await fs.remove(AUTH_DIR).catch(() => {});
                fs.ensureDirSync(AUTH_DIR);
                STATE.pairingCode = null;
                STATE.retries++;
                isFirstStart = false; // ne pas re-clean (on vient de le faire)
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connectToWhatsApp, 3_000);
            } else {
                STATE.retries++;
                const delay = code === DisconnectReason.restartRequired ? 1_000 : 5_000;
                console.log(`🔄 Reconnexion dans ${delay / 1000}s...`);
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connectToWhatsApp, delay);
            }
        }
    });

    // ── ÉTAPE 5 : Sauvegarde des credentials ──────────────────────────────────
    sock.ev.on('creds.update', async (...a) => {
        saveCreds(...a);
        await backupSession();
    });

    // ── ÉTAPE 6 : Traitement des messages (owner uniquement) ──────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            let sender;
            if (msg.key.remoteJid?.endsWith('@g.us')) {
                sender = msg.key.participant || '';
            } else if (msg.key.fromMe) {
                sender = getOwnerJid();
            } else {
                sender = msg.key.remoteJid || '';
            }

            if (!sender || !isOwner(sender)) continue;

            const mtype = Object.keys(msg.message).find(k =>
                !['senderKeyDistributionMessage', 'messageContextInfo'].includes(k));
            let text = '';
            if (mtype === 'conversation')             text = msg.message.conversation || '';
            else if (mtype === 'extendedTextMessage') text = msg.message.extendedTextMessage?.text || '';
            else if (mtype === 'imageMessage')        text = msg.message.imageMessage?.caption || '';
            else if (mtype === 'videoMessage')        text = msg.message.videoMessage?.caption || '';
            else if (mtype === 'documentMessage')     text = msg.message.documentMessage?.caption || '';

            text = text.trim();
            if (!text.startsWith(PREFIX)) continue;

            const raw     = text.slice(PREFIX.length).trim();
            const parts   = raw.split(/\s+/);
            const rawCmd  = parts[0] || '';
            const args    = parts.slice(1);
            const cmdName = rawCmd.toLowerCase();
            const body    = raw.slice(rawCmd.length).trim();
            const jid     = msg.key.remoteJid;

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            console.log(`📩 [${new Date().toLocaleTimeString()}] ${PREFIX}${cmdName} | ${sender.split('@')[0]}`);

            try {
                await cmdEntry.handler({
                    sock, msg, sender, args, body, text, cmdName,
                    prefix: PREFIX, botName: BOT_NAME, startTime
                });
            } catch (e) {
                console.error(`❌ Cmd ${cmdName}:`, e.message);
                try {
                    await sock.sendMessage(jid, { text: `❌ Erreur *${PREFIX}${cmdName}*\n_${e.message}_` });
                } catch {}
            }
        }
    });
}

async function sendWelcomeMsg() {
    try {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(getOwnerJid(), {
            text: `╔══════════════════════════╗\n║   ✅ ${BOT_NAME} ACTIF  ║\n╠══════════════════════════╣\n║ 🤖 Connecté avec succès\n║ 💾 Session sauvegardée\n║ 💓 Keep-alive actif (25s)\n║ ⏱️  Uptime: ${uptime}\n╠══════════════════════════╣\n║ *!menu* — voir les commandes\n║ *!session* — exporter la session\n║ *!restart* — redémarrer le bot\n╚══════════════════════════╝`
        });
    } catch (e) {
        console.error('Erreur msg bienvenue:', e.message);
    }
}

console.log(`\n🤖 ${BOT_NAME} | Owner: +${OWNER_NUMBER} | Bot: +${PHONE_NUMBER} | Préfixe: ${PREFIX}`);
connectToWhatsApp();
