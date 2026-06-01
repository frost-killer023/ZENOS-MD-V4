const { randomInt, randomItem } = require('../lib/helper');

const blagues = [
    "Pourquoi les plongeurs plongent-ils toujours en arrière? Parce que sinon ils tomberaient dans le bateau! 😂",
    "Qu'est-ce qu'un canif? Un petit fien! 🤣",
    "Pourquoi Batman ne peut-il pas manger? Parce que Robin lui a mangé sa soupe! 😄",
    "Qu'est-ce qu'un crocodile qui surveille la cour? Un sac à dents! 😆",
    "Comment appelle-t-on un chat tombé dans un pot de peinture? Un chat-peint! 😂",
    "Pourquoi l'épouvantail a-t-il reçu un prix? Parce qu'il se débrouillait dans son domaine! 😄",
    "Que dit un nuage quand il rencontre un autre nuage? Brouillard! ☁️😂",
    "Pourquoi les poissons n'aiment pas l'ordinateur? Parce qu'ils ont peur du Net! 🐟💻",
    "Comment appelle-t-on un chat qui fait de la musique? Un chat-teur! 🎵",
    "Qu'est-ce qu'un caniche qui chante sous la pluie? Un bichon mouillé! 😁"
];

const facts = [
    "🦦 Les loutres de mer se tiennent par la patte pour ne pas se perdre en dormant!",
    "🐙 Les poulpes ont trois cœurs et leur sang est bleu!",
    "🌙 Il y a de l'eau sur la Lune sous forme de glace!",
    "🍯 Le miel ne se périme jamais — on a trouvé du miel vieux de 3000 ans dans des tombes égyptiennes!",
    "🐘 Les éléphants sont les seuls animaux qui ne peuvent pas sauter!",
    "🦋 Les papillons goûtent avec leurs pieds!",
    "🐬 Les dauphins ont des noms individuels et s'appellent entre eux!",
    "🌳 Un arbre peut envoyer des signaux chimiques pour avertir les autres arbres d'un danger!",
    "🧠 Le cerveau humain génère assez d'électricité pour alimenter une ampoule de 25W!",
    "🦑 Le calmar géant a les plus grands yeux du règne animal (30cm de diamètre)!",
    "🌊 Il y a plus de microplastiques dans l'océan que d'étoiles dans la Voie Lactée!",
    "🐝 Les abeilles peuvent reconnaître les visages humains!",
    "🦈 Les requins sont plus anciens que les arbres — ils existent depuis 450 millions d'ans!",
    "🌈 Un arc-en-ciel est en fait un cercle complet — on ne voit que la moitié depuis le sol!"
];

const citations = [
    '"La vie, c\'est comme une bicyclette, il faut avancer pour ne pas perdre l\'équilibre." — Einstein 💡',
    '"Le succès, c\'est tomber sept fois, se relever huit." — Proverbe japonais 🎌',
    '"Soyez le changement que vous voulez voir dans le monde." — Gandhi ✨',
    '"L\'imagination est plus importante que la connaissance." — Einstein 🧠',
    '"La seule façon de faire du bon travail est d\'aimer ce qu\'on fait." — Steve Jobs 💼',
    '"La simplicité est la sophistication suprême." — Leonard de Vinci 🎨',
    '"Un jour ou l\'autre, les gens réalisent que les choses importantes dans la vie ne sont pas des choses." — Art Buchwald 💫',
    '"La créativité, c\'est l\'intelligence qui s\'amuse." — Einstein 🎭',
    '"Ne vis pas dans le passé, n\'espère pas dans le futur, concentre-toi sur le présent." — Bouddha 🧘'
];

const FORTUNES = [
    "🌟 Une grande opportunité arrive bientôt. Sois prêt à la saisir!",
    "💫 Ta persévérance sera récompensée. Continue sur cette voie.",
    "🌙 Cette semaine apportera une surprise agréable.",
    "⚡ Ton prochain défi sera ta plus grande victoire.",
    "🍀 La chance favorise les esprits préparés — prépare-toi!",
    "🌈 Après chaque tempête, le soleil brille toujours plus fort.",
    "💎 La valeur ne réside pas dans ce qu'on a, mais dans ce qu'on est.",
    "🔥 Quelqu'un pense à toi en ce moment même.",
    "🌺 Un sourire offert aujourd'hui te reviendra multiplié.",
    "🦅 Tes ailes existent — il te reste à apprendre à t'en servir."
];

