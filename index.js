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
const PREFIX     = process.env.PREFIX      || '!';
const BOT_NAME   = process.env.BOT_NAME    || 'ZENOS-MD-V3';
// PHONE_NUMBER = numéro WhatsApp du bot (avec indicatif, sans + ni espaces)
// Doit être défini dans les variables d'environnement Render
const PHONE_NUMBER = (process.env.PHONE_NUMBER || OWNER_NUMBER).replace(/[^0-9]/g, '');
const AUTH_DIR   = path.join(__dirname, 'auth_info_baileys');
const PORT       = process.env.PORT || 3000;
const startTime  = Date.now();
global.startTime = startTime;

// ─── Dossiers ────────────────────────────────────────────────────────────────
fs.ensureDirSync('./data');
fs.ensureDirSync(AUTH_DIR);
if (!fs.existsSync('./data/settings.json')) {
    fs.writeJsonSync('./data/settings.json',
        { theme: 'galaxy', prefix: '!', botName: BOT_NAME, language: 'fr' },
        { spaces: 2 });
}

process.on('uncaughtException',  err => console.error('[ERR]', err.message));
process.on('unhandledRejection', err => console.error('[REJ]', err?.message || err));

// ─── ÉTAT GLOBAL (visible dans la page web) ───────────────────────────────────
const STATE = {
    connected:        false,
    pairingCode:      null,
    pairingAt:        null,
    pairingRequested: false,  // garde-fou : on ne demande le code qu'une seule fois par session
    user:             null,
    retries:          0
};

