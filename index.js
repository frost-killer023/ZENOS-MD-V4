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
function restoreSessionFromEnv() {
    const raw = process.env.SESSION_DATA;
    if (!raw || !raw.trim()) return false;
    try {
        const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
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

    if (url === '/status' || url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: STATE.connected ? 'connected' : 'waiting',
            bot: BOT_NAME, phone: PHONE_NUMBER,
            user: STATE.user,
            uptime: Math.floor((Date.now() - startTime) / 1000),
            pairingCode: STATE.pairingCode,
            timestamp: new Date().toISOString()
        }));
    }

    if (url === '/session') {
        const b64 = global.sessionBase64 || null;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        if (!b64) {
            return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="5"><title>Session</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #5555ff;border-radius:12px;max-width:600px}</style></head>
<body><div class="box"><h2 style="color:#ffaa00">⏳ Pas encore de session</h2>
<p>Connecte d'abord le bot avec le code de couplage.</p></div></body></html>`);
        }
        return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Session — ${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{padding:40px;border:2px solid #00ff88;border-radius:12px;max-width:900px;width:90%}
h2{color:#00ff88;text-align:center}
textarea{width:100%;height:160px;background:#111;color:#ffdd00;border:1px solid #333;border-radius:6px;padding:12px;font-size:.8em;word-break:break-all;resize:vertical}
button{margin-top:12px;padding:10px 28px;background:#00ff88;color:#000;border:none;border-radius:6px;font-weight:bold;cursor:pointer}
.steps{color:#ccc;line-height:2;margin-top:20px}</style></head>
<body><div class="box">
<h2>💾 SESSION_DATA — ${BOT_NAME}</h2>
<textarea id="sd" readonly>${b64}</textarea>
<button onclick="navigator.clipboard.writeText(document.getElementById('sd').value).then(()=>this.textContent='✅ Copié!')">📋 Copier</button>
<div class="steps">1️⃣ Copie la valeur<br>2️⃣ Render → Environment → <code>SESSION_DATA</code><br>3️⃣ Redémarre → bot reconnecté sans code</div>
</div></body></html>`);
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    if (STATE.connected) {
        return res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#00ff88;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #00ff88;border-radius:12px;max-width:500px}
.badge{background:#00ff88;color:#000;padding:8px 20px;border-radius:20px;font-weight:bold;font-size:1.2em}</style></head>
<body><div class="box"><h1>✅ ${BOT_NAME}</h1>
<p style="color:#aaa">Bot connecté et opérationnel</p>
<p style="color:#aaa">👤 ${STATE.user || '+' + PHONE_NUMBER}</p>
<br><span class="badge">EN LIGNE</span>
<br><br><a href="/session" style="color:#00ff88">💾 Exporter session</a>
<br><small style="color:#555">Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s</small>
</div></body></html>`);
    }

    res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="6"><title>${BOT_NAME} — Connexion</title>
<style>
body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #5555ff;border-radius:12px;max-width:640px;width:92%}
h1{color:#5555ff;margin-bottom:6px}
.code{font-size:3em;letter-spacing:14px;color:#ffdd00;background:#111;padding:22px 30px;border-radius:10px;margin:22px 0;border:2px dashed #ffdd00;font-weight:bold}
.steps{text-align:left;margin-top:24px;color:#ccc;line-height:2.6;font-size:.95em}
.ok{color:#00ff88}.warn{color:#ffaa00}.exp{color:#ff4444}
</style></head>
<body><div class="box">
<h1>🤖 ${BOT_NAME}</h1>
<p style="color:#888">Numéro : <strong style="color:#fff">+${PHONE_NUMBER}</strong></p>
${STATE.pairingCode
    ? `<p class="ok">✅ Code de couplage actif</p>
       <div class="code">${STATE.pairingCode}</div>
       <p class="warn">📲 WhatsApp envoie une notification sur <strong>+${PHONE_NUMBER}</strong></p>`
    : `<p class="warn">⏳ Connexion à WhatsApp en cours…<br><small style="color:#555">Le code apparaît ici automatiquement (6s)</small></p>`}
<div class="steps">
<strong>📱 Étapes pour coupler :</strong><br>
1️⃣ Ouvre WhatsApp sur le téléphone <strong>+${PHONE_NUMBER}</strong><br>
2️⃣ ⚙️ <strong>Paramètres</strong> → <strong>Appareils connectés</strong><br>
3️⃣ Appuie <strong>Connecter un appareil</strong><br>
4️⃣ Choisis <strong>« Coupler avec un numéro de téléphone »</strong><br>
5️⃣ Saisis ton numéro <strong>+${PHONE_NUMBER}</strong><br>
6️⃣ Entre le code <strong style="color:#ffdd00">${STATE.pairingCode || '…'}</strong> ci-dessus<br>
</div>
<small style="color:#444">Rafraîchissement auto 6s · Tentative #${STATE.retries + 1}</small>
</div></body></html>`);
}).listen(PORT, () => console.log(`🌐 Interface: http://localhost:${PORT}`));

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
let isFirstStart   = true;

async function connectToWhatsApp() {
    // ── 1. Session ────────────────────────────────────────────────────────────
    const hasSession = restoreSessionFromEnv();

    if (!hasSession && isFirstStart) {
        console.log('🧹 Nettoyage auth_info_baileys (premier démarrage propre)…');
        await fs.remove(AUTH_DIR).catch(() => {});
        fs.ensureDirSync(AUTH_DIR);
    }
    isFirstStart = false;

    // ── 2. Init Baileys ───────────────────────────────────────────────────────
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version }          = await fetchLatestBaileysVersion();
    const needsPairing         = !state.creds.registered;

    console.log(`\n🚀 Baileys ${version.join('.')} | +${PHONE_NUMBER} | Code requis: ${needsPairing}`);

    sock = makeWASocket({
        version,
        logger:                         pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser:                        ['Ubuntu', 'Chrome', '121.0.0.0'],
        printQRInTerminal:              false,
        markOnlineOnConnect:            true,
        generateHighQualityLinkPreview: true,
        syncFullHistory:                false,
        mobile:                         false,
        connectTimeoutMs:               60_000,
        defaultQueryTimeoutMs:          60_000,
        keepAliveIntervalMs:            30_000,
        // Maintient la connexion WS vivante longuement.
        // Sans ça, Baileys ferme le socket après ~140s (refs épuisés),
        // ce qui invalide le code avant que l'utilisateur ait eu le temps de le saisir.
        qrTimeout:                      3_600_000
    });
    global.sock = sock;

    // ── 3. Demande du code de couplage ────────────────────────────────────────
    //
    // WA envoie un stanza « pair-device » en début de session.
    // Baileys émet en interne un événement { qr } pour signaler cela.
    // On intercepte ce signal pour appeler requestPairingCode au bon moment :
    //   • trop tôt (avant pair-device) → WA refuse avec code 401
    //   • au moment du signal pair-device → WA accepte ✅
    //
    // Le code est généré UNE SEULE FOIS par session.
    // Pas de régénération automatique : régénérer invalide l'ancien code
    // et l'utilisateur qui saisirait l'ancien obtiendrait une erreur.

    let codeRequested = false;

    async function demanderCode() {
        if (STATE.connected || codeRequested) return;
        codeRequested = true;
        try {
            console.log(`🔑 Demande code de couplage pour +${PHONE_NUMBER}…`);
            const raw  = await sock.requestPairingCode(PHONE_NUMBER);
            const code = raw?.match(/.{1,4}/g)?.join('-') || raw;

            STATE.pairingCode = code;
            STATE.pairingAt   = Date.now();

            const bar = '═'.repeat(48);
            console.log(`\n╔${bar}╗`);
            console.log(`║  🔗 CODE DE COUPLAGE WHATSAPP                    ║`);
            console.log(`╠${bar}╣`);
            console.log(`║  CODE  : ${code.padEnd(39)}║`);
            console.log(`║  POUR  : +${PHONE_NUMBER.padEnd(38)}║`);
            console.log(`╠${bar}╣`);
            console.log(`║  📲 Notification envoyée sur ton téléphone       ║`);
            console.log(`║  ⚡ Entre le code dans WhatsApp dès que possible ║`);
            console.log(`╚${bar}╝\n`);
        } catch (e) {
            console.error('❌ Erreur code de couplage:', e.message);
            codeRequested = false;
            // Réessai après 10s si toujours pas connecté
            if (!STATE.connected) {
                setTimeout(demanderCode, 10_000);
            }
        }
    }

    // Exposer pour !paircode
    global.requestPairingCode = () => { codeRequested = false; demanderCode(); };

    // ── 4. Événements connexion ───────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {

        // Signal interne Baileys : WA a envoyé pair-device → moment idéal
        // pour envoyer link_code_companion_reg.
        // On n'affiche rien — juste le déclencheur pour requestPairingCode.
        if (update.qr && needsPairing && !STATE.connected) {
            await demanderCode();
        }

        if (update.connection === 'connecting') {
            console.log('🔄 Connexion aux serveurs WhatsApp…');
        }

        if (update.connection === 'open') {
            STATE.connected   = true;
            STATE.pairingCode = null;
            STATE.user        = sock.user?.name || `+${sock.user?.id?.split(':')[0]}`;
            codeRequested     = true; // empêche toute nouvelle demande

            console.log(`\n✅ ${BOT_NAME} CONNECTÉ — ${STATE.user}`);
            loadCommands();
            startKeepAlive();
            await backupSession();
            setTimeout(sendWelcomeMsg, 2500);
        }

        if (update.connection === 'close') {
            STATE.connected = false;
            codeRequested   = false;
            if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }

            const code = update.lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Déconnecté (code ${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🗑️  Session révoquée — nettoyage et reconnexion…');
                await fs.remove(AUTH_DIR).catch(() => {});
                fs.ensureDirSync(AUTH_DIR);
                STATE.pairingCode = null;
                STATE.retries++;
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connectToWhatsApp, 3_000);
            } else {
                STATE.retries++;
                const delay = code === DisconnectReason.restartRequired ? 1_000 : 5_000;
                console.log(`🔄 Reconnexion dans ${delay / 1000}s…`);
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connectToWhatsApp, delay);
            }
        }
    });

    sock.ev.on('creds.update', async (...a) => {
        saveCreds(...a);
        await backupSession();
    });

    // ── 5. Messages ───────────────────────────────────────────────────────────
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
            const cmdName = rawCmd.toLowerCase();
            const args    = parts.slice(1);
            const body    = raw.slice(rawCmd.length).trim();
            const jid     = msg.key.remoteJid;

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            console.log(`📩 [${new Date().toLocaleTimeString()}] ${PREFIX}${cmdName} | ${sender.split('@')[0]}`);
            try {
                await cmdEntry.handler({ sock, msg, sender, args, body, text, cmdName, prefix: PREFIX, botName: BOT_NAME, startTime });
            } catch (e) {
                console.error(`❌ Cmd ${cmdName}:`, e.message);
                try { await sock.sendMessage(jid, { text: `❌ Erreur *${PREFIX}${cmdName}*\n_${e.message}_` }); } catch {}
            }
        }
    });
}

async function sendWelcomeMsg() {
    try {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(getOwnerJid(), {
            text: [
                `╔═══════════════════════════╗`,
                `║  ✅ ${BOT_NAME} ACTIF  ║`,
                `╠═══════════════════════════╣`,
                `║ 🤖 Connecté avec succès`,
                `║ 💾 Session sauvegardée`,
                `║ 💓 Keep-alive actif (25s)`,
                `║ ⏱️  Uptime: ${uptime}`,
                `╠═══════════════════════════╣`,
                `║ *!menu* — voir les commandes`,
                `║ *!session* — exporter session`,
                `║ *!restart* — redémarrer`,
                `╚═══════════════════════════╝`
            ].join('\n')
        });
    } catch (e) {
        console.error('Erreur welcome:', e.message);
    }
}

console.log(`\n🤖 ${BOT_NAME} | Owner: +${OWNER_NUMBER} | Bot: +${PHONE_NUMBER} | Préfixe: ${PREFIX}`);
connectToWhatsApp();