const HOROSCOPES = {
    belier:   { emoji: '♈', text: 'Journée dynamique! Tes projets avancent bien. Évite les conflits en fin de journée.' },
    taureau:  { emoji: '♉', text: 'Journée favorable aux finances. Une bonne nouvelle professionnelle en vue.' },
    gemeaux:  { emoji: '♊', text: 'Ta créativité explose aujourd\'hui! Excellent pour les projets artistiques.' },
    cancer:   { emoji: '♋', text: 'Émotions intenses. Prends soin de ta santé et de tes proches.' },
    lion:     { emoji: '♌', text: 'Tu rayonnes! Les autres t\'admirent. Profite de cette énergie.' },
    vierge:   { emoji: '♍', text: 'Journée de réflexion. Analyse avant d\'agir, c\'est ta force.' },
    balance:  { emoji: '♎', text: 'Harmonie relationnelle. Tes relations s\'épanouissent aujourd\'hui.' },
    scorpion: { emoji: '♏', text: 'Intuition au maximum. Fais confiance à ton instinct.' },
    sagittaire: { emoji: '♐', text: 'Aventure à l\'horizon! Un voyage ou une rencontre inattendue.' },
    capricorne: { emoji: '♑', text: 'Travail et discipline paient. Tes efforts seront reconnus.' },
    verseau:  { emoji: '♒', text: 'Originalité et innovation te distinguent. Ose être différent.' },
    poissons: { emoji: '♓', text: 'Sensibilité accrue. L\'art et la musique t\'apporteront la paix.' }
};

const TRUTH_QUESTIONS = [
    "Quel est ton plus grand secret que personne ne connaît?",
    "Quelle est la chose la plus embarrassante qui t'est arrivée?",
    "As-tu déjà menti à ton meilleur ami? Sur quoi?",
    "Quelle est ton application la plus honteux sur ton téléphone?",
    "Quel est ton crush du moment?",
    "Quelle est la chose la plus bizarre que tu aies jamais mangée?",
    "As-tu déjà triché lors d'un examen?",
    "Quel est ton défaut que tu ne veux pas admettre?",
    "Quelle est la chose la plus stupide que tu aies faite pour impressionner quelqu'un?",
    "Si tu pouvais effacer un souvenir, lequel serait-ce?"
];

const DARE_CHALLENGES = [
    "Envoie un message à la dernière personne de tes contacts sans regarder qui c'est!",
    "Dis 3 qualités à la prochaine personne que tu vois!",
    "Chante le premier refrain d'une chanson de ton choix en vocal!",
    "Écris 'Je suis le roi/la reine du monde' en statut pendant 5 minutes!",
    "Appelle un ami et dis-lui qu'il a gagné 1 million dans un rêve!",
    "Poste une photo de ton repas actuel sur ton statut!",
    "Envoie un emoji aléatoire à 3 personnes de tes contacts sans explication!",
    "Dis quelque chose en langue inventée pendant 30 secondes!",
    "Change ton nom de profil WhatsApp en ton surnom d'enfance pendant 10 minutes!",
    "Raconte une anecdote embarrassante en vocal!"
];

const WYR_QUESTIONS = [
    "Tu préfèrerais: Voler comme un oiseau OU Respirer sous l'eau comme un poisson?",
    "Tu préfèrerais: Être invisible OU Voyager dans le temps?",
    "Tu préfèrerais: Connaître le futur OU Changer le passé?",
    "Tu préfèrerais: Manger uniquement ce que tu aimes OU Manger santé mais sans goût?",
    "Tu préfèrerais: Parler toutes les langues OU Jouer de tous les instruments?",
    "Tu préfèrerais: Être très riche mais seul OU Pauvre mais entouré d'amis?",
    "Tu préfèrerais: Avoir la force de Superman OU La vitesse de Flash?",
    "Tu préfèrerais: Ne jamais dormir (sans fatigue) OU Dormir 20h/jour mais être toujours reposé?",
    "Tu préfèrerais: Lire dans les pensées OU Voir le futur?",
    "Tu préfèrerais: Être le meilleur cuisinier du monde OU Le meilleur musicien?"
];

