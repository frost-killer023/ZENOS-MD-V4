const { randomInt } = require('../lib/helper');
const axios  = require('axios');
const crypto = require('crypto');

// ─── TABLE MORSE ──────────────────────────────────────────────────────────────
const MORSE = {
    a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',j:'.---',
    k:'-.-',l:'.-..',m:'--',n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',s:'...',t:'-',
    u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
    '6':'-....','7':'--...','8':'---..','9':'----.','.':'.-.-.-',',':'--..--',
    '?':'..--..','!':'-.-.--',' ':'/'
};
const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

// ─── CALCUL SÉCURISÉ ──────────────────────────────────────────────────────────
function safeEval(expr) {
    const clean = expr.replace(/[^0-9+\-*/().%\s]/g, '');
    if (!clean) throw new Error('Expression invalide');
    return Function('"use strict"; return (' + clean + ')')();
}

const commands = {
    // ─── CALC ─────────────────────────────────────────────────────────────────
    calc: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !calc <expression>\nEx: !calc 5*8+2 · !calc (100-25)/5' });
        try {
            const result = safeEval(body);
            if (isNaN(result) || !isFinite(result)) throw new Error('Résultat invalide');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🧮 *Calculatrice*\n\n📝 ${body}\n✅ = *${result}*`
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Expression invalide!\nEx: !calc 5*8+2' });
        }
    },

    // ─── PASSWORD ─────────────────────────────────────────────────────────────
    password: async ({ sock, msg, args }) => {
        const len = Math.min(Math.max(parseInt(args[0]) || 16, 8), 64);
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const pwd = Array.from({ length: len }, () => charset[randomInt(0, charset.length - 1)]).join('');
        const strength = len >= 20 ? '💪 Fort' : len >= 14 ? '✅ Bon' : '⚠️ Moyen';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔐 *Mot de passe généré (${len} caractères):*\n\n\`${pwd}\`\n\n${strength}`
        });
    },

    // ─── BMI ──────────────────────────────────────────────────────────────────
    bmi: async ({ sock, msg, args }) => {
        const [poids, taille] = args.map(parseFloat);
        if (!poids || !taille || taille < 0.5 || taille > 3)
            return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !bmi <poids_kg> <taille_m>\nEx: !bmi 70 1.75' });
        const imc = (poids / (taille * taille)).toFixed(1);
        const cat = imc < 18.5 ? '⚠️ Insuffisance pondérale' : imc < 25 ? '✅ Poids normal' : imc < 30 ? '⚠️ Surpoids' : '❌ Obésité';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `⚖️ *Indice de Masse Corporelle*\n\nPoids: ${poids} kg | Taille: ${taille} m\n\n📊 IMC: *${imc}*\n🏷️ Catégorie: ${cat}`
        });
    },

    // ─── AGE ──────────────────────────────────────────────────────────────────
    age: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !age <JJ/MM/AAAA>\nEx: !age 15/03/2000' });
        const [d, m, y] = body.split('/').map(Number);
        const birth = new Date(y, m - 1, d);
        if (isNaN(birth.getTime())) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Date invalide. Format: JJ/MM/AAAA' });
        const now = new Date();
        let years = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) { years--; months += 12; }
        const days = Math.floor((now - birth) / 86400000);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎂 *Calcul d'âge*\n\n📅 Née le: ${body}\n\n🔢 Âge: *${years} ans et ${Math.abs(months)} mois*\n📆 Jours vécus: *${days.toLocaleString('fr-FR')}*\n⏰ Prochains: ${m === now.getMonth() + 1 && d > now.getDate() ? `dans ${d - now.getDate()} jours` : 'cette année passé'}`
        });
    },

    // ─── PERCENTAGE ───────────────────────────────────────────────────────────
    percentage: async ({ sock, msg, args }) => {
        const x = parseFloat(args[0]), y = parseFloat(args[1]);
        if (isNaN(x) || isNaN(y) || y === 0)
            return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !percentage <x> <y>\nEx: !percentage 30 150 → x% de y' });
        const pct = ((x / y) * 100).toFixed(2);
        const xOfY = ((x * y) / 100).toFixed(2);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📊 *Calcul de pourcentage*\n\n• ${x} est *${pct}%* de ${y}\n• ${x}% de ${y} = *${xOfY}*`
        });
    },

    // ─── PALINDROME ───────────────────────────────────────────────────────────
    palindrome: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !palindrome <texte>' });
        const clean = body.toLowerCase().replace(/[^a-zàâäéèêëïîôùûü]/g, '');
        const isPalin = clean === clean.split('').reverse().join('');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔤 *Palindrome?*\n\nTexte: "${body}"\n\nRésultat: ${isPalin ? '✅ *OUI* — c\'est un palindrome!' : '❌ *NON* — pas un palindrome'}`
        });
    },

    // ─── COUNT ────────────────────────────────────────────────────────────────
    count: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !count <texte>' });
        const words = body.trim().split(/\s+/).length;
        const chars = body.length;
        const noSpaces = body.replace(/\s/g, '').length;
        const sentences = (body.match(/[.!?]+/g) || []).length;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📏 *Statistiques du texte*\n\n📝 Mots: *${words}*\n🔤 Caractères (total): *${chars}*\n🔡 Caractères (sans espaces): *${noSpaces}*\n📄 Phrases: *${sentences || 1}*`
        });
    },

    // ─── UPPER ────────────────────────────────────────────────────────────────
    upper: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !upper <texte>' });
        await sock.sendMessage(msg.key.remoteJid, { text: `🔠 ${body.toUpperCase()}` });
    },

    // ─── LOWER ────────────────────────────────────────────────────────────────
    lower: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !lower <texte>' });
        await sock.sendMessage(msg.key.remoteJid, { text: `🔡 ${body.toLowerCase()}` });
    },

    // ─── WORDCOUNT ────────────────────────────────────────────────────────────
    wordcount: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !wordcount <texte>' });
        const words = body.trim().split(/\s+/);
        const freq = {};
        words.forEach(w => { const k = w.toLowerCase(); freq[k] = (freq[k] || 0) + 1; });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, n]) => `• "${w}": ${n}x`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📊 *Compteur de mots*\n\nTotal: *${words.length}* mots\n\n🏆 Top mots:\n${top}`
        });
    },

    // ─── ENCODE64 ─────────────────────────────────────────────────────────────
    encode64: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !encode64 <texte>' });
        const encoded = Buffer.from(body, 'utf8').toString('base64');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔐 *Base64 (encodé):*\n\n\`${encoded}\``
        });
    },

    // ─── DECODE64 ─────────────────────────────────────────────────────────────
    decode64: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !decode64 <code_base64>' });
        try {
            const decoded = Buffer.from(body.trim(), 'base64').toString('utf8');
            await sock.sendMessage(msg.key.remoteJid, { text: `🔓 *Base64 (décodé):*\n\n${decoded}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Code base64 invalide' });
        }
    },

    // ─── HEX ──────────────────────────────────────────────────────────────────
    hex: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !hex <texte>' });
        const hexStr = Buffer.from(body, 'utf8').toString('hex').match(/.{2}/g).join(' ');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔢 *Hexadécimal:*\n\nTexte: "${body}"\nHex: \`${hexStr}\``
        });
    },

    // ─── BINARY ───────────────────────────────────────────────────────────────
    binary: async ({ sock, msg, body }) => {
        if (!body || body.length > 50) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !binary <texte> (max 50 chars)' });
        const bin = body.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💻 *Binaire:*\n\nTexte: "${body}"\nBin: \`${bin}\``
        });
    },

    // ─── MORSE ────────────────────────────────────────────────────────────────
    morse: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !morse <texte>' });
        const code = body.toLowerCase().split('').map(c => MORSE[c] || c).join(' ');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📡 *Code Morse:*\n\nTexte: "${body}"\nMorse: \`${code}\``
        });
    },

    // ─── UNMORSE ──────────────────────────────────────────────────────────────
    unmorse: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !unmorse <code morse>\nEx: !unmorse .... . .-.. .-.. ---' });
        const text = body.split(' / ').map(word =>
            word.split(' ').map(c => MORSE_REVERSE[c] || '?').join('')
        ).join(' ');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📡 *Morse → Texte:*\n\nMorse: "${body}"\nTexte: *${text.toUpperCase()}*`
        });
    },

    // ─── UUID ─────────────────────────────────────────────────────────────────
    uuid: async ({ sock, msg }) => {
        const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔑 *UUID généré:*\n\n\`${id}\``
        });
    },

    // ─── HASH ─────────────────────────────────────────────────────────────────
    hash: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !hash <texte>' });
        const md5  = crypto.createHash('md5').update(body).digest('hex');
        const sha1 = crypto.createHash('sha1').update(body).digest('hex');
        const sha256 = crypto.createHash('sha256').update(body).digest('hex');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `#️⃣ *Hachage de:* "${body}"\n\nMD5:    \`${md5}\`\nSHA-1:  \`${sha1}\`\nSHA-256:\`${sha256}\``
        });
    },

    // ─── TRANSLATE ────────────────────────────────────────────────────────────
    translate: async ({ sock, msg, args, body }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Usage: !translate <lang> <texte>\nCodes: en=anglais, es=espagnol, ar=arabe, de=allemand, zh=chinois\nEx: !translate en Bonjour tout le monde'
        });
        const lang = args[0];
        const text = args.slice(1).join(' ');
        try {
            const res = await axios.get(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|${lang}`,
                { timeout: 10000 }
            );
            const translated = res.data?.responseData?.translatedText;
            if (!translated) throw new Error('Pas de traduction');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🌐 *Traduction fr → ${lang}*\n\n📝 Original: ${text}\n✅ Traduit: *${translated}*`
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur de traduction. Code de langue valide: en, es, ar, de, zh, pt, ru...' });
        }
    },

    // ─── DEFINE ───────────────────────────────────────────────────────────────
    define: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !define <mot>' });
        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(body)}`, { timeout: 8000 });
            const entry = res.data?.[0];
            const def = entry?.meanings?.[0]?.definitions?.[0]?.definition;
            const type = entry?.meanings?.[0]?.partOfSpeech;
            const phonetic = entry?.phonetic || '';
            if (!def) throw new Error('Aucune définition');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `📖 *Définition: "${body}"*\n\n🔤 Prononciation: ${phonetic}\n📌 Classe: ${type || 'N/A'}\n\n📝 ${def}`
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Définition introuvable pour "${body}"` });
        }
    },

    // ─── TEMPCONV ─────────────────────────────────────────────────────────────
    tempconv: async ({ sock, msg, args }) => {
        const val = parseFloat(args[0]);
        const unit = args[1]?.toLowerCase();
        if (isNaN(val) || !unit) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !tempconv <valeur> <c|f|k>\nEx: !tempconv 100 c' });
        let c, f, k;
        if (unit === 'c') { c = val; f = c * 9/5 + 32; k = c + 273.15; }
        else if (unit === 'f') { f = val; c = (f - 32) * 5/9; k = c + 273.15; }
        else if (unit === 'k') { k = val; c = k - 273.15; f = c * 9/5 + 32; }
        else return sock.sendMessage(msg.key.remoteJid, { text: '❌ Unité invalide. Utilise: c (Celsius), f (Fahrenheit), k (Kelvin)' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🌡️ *Conversion de température*\n\n🌡️ Celsius:    *${c.toFixed(2)}°C*\n🌡️ Fahrenheit: *${f.toFixed(2)}°F*\n🌡️ Kelvin:     *${k.toFixed(2)} K*`
        });
    },

    // ─── SHORTURL ─────────────────────────────────────────────────────────────
    shorturl: async ({ sock, msg, body }) => {
        if (!body || !body.startsWith('http')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !shorturl <url>\nEx: !shorturl https://www.google.com' });
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(body)}`, { timeout: 8000 });
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔗 *URL raccourcie:*\n\n📎 Original: ${body.slice(0, 60)}...\n✅ Court: *${res.data}*`
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de raccourcir cette URL' });
        }
    },

    // ─── COLOR ────────────────────────────────────────────────────────────────
    color: async ({ sock, msg, body }) => {
        let hex = (body || '').replace('#', '').trim();
        if (!hex) {
            hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
        }
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !color <hex>\nEx: !color FF5733' });
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎨 *Couleur #${hex.toUpperCase()}*\n\nRGB: rgb(${r}, ${g}, ${b})\nLuminosité: ${(lum * 100).toFixed(0)}%\n🌑 Sombre: ${lum < 0.5 ? 'Oui' : 'Non'}`
        });
    }
};

const aliases = {
    'calculer':  'calc',
    'calcul':    'calc',
    'mdp':       'password',
    'imc':       'bmi',
    'age_':      'age',
    'pourcent':  'percentage',
    'chars':     'count',
    'b64enc':    'encode64',
    'b64dec':    'decode64',
    'hexa':      'hex',
    'bin':       'binary',
    'translate_':'translate',
    'traduction':'translate',
    'def':       'define',
    'couleur':   'color',
    'temp':      'tempconv',
    'url':       'shorturl'
};

module.exports = { commands, aliases };