// ─── SESSION PERSISTANTE ─────────────────────────────────────────────────────
function restoreSessionFromEnv() {
    const raw = process.env.SESSION_DATA;
    if (!raw) return false;
    try {
        const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
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

    // ── /session : génère le SESSION_DATA base64 à copier dans Render ─────────
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
.steps{color:#ccc;line-height:2;margin-top:20px}
</style></head>
<body><div class="box">
<h2>💾 SESSION_DATA — ${BOT_NAME}</h2>
<p style="color:#aaa;text-align:center">Copie cette valeur et colle-la dans la variable d'env <strong>SESSION_DATA</strong> sur Render.</p>
<textarea id="sd" readonly>${b64}</textarea>
<button onclick="navigator.clipboard.writeText(document.getElementById('sd').value).then(()=>this.textContent='✅ Copié !').catch(()=>{})">📋 Copier</button>
<div class="steps">
<strong>📦 Comment utiliser :</strong><br>
1️⃣ Copie la valeur ci-dessus<br>
2️⃣ Va dans ton service Render → <strong>Environment</strong><br>
3️⃣ Ajoute la variable : <code>SESSION_DATA</code> = valeur copiée<br>
4️⃣ Redémarre le service → le bot se reconnecte sans pairing code<br>
</div>
</div></body></html>`);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (STATE.connected) {
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#00ff88;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #00ff88;border-radius:12px;max-width:500px}
h1{font-size:2em;margin-bottom:10px}p{color:#aaa}
.badge{background:#00ff88;color:#000;padding:8px 20px;border-radius:20px;font-weight:bold;font-size:1.2em}</style></head>
<body><div class="box"><h1>✅ ${BOT_NAME}</h1>
<p>Bot connecté et opérationnel</p>
<p>👤 ${STATE.user || PHONE_NUMBER}</p>
<br><span class="badge">EN LIGNE</span>
<br><br><small style="color:#555">Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s</small></div></body></html>`);
    } else {
        const age     = STATE.pairingAt ? Math.floor((Date.now() - STATE.pairingAt) / 1000) : null;
        const expired = age !== null && age > 55;
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="10"><title>${BOT_NAME} — Connexion</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #5555ff;border-radius:12px;max-width:620px}
h1{color:#5555ff}
.code{font-size:2.8em;letter-spacing:10px;color:#ffdd00;background:#111;padding:20px 30px;border-radius:8px;margin:20px 0;border:2px dashed #ffdd00;word-break:break-all}
.steps{text-align:left;margin-top:20px;color:#ccc;line-height:2.2}
.expired{color:#ff4444;font-weight:bold}
.ok{color:#00ff88}
.warn{color:#ffaa00}</style></head>
<body><div class="box">
<h1>🤖 ${BOT_NAME}</h1>
<p>Numéro WhatsApp du bot : <strong>+${PHONE_NUMBER}</strong></p>
${STATE.pairingCode
    ? `<p>${expired
        ? '<span class="expired">⏰ Code expiré — nouveau code en cours...</span>'
        : '<span class="ok">✅ Code actif (valide ~60s)</span>'}</p>
       <div class="code">${STATE.pairingCode}</div>
       <p class="warn">⚠️ WhatsApp t'envoie une <strong>notification push</strong> sur ton téléphone<br>pour confirmer la connexion de l'appareil.</p>`
    : `<p>⏳ Connexion aux serveurs WhatsApp en cours...<br><small>(le code apparaîtra ici dans quelques secondes)</small></p>`}
<div class="steps">
<strong>📱 Comment coupler l'appareil :</strong><br>
1️⃣ Ouvre WhatsApp sur ton téléphone (+${PHONE_NUMBER})<br>
2️⃣ ⚙️ Paramètres → <strong>Appareils connectés</strong><br>
3️⃣ Appuie sur <strong>"Connecter un appareil"</strong><br>
4️⃣ En bas : <strong>"Coupler avec un numéro de téléphone"</strong><br>
5️⃣ Saisis le numéro <strong>+${PHONE_NUMBER}</strong><br>
6️⃣ Entre le code ci-dessus dans WhatsApp<br>
⚡ <span style="color:#ffdd00">Tu as 60 secondes après l'apparition du code !</span>
</div>
<br><small style="color:#444">Page auto-rafraîchie toutes les 10s | Tentative #${STATE.retries + 1}</small>
</div></body></html>`);
    }
}).listen(PORT, () => console.log(`\n🌐 Interface de connexion: http://localhost:${PORT}`));

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

async function connectToWhatsApp() {
    restoreSessionFromEnv();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version }          = await fetchLatestBaileysVersion();

    console.log(`\n🚀 Baileys v${version.join('.')} | Numéro bot: +${PHONE_NUMBER}`);

    // Réinitialiser le garde-fou de pairing pour cette nouvelle session
    STATE.pairingRequested = false;

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        // 'Baileys' comme browser est requis pour que WhatsApp accepte
        // le pairing code et envoie la notification push sur le téléphone
        browser:                        ['Baileys', 'Chrome', '3.0.0'],
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

    // ─── DEMANDE DU PAIRING CODE ──────────────────────────────────────────────
    // CORRECTION : on ne demande JAMAIS le code avec un timer aveugle.
    // On attend l'événement 'connection.update' avec connection === 'connecting'
    // pour s'assurer que le WebSocket avec les serveurs WhatsApp est établi,
    // puis on attend encore 5 secondes pour que le handshake soit terminé.
    // C'est la seule façon fiable sur Render (cold start lent).

    // Exposer globalement pour que !paircode puisse l'appeler
    global.requestPairingCode = (isRetry = false) => requestCode(isRetry);

    async function requestCode(isRetry = false) {
        if (STATE.connected) return;
        try {
            if (isRetry) {
                console.log('🔄 Nouveau code de couplage (le précédent a expiré)...');
            } else {
                console.log('🔑 Demande du code de couplage WhatsApp...');
            }

            const raw  = await sock.requestPairingCode(PHONE_NUMBER);
            const code = raw?.match(/.{1,4}/g)?.join('-') || raw || 'ERREUR';

            STATE.pairingCode = code;
            STATE.pairingAt   = Date.now();

            const bar = '═'.repeat(44);
            console.log(`\n╔${bar}╗`);
            console.log(`║  🔗 CODE DE COUPLAGE WHATSAPP              ║`);
            console.log(`╠${bar}╣`);
            console.log(`║  CODE :  ${code.padEnd(34)}║`);
            console.log(`║  Pour :  +${PHONE_NUMBER.padEnd(33)}║`);
            console.log(`╠${bar}╣`);
            console.log(`║  ⚠️  Tu as 60 secondes pour entrer le code    ║`);
            console.log(`║  📱 WhatsApp → Appareils connectés            ║`);
            console.log(`║  → "Coupler avec un numéro de téléphone"      ║`);
            console.log(`║  📲 WhatsApp t'envoie aussi une notification  ║`);
            console.log(`╚${bar}╝\n`);

            // Relancer un nouveau code après 55s si pas encore connecté
            if (pairingTimer) clearTimeout(pairingTimer);
            pairingTimer = setTimeout(() => requestCode(true), 55_000);

        } catch (e) {
            console.error('❌ Erreur pairing code:', e.message);
            if (!STATE.connected) {
                // Réessayer dans 8s (pas 10s pour être plus réactif)
                if (pairingTimer) clearTimeout(pairingTimer);
                pairingTimer = setTimeout(() => requestCode(false), 8_000);
            }
        }
    }

    // ─── CONNEXION UPDATE ─────────────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
            console.log('🔄 Connexion aux serveurs WhatsApp en cours...');

            // ✅ FIX PRINCIPAL : déclencher le pairing code ici, une seule fois,
            // après que le WebSocket est en train de se connecter.
            // Le délai de 5s laisse le temps au handshake TLS/WS de se terminer
            // avant d'envoyer la requête de pairing (critique sur Render).
            if (!state.creds.registered && !STATE.pairingRequested) {
                STATE.pairingRequested = true;
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
            STATE.connected        = false;
            STATE.pairingRequested = false;
            if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }

            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Déconnecté (code ${code})`);

            // Session invalide → effacer et recommencer
            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🗑️  Session révoquée — réinitialisation...');
                await fs.remove(AUTH_DIR).catch(() => {});
                STATE.pairingCode = null;
                STATE.retries++;
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

    // ─── SAVE CREDS ───────────────────────────────────────────────────────────
    sock.ev.on('creds.update', async (...a) => {
        saveCreds(...a);
        await backupSession();
    });

    // ─── MESSAGES ─────────────────────────────────────────────────────────────
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