const NHIE_PHRASES = [
    "Never have I ever... sauté les cours et menti à mes parents!",
    "Never have I ever... envoyé un message au mauvais destinataire!",
    "Never have I ever... mangé de la nourriture tombée par terre!",
    "Never have I ever... regardé le profil de quelqu'un pendant des heures!",
    "Never have I ever... fait semblant de ne pas voir quelqu'un pour l'éviter!",
    "Never have I ever... ri si fort que j'ai failli pleurer!",
    "Never have I ever... chanté à voix haute dans les transports en commun!",
    "Never have I ever... oublié l'anniversaire de quelqu'un d'important!"
];

const COMPLIMENTS = [
    "✨ Tu es une lumière dans la vie des gens autour de toi!",
    "🌟 Ton intelligence est impressionnante!",
    "💪 Ta détermination est une inspiration pour tous!",
    "🎨 Ta créativité est sans limite!",
    "💡 Tu as une façon unique de voir les choses qui est admirable!",
    "🌺 Ton sourire illumine tout autour de toi!",
    "🔥 Tu es plus fort que tu ne le penses!",
    "🌈 Ta présence rend tout meilleur!",
    "⭐ Tu fais partie de ces personnes rares qui changent les choses!",
    "🦁 Tu as le courage d'un lion et le cœur d'un ange!"
];

const SPIRIT_ANIMALS = [
    { animal: '🦅 Aigle', signif: 'Vision, liberté, leadership. Tu vois loin et tu guides les autres.' },
    { animal: '🐺 Loup', signif: 'Loyauté, instinct, famille. Tu protèges les tiens avec tout.' },
    { animal: '🦁 Lion', signif: 'Courage, dignité, force. Tu es né pour régner.' },
    { animal: '🐬 Dauphin', signif: 'Intelligence, jeu, harmonie. Tu apportes la joie partout.' },
    { animal: '🦊 Renard', signif: 'Ruse, adaptabilité, malice. Tu es toujours un coup d\'avance.' },
    { animal: '🦋 Papillon', signif: 'Transformation, beauté, légèreté. Tu évolues constamment.' },
    { animal: '🐉 Dragon', signif: 'Puissance, magie, sagesse ancienne. Tu es extraordinaire.' },
    { animal: '🦉 Hibou', signif: 'Sagesse, mystère, intuition. Tu vois dans l\'obscurité.' },
    { animal: '🐯 Tigre', signif: 'Passion, force, indépendance. Tu fonces sans hésiter.' },
    { animal: '🦚 Paon', signif: 'Beauté, fierté, confiance. Tu n\'as pas peur de briller.' }
];

const SUPERPOWERS = [
    "⚡ Contrôle de la foudre — tu peux invoquer et diriger l'électricité!",
    "🌊 Télékinésie aquatique — tu contrôles tous les liquides!",
    "🔥 Pyrokinésie — tu crées et contrôles le feu!",
    "🌪️ Aérokinésie — tu manipules le vent et l'air!",
    "🧲 Magnétokinésie — tu contrôles les métaux!",
    "⏰ Manipulation du temps — tu peux ralentir, arrêter ou rembobiner le temps!",
    "👁️ Clairvoyance — tu vois les événements futurs en rêve!",
    "🌙 Vol nocturne — tu peux voler mais seulement la nuit avec super-vitesse!",
    "🔄 Duplication — tu peux te cloner jusqu'à 10 copies!",
    "🎭 Mimétisme parfait — tu copies n'importe quelle capacité physique ou mentale!"
];

const AESTHETICS = {
    'a': 'ａ', 'b': 'ｂ', 'c': 'ｃ', 'd': 'ｄ', 'e': 'ｅ', 'f': 'ｆ',
    'g': 'ｇ', 'h': 'ｈ', 'i': 'ｉ', 'j': 'ｊ', 'k': 'ｋ', 'l': 'ｌ',
    'm': 'ｍ', 'n': 'ｎ', 'o': 'ｏ', 'p': 'ｐ', 'q': 'ｑ', 'r': 'ｒ',
    's': 'ｓ', 't': 'ｔ', 'u': 'ｕ', 'v': 'ｖ', 'w': 'ｗ', 'x': 'ｘ',
    'y': 'ｙ', 'z': 'ｚ', ' ': '　',
    '0': '０', '1': '１', '2': '２', '3': '３', '4': '４',
    '5': '５', '6': '６', '7': '７', '8': '８', '9': '９'
};

function toAesthetic(text) {
    return text.toLowerCase().split('').map(c => AESTHETICS[c] || c).join('');
}

function toZalgo(text) {
    const zalgoChars = ['̴','̵','̷','̸','̡','̢','̧','̨','͑','͒','͓','͔','͕','͖','͗','͘','͙','͚','͛','͜','͝','͞','͟','͠','͡'];
    return text.split('').map(c => {
        if (c === ' ') return c;
        const n = randomInt(1, 3);
        return c + Array.from({ length: n }, () => randomItem(zalgoChars)).join('');
    }).join('');
}

function mockText(text) {
    return text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
}

const commands = {
    // ─── JOKE ─────────────────────────────────────────────────────────────────
    joke: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `😂 *Blague du jour:*\n\n${randomItem(blagues)}` });
    },

    // ─── FACT ─────────────────────────────────────────────────────────────────
    fact: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `🤯 *Fait incroyable:*\n\n${randomItem(facts)}` });
    },

    // ─── QUOTE ────────────────────────────────────────────────────────────────
    quote: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `💬 *Citation:*\n\n${randomItem(citations)}` });
    },

    // ─── 8BALL ────────────────────────────────────────────────────────────────
    '8ball': async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Pose une question: !8ball Est-ce que je vais réussir?' });
        const reponses = [
            '✅ Oui, absolument!', '✅ Sans aucun doute!', '✅ Très probablement!',
            '✅ Les signes indiquent oui!', '🤔 C\'est peu probable...', '❌ Non.',
            '❌ Définitivement non!', '🔮 Les signes ne sont pas bons...', '⚡ Demande encore plus tard.',
            '🌟 L\'avenir le dira!', '💫 Concentre-toi et redemande.', '🎲 C\'est uncertain.'
        ];
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎱 *Question:* ${body}\n\n🔮 *La boule magique dit:*\n${randomItem(reponses)}`
        });
    },

    // ─── FLIP (pile ou face) ──────────────────────────────────────────────────
    flip: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🪙 *Pile ou Face?*\n\n→ ${Math.random() < 0.5 ? '🟡 PILE!' : '🔵 FACE!'}`
        });
    },

    // ─── DICE (dé simple) ─────────────────────────────────────────────────────
    dice: async ({ sock, msg }) => {
        const n = randomInt(1, 6);
        const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
        await sock.sendMessage(msg.key.remoteJid, { text: `🎲 *Dé lancé:* ${faces[n-1]} (*${n}*)` });
    },

    // ─── FORTUNE ──────────────────────────────────────────────────────────────
    fortune: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🥠 *FORTUNE COOKIE*\n\n${randomItem(FORTUNES)}\n\n_✨ Ton avenir est entre tes mains_`
        });
    },

    // ─── HOROSCOPE ────────────────────────────────────────────────────────────
    horoscope: async ({ sock, msg, args }) => {
        const sign = args[0]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const h = HOROSCOPES[sign];
        if (!h) {
            const signs = Object.keys(HOROSCOPES).join(', ');
            return sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Usage: *!horoscope <signe>*\n\nSignes disponibles:\n${signs}`
            });
        }
        const today = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `${h.emoji} *Horoscope — ${sign.charAt(0).toUpperCase() + sign.slice(1)}*\n📅 ${today}\n\n${h.text}`
        });
    },

    // ─── AESTHETIC TEXT ───────────────────────────────────────────────────────
    aesthetic: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !aesthetic <texte>' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✨ *Aesthetic Text:*\n\n${toAesthetic(body)}`
        });
    },

    // ─── CLAP TEXT ────────────────────────────────────────────────────────────
    clap: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !clap <texte>' });
        const clapped = body.split(' ').join(' 👏 ');
        await sock.sendMessage(msg.key.remoteJid, { text: `👏 ${clapped} 👏` });
    },

    // ─── VAPORWAVE TEXT ───────────────────────────────────────────────────────
    vaporwave: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !vaporwave <texte>' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🌊 *Vaporwave:*\n\n${toAesthetic(body)}\n\n｡◕‿◕｡ ✨`
        });
    },

    // ─── ZALGO TEXT (glitch) ──────────────────────────────────────────────────
    zalgo: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !zalgo <texte>' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `👾 *Glitch Text:*\n\n${toZalgo(body)}`
        });
    },

    // ─── MOCK TEXT ────────────────────────────────────────────────────────────
    mock: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !mock <texte>' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `😏 *mOcKiNg TeXt:*\n\n${mockText(body)}`
        });
    },

    // ─── TRUTH ────────────────────────────────────────────────────────────────
    truth: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎯 *VÉRITÉ*\n\n❓ ${randomItem(TRUTH_QUESTIONS)}\n\n_Réponds honnêtement! 😬_`
        });
    },

    // ─── DARE ─────────────────────────────────────────────────────────────────
    dare: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔥 *DÉFI*\n\n🎯 ${randomItem(DARE_CHALLENGES)}\n\n_Oses-tu? 😈_`
        });
    },

    // ─── WOULD YOU RATHER ─────────────────────────────────────────────────────
    wyr: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🤔 *TU PRÉFÈRERAIS...?*\n\n${randomItem(WYR_QUESTIONS)}\n\n_Impossible d'éviter — choisis! ⚡_`
        });
    },

    // ─── NEVER HAVE I EVER ────────────────────────────────────────────────────
    nhie: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🍺 *NEVER HAVE I EVER*\n\n${randomItem(NHIE_PHRASES)}\n\n_Qui a déjà fait ça? 😅_`
        });
    },

    // ─── COMPLIMENT ───────────────────────────────────────────────────────────
    compliment: async ({ sock, msg, body }) => {
        const target = body ? `*${body}*` : 'toi';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💌 *Compliment pour ${target}:*\n\n${randomItem(COMPLIMENTS)}`
        });
    },

    // ─── LOVE METER ───────────────────────────────────────────────────────────
    love_meter: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !love_meter <prénom>' });
        const score = randomInt(1, 100);
        const bar = '❤️'.repeat(Math.floor(score / 10)) + '🖤'.repeat(10 - Math.floor(score / 10));
        const comment = score >= 90 ? 'Amour absolu 💘' : score >= 70 ? 'C\'est sérieux! 💕' : score >= 50 ? 'C\'est bien parti 😊' : score >= 30 ? 'À travailler... 🤔' : 'Aïe 💔';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❤️‍🔥 *LOVE METER pour ${body}*\n\n${bar}\n\n💯 Score: *${score}%*\n💬 ${comment}`
        });
    },

    // ─── SPIRIT ANIMAL ────────────────────────────────────────────────────────
    spirit_animal: async ({ sock, msg }) => {
        const a = randomItem(SPIRIT_ANIMALS);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🌿 *TON ANIMAL SPIRITUEL*\n\n${a.animal}\n\n💫 ${a.signif}`
        });
    },

    // ─── SUPERPOWER ───────────────────────────────────────────────────────────
    superpower: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🦸 *TON SUPERPOUVOIR*\n\n${randomItem(SUPERPOWERS)}\n\n_Utilise-le avec sagesse! ⚡_`
        });
    },

    // ─── RANDOM (nombre aléatoire) ────────────────────────────────────────────
    random: async ({ sock, msg, args }) => {
        const min = parseInt(args[0]) || 1;
        const max = parseInt(args[1]) || 100;
        if (min >= max) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !random <min> <max>\nEx: !random 1 100' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎲 *Nombre aléatoire* (${min}–${max}): *${randomInt(min, max)}*`
        });
    },

    // ─── LOVE (compatibilité noms) ────────────────────────────────────────────
    love: async ({ sock, msg, args }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !love Prénom1 Prénom2' });
        const n1 = args[0], n2 = args[1];
        const score = randomInt(10, 100);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💘 *${n1} ❤️ ${n2}*\n\nCompatibilité: *${score}%*\n${'💗'.repeat(Math.floor(score / 10))}`
        });
    },

    // ─── REVERSE TEXT ─────────────────────────────────────────────────────────
    reverse: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !reverse <texte>' });
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔄 *Texte inversé:*\n\n${body.split('').reverse().join('')}`
        });
    },

    // ─── ROAST ────────────────────────────────────────────────────────────────
    roast: async ({ sock, msg, body }) => {
        const roasts = [
            "Tu es la preuve vivante qu'on peut survivre sans cerveau! 😂",
            "Si l'intelligence était de l'eau, tu aurais du mal à mouiller tes lèvres! 💧",
            "Tu n'es pas stupide, tu simules juste une intelligence artificielle à très faible budget! 🤖",
            "Ne t'inquiète pas, même une horloge arrêtée donne l'heure juste deux fois par jour! ⏰",
            "Tu es comme un WiFi public — tout le monde peut y accéder mais personne n'y fait confiance! 📡"
        ];
        const target = body ? `*${body}*` : 'toi';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔥 *Roast pour ${target}:*\n\n${randomItem(roasts)}\n\n_(C'est pour rire! 😂)_`
        });
    },

    // ─── ASCII ART ────────────────────────────────────────────────────────────
    ascii: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ascii <mot>' });
        const art = {
            'ok': '🆗 O K !',
            'yes': '✅ Y E S !',
            'no': '❌ N O !',
            'zenos': '╔══╗╔═╗╔╗╔ ╔═╗╔═╗\n║    ║╣ ║║║ ║ ║╚═╗\n╚══╝╚═╝╝╚╝ ╚═╝╚═╝',
            'fire': '🔥🔥🔥\n 🔥🔥\n  🔥'
        };
        const result = art[body.toLowerCase()] || body.toUpperCase().split('').join(' · ');
        await sock.sendMessage(msg.key.remoteJid, { text: `🎨 *ASCII:*\n\n${result}` });
    },

    // ─── ENCRYPT (simple XOR) ─────────────────────────────────────────────────
    encrypt: async ({ sock, msg, args, body }) => {
        const key = args[0];
        const text = body.replace(/^\S+\s*/, '').trim();
        if (!key || !text) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !encrypt <clé> <message>' });
        const encrypted = Buffer.from(text).toString('base64');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔐 *Chiffré (base64):*\n\n\`${encrypted}\`\n\n_Déchiffre avec: !decrypt <clé> <code>_`
        });
    },

    // ─── DECRYPT ──────────────────────────────────────────────────────────────
    decrypt: async ({ sock, msg, args, body }) => {
        const code = body.replace(/^\S+\s*/, '').trim();
        if (!code) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !decrypt <clé> <code_base64>' });
        try {
            const decrypted = Buffer.from(code, 'base64').toString('utf8');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🔓 *Déchiffré:*\n\n${decrypted}`
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Code invalide ou non encodé en base64' });
        }
    },

    // ─── STORY ────────────────────────────────────────────────────────────────
    story: async ({ sock, msg, body }) => {
        const perso = body || 'un héros mystérieux';
        const lieux = ['dans une forêt enchantée', 'sur une île perdue', 'dans une ville futuriste', 'au fond de l\'océan', 'sur une autre planète'];
        const actions = ['découvrit un artefact ancien', 'rencontra un ennemi redoutable', 'trouva un allié inattendu', 'déchiffra un mystère vieux de siècles', 'sauva le monde d\'une catastrophe imminente'];
        const fins = ['et devint une légende.', 'mais le vrai trésor était l\'amitié.', 'et l\'aventure ne faisait que commencer.', 'transformant à jamais l\'histoire.', 'prouvant que tout est possible.'];
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📖 *Micro-histoire:*\n\n${perso} ${randomItem(lieux)} ${randomItem(actions)} ${randomItem(fins)}\n\n_🖊️ By ZENOS-MD_`
        });
    },

    // ─── RIDDLE ───────────────────────────────────────────────────────────────
    riddle: async ({ sock, msg, prefix }) => {
        const riddles = [
            { q: 'J\'ai des dents mais je ne mords pas. Qui suis-je?', r: 'Un peigne' },
            { q: 'Plus je sèche, plus je suis mouillée. Qui suis-je?', r: 'Une serviette' },
            { q: 'J\'ai une tête mais pas de corps. Qui suis-je?', r: 'Un clou' },
            { q: 'Je parle sans bouche, j\'entends sans oreilles. Qui suis-je?', r: 'Un écho' }
        ];
        const r = randomItem(riddles);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🧩 *Devinette:*\n\n${r.q}\n\n_Type ||${r.r}|| pour voir la réponse (ou !reponse)_`
        });
    }
};

const aliases = {
    'blague':    'joke',
    'citation':  'quote',
    'fait':      'fact',
    'superpower_': 'superpower',
    'animal':    'spirit_animal',
    'dare_':     'dare',
    'truth_':    'truth',
    'wyr_':      'wyr',
    'mocking':   'mock',
    'vapo':      'vaporwave',
    'aest':      'aesthetic',
    'glitch':    'zalgo',
    'lovenombre':'love_meter'
};

module.exports = { commands, aliases };
