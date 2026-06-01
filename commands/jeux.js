// ─── COMMANDES DE JEUX ───────────────────────────────────────────────────────
// Hangman, trivia, math, RPS, devinette, etc.

const { randomInt, randomItem } = require('../lib/helper');

// ─── État des parties en cours ────────────────────────────────────────────────
const hangmanGames = new Map();
const triviaGames  = new Map();
const mathGames    = new Map();
const rpsGames     = new Map();

// ─── Données ──────────────────────────────────────────────────────────────────
const MOTS_PENDUS = [
    'soleil', 'maison', 'jardin', 'papillon', 'voiture', 'elephant', 'musique',
    'montagne', 'ocean', 'château', 'dragon', 'pirate', 'chocolat', 'fantome',
    'ordinateur', 'bibliotheque', 'revolution', 'telephone', 'satellite', 'aventure',
    'dinosaure', 'magicien', 'pyramide', 'galaxie', 'volcan', 'dauphin', 'arc-en-ciel'
];

const TRIVIA_QUESTIONS = [
    { q: '🌍 Quelle est la capitale de la France?', a: 'paris', hint: 'C\'est aussi la ville de la Tour Eiffel' },
    { q: '🔢 Combien font 15 × 7?', a: '105', hint: 'C\'est entre 100 et 110' },
    { q: '🌊 Quel est le plus grand océan?', a: 'pacifique', hint: 'Il couvre plus de 165 millions km²' },
    { q: '🦁 Quel animal est appelé "roi de la jungle"?', a: 'lion', hint: 'Il rugit fort' },
    { q: '🍎 Quelle couleur peut être une pomme?', a: 'rouge', hint: 'Ou verte ou jaune' },
    { q: '🌙 Combien de jours dure une révolution de la Lune?', a: '28', hint: 'Environ un mois' },
    { q: '🎵 Combien de notes dans la gamme musicale?', a: '7', hint: 'Do ré mi...' },
    { q: '⚡ Qui a découvert l\'électricité (paratonnerre)?', a: 'franklin', hint: 'Benjamin ...' },
    { q: '🌡️ À quelle température l\'eau bout-elle (°C)?', a: '100', hint: 'Un nombre entier facile' },
    { q: '🦋 Combien de pattes a un insecte?', a: '6', hint: 'Moins que 8' },
    { q: '🏔️ Quel est le plus haut sommet du monde?', a: 'everest', hint: 'Mont ...' },
    { q: '🌈 Combien de couleurs dans l\'arc-en-ciel?', a: '7', hint: 'ROYGBIV' },
    { q: '🐋 Quel est le plus grand animal du monde?', a: 'baleine bleue', hint: 'Un mammifère marin' },
    { q: '☀️ Combien de planètes dans le système solaire?', a: '8', hint: 'Depuis 2006 (Pluton retiré)' },
    { q: '🧊 À quelle température l\'eau gèle-t-elle (°C)?', a: '0', hint: 'Zéro absolu (eau douce)' },
    { q: '🌍 Quel est le plus grand continent?', a: 'asie', hint: 'Il est à l\'est' },
    { q: '⚽ Combien de joueurs dans une équipe de foot?', a: '11', hint: 'Gardien + 10' },
    { q: '🎸 Combien de cordes a une guitare classique?', a: '6', hint: 'Mi La Ré Sol Si Mi' },
    { q: '🔬 Quelle lettre désigne la vitesse de la lumière?', a: 'c', hint: 'E=mc²' },
    { q: '🦅 Quelle est la vitesse max d\'un faucon pèlerin (km/h)?', a: '320', hint: 'C\'est le plus rapide' }
];

const PENDU_AFFICHAGE = [
    '```\n  _____\n |     |\n       |\n       |\n       |\n_______|\n```',
    '```\n  _____\n |     |\n O     |\n       |\n       |\n_______|\n```',
    '```\n  _____\n |     |\n O     |\n |     |\n       |\n_______|\n```',
    '```\n  _____\n |     |\n O     |\n/|     |\n       |\n_______|\n```',
    '```\n  _____\n |     |\n O     |\n/|\\    |\n       |\n_______|\n```',
    '```\n  _____\n |     |\n O     |\n/|\\    |\n/      |\n_______|\n```',
    '```\n  _____\n |     |\n O     |\n/|\\    |\n/ \\    |\n_______|\n```  ❌ PERDU!'
];

function buildWordDisplay(word, guessed) {
    return word.split('').map(c => (c === '-' ? '-' : guessed.has(c) ? c : '_')).join(' ');
}

// ─── COMMANDES ────────────────────────────────────────────────────────────────
const commands = {
    // ─── PENDU ────────────────────────────────────────────────────────────────
    pendu: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const word = randomItem(MOTS_PENDUS);
        hangmanGames.set(jid, {
            word, guessed: new Set(), errors: 0, maxErrors: 6, startTime: Date.now()
        });
        const display = buildWordDisplay(word, new Set());
        await sock.sendMessage(jid, {
            text: `🎮 *LE PENDU* — Partie lancée!\n\n${PENDU_AFFICHAGE[0]}\n\n📝 Mot: ${display}\n📏 ${word.length} lettres\n\n💡 Tape *!lettre <a>* pour proposer une lettre\n🔤 Tape *!motcomplet <mot>* pour deviner le mot\n❌ Tape *!stoppendu* pour abandonner\n⚠️ 6 erreurs max`
        });
    },

    lettre: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        const game = hangmanGames.get(jid);
        if (!game) return sock.sendMessage(jid, { text: '❌ Pas de partie en cours. Tape *!pendu* pour commencer.' });

        const letter = args[0]?.toLowerCase().replace(/[^a-z]/g, '')[0];
        if (!letter) return sock.sendMessage(jid, { text: '❌ Usage: !lettre <lettre>\nEx: !lettre a' });
        if (game.guessed.has(letter)) return sock.sendMessage(jid, { text: `⚠️ Tu as déjà proposé la lettre *${letter}*` });

        game.guessed.add(letter);
        const inWord = game.word.includes(letter);
        if (!inWord) game.errors++;

        const display = buildWordDisplay(game.word, game.guessed);
        const allFound = game.word.split('').filter(c => c !== '-').every(c => game.guessed.has(c));

        if (allFound) {
            hangmanGames.delete(jid);
            return sock.sendMessage(jid, { text: `🎉 *BRAVO!* Tu as trouvé le mot!\n\n✅ Le mot était: *${game.word.toUpperCase()}*\n⏱️ Temps: ${Math.floor((Date.now() - game.startTime) / 1000)}s\n❌ Erreurs: ${game.errors}/6` });
        }
        if (game.errors >= game.maxErrors) {
            hangmanGames.delete(jid);
            return sock.sendMessage(jid, { text: `${PENDU_AFFICHAGE[6]}\n\n💀 *Perdu!* Le mot était: *${game.word.toUpperCase()}*` });
        }

        const alreadyTried = [...game.guessed].join(', ');
        await sock.sendMessage(jid, {
            text: `${inWord ? '✅ Bonne lettre !' : `❌ *${letter.toUpperCase()}* n'est pas dans le mot`}\n\n${PENDU_AFFICHAGE[game.errors]}\n\n📝 ${display}\n\n🔤 Lettres essayées: ${alreadyTried}\n❌ Erreurs: ${game.errors}/${game.maxErrors}`
        });
    },

    motcomplet: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        const game = hangmanGames.get(jid);
        if (!game) return sock.sendMessage(jid, { text: '❌ Pas de partie en cours.' });
        const guess = args.join('').toLowerCase().trim();
        if (!guess) return sock.sendMessage(jid, { text: '❌ Usage: !motcomplet <mot>' });
        if (guess === game.word) {
            hangmanGames.delete(jid);
            return sock.sendMessage(jid, { text: `🎉 *CORRECT!* Le mot était bien *${game.word.toUpperCase()}*!\n⏱️ Temps: ${Math.floor((Date.now() - game.startTime) / 1000)}s` });
        } else {
            game.errors += 2;
            if (game.errors >= game.maxErrors) {
                hangmanGames.delete(jid);
                return sock.sendMessage(jid, { text: `${PENDU_AFFICHAGE[6]}\n\n❌ *Mauvaise réponse!* Le mot était: *${game.word.toUpperCase()}*` });
            }
            await sock.sendMessage(jid, { text: `❌ *${guess}* n'est pas le bon mot! (−2 vies)\nErreurs: ${game.errors}/${game.maxErrors}` });
        }
    },

    stoppendu: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const game = hangmanGames.get(jid);
        if (!game) return sock.sendMessage(jid, { text: '❌ Pas de partie en cours.' });
        hangmanGames.delete(jid);
        await sock.sendMessage(jid, { text: `🏳️ Partie abandonnée. Le mot était: *${game.word.toUpperCase()}*` });
    },

    // ─── TRIVIA ───────────────────────────────────────────────────────────────
    trivia: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const q = randomItem(TRIVIA_QUESTIONS);
        triviaGames.set(jid, { ...q, startTime: Date.now(), hintUsed: false });
        await sock.sendMessage(jid, {
            text: `🧠 *TRIVIA*\n\n${q.q}\n\n💡 Tape *!reponse <ta_réponse>*\n🔍 Tape *!indice* pour un indice (−50pts)\n⏰ 30 secondes!`
        });
        setTimeout(async () => {
            if (triviaGames.has(jid)) {
                const game = triviaGames.get(jid);
                triviaGames.delete(jid);
                try { await sock.sendMessage(jid, { text: `⏰ *Temps écoulé!* La réponse était: *${game.a.toUpperCase()}*` }); } catch {}
            }
        }, 30000);
    },

    reponse: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        const game = triviaGames.get(jid);
        if (!game) return sock.sendMessage(jid, { text: '❌ Pas de trivia en cours. Tape *!trivia* pour jouer.' });
        const rep = args.join(' ').toLowerCase().trim();
        const correct = game.a.toLowerCase().trim();
        triviaGames.delete(jid);
        if (rep.includes(correct) || correct.includes(rep)) {
            const time = Math.floor((Date.now() - game.startTime) / 1000);
            await sock.sendMessage(jid, { text: `✅ *CORRECT!* Bravo!\nRéponse: *${game.a.toUpperCase()}*\n⏱️ En ${time}s` });
        } else {
            await sock.sendMessage(jid, { text: `❌ *Mauvaise réponse!*\nTa réponse: ${rep}\nBonne réponse: *${game.a.toUpperCase()}*` });
        }
    },

    indice: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const game = triviaGames.get(jid);
        if (!game) return sock.sendMessage(jid, { text: '❌ Pas de trivia en cours.' });
        await sock.sendMessage(jid, { text: `🔍 *Indice:* ${game.hint}` });
        game.hintUsed = true;
    },

    // ─── MATH CHALLENGE ───────────────────────────────────────────────────────
    math: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const ops = ['+', '-', '*'];
        const op = randomItem(ops);
        let a, b, answer;
        if (op === '+') { a = randomInt(1, 200); b = randomInt(1, 200); answer = a + b; }
        else if (op === '-') { a = randomInt(10, 200); b = randomInt(1, a); answer = a - b; }
        else { a = randomInt(2, 50); b = randomInt(2, 20); answer = a * b; }
        mathGames.set(jid, { answer, startTime: Date.now() });
        await sock.sendMessage(jid, {
            text: `🔢 *DÉFI MATH*\n\nCombien font : *${a} ${op} ${b}* ?\n\n💬 Tape *!calc <réponse>*\n⏰ 20 secondes!`
        });
        setTimeout(async () => {
            if (mathGames.has(jid)) {
                mathGames.delete(jid);
                try { await sock.sendMessage(jid, { text: `⏰ *Temps écoulé!* La réponse était: *${answer}*` }); } catch {}
            }
        }, 20000);
    },

    rep: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        // Gérer math ET trivia avec !rep
        const mathGame = mathGames.get(jid);
        const triviaGame = triviaGames.get(jid);

        if (mathGame) {
            const guess = parseInt(args[0]);
            mathGames.delete(jid);
            const time = Math.floor((Date.now() - mathGame.startTime) / 1000);
            if (guess === mathGame.answer) {
                await sock.sendMessage(jid, { text: `✅ *CORRECT!* En ${time}s! La réponse est bien *${mathGame.answer}*` });
            } else {
                await sock.sendMessage(jid, { text: `❌ *Faux!* Tu as dit *${guess}*, la réponse était *${mathGame.answer}*` });
            }
        } else if (triviaGame) {
            const rep = args.join(' ').toLowerCase().trim();
            triviaGames.delete(jid);
            if (rep.includes(triviaGame.a.toLowerCase())) {
                await sock.sendMessage(jid, { text: `✅ *CORRECT!* La réponse est *${triviaGame.a.toUpperCase()}*` });
            } else {
                await sock.sendMessage(jid, { text: `❌ *Faux!* Bonne réponse: *${triviaGame.a.toUpperCase()}*` });
            }
        } else {
            await sock.sendMessage(jid, { text: '❌ Aucun jeu en cours. Essaie *!trivia* ou *!math*' });
        }
    },

    // ─── PIERRE PAPIER CISEAUX ────────────────────────────────────────────────
    pfc: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        const choices = ['pierre', 'papier', 'ciseaux'];
        const emojis  = { pierre: '🪨', papier: '📄', ciseaux: '✂️' };
        const playerChoice = args[0]?.toLowerCase();
        if (!choices.includes(playerChoice)) {
            return sock.sendMessage(jid, { text: '❌ Usage: !pfc <pierre|papier|ciseaux>' });
        }
        const botChoice = randomItem(choices);
        let result;
        if (playerChoice === botChoice) result = '🤝 *Égalité!*';
        else if (
            (playerChoice === 'pierre'  && botChoice === 'ciseaux') ||
            (playerChoice === 'papier'  && botChoice === 'pierre')  ||
            (playerChoice === 'ciseaux' && botChoice === 'papier')
        ) result = '🏆 *Tu GAGNES!*';
        else result = '🤖 *Bot gagne!*';
        await sock.sendMessage(jid, {
            text: `✊ *PIERRE PAPIER CISEAUX*\n\nTu: ${emojis[playerChoice]} ${playerChoice}\nBot: ${emojis[botChoice]} ${botChoice}\n\n${result}`
        });
    },

    // ─── DEVINETTE ────────────────────────────────────────────────────────────
    devinette: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const devinettes = [
            { q: 'J\'ai des dents mais je ne mords pas. Qui suis-je?', a: 'peigne', hint: 'Pour les cheveux' },
            { q: 'Plus je sèche, plus je suis mouillée. Qui suis-je?', a: 'serviette', hint: 'Dans la salle de bain' },
            { q: 'J\'ai une tête mais pas de corps. Qui suis-je?', a: 'clou', hint: 'En métal, pour accrocher' },
            { q: 'Je cours mais n\'ai pas de pieds. Je coule mais ne suis pas eau. Qui suis-je?', a: 'temps', hint: 'Abstract, invisible' },
            { q: 'Qu\'est-ce qu\'on met dans un verre mais qu\'on ne peut pas voir?', a: 'silence', hint: 'Ce que tu entends dans une bibliothèque' },
            { q: 'Je parle sans bouche, j\'entends sans oreilles. Qui suis-je?', a: 'echo', hint: 'Dans les montagnes' },
            { q: 'Plus on en retire, plus elle est grande. Qu\'est-ce que c\'est?', a: 'trou', hint: 'Dans le sol' }
        ];
        const dev = randomItem(devinettes);
        triviaGames.set(jid + '_dev', { ...dev, startTime: Date.now() });
        await sock.sendMessage(jid, {
            text: `🧩 *DEVINETTE*\n\n${dev.q}\n\n💬 Tape *!reponse <ta réponse>*\n🔍 Indice: *!indice*`
        });
    },

    // ─── VRAI OU FAUX ─────────────────────────────────────────────────────────
    vof: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const questions = [
            { q: 'Les chauves-souris sont aveugles.', a: 'faux', expl: 'Elles voient très bien, mais utilisent aussi l\'écholocation' },
            { q: 'La Grande Muraille de Chine est visible depuis l\'espace à l\'œil nu.', a: 'faux', expl: 'C\'est un mythe - elle est trop étroite' },
            { q: 'Les diamants sont la substance naturelle la plus dure.', a: 'vrai', expl: 'Score 10 sur l\'échelle de Mohs' },
            { q: 'L\'eau chaude gèle plus vite que l\'eau froide (effet Mpemba).', a: 'vrai', expl: 'C\'est le paradoxe de Mpemba' },
            { q: 'Le son voyage plus vite dans l\'air que dans l\'eau.', a: 'faux', expl: 'Le son va 4x plus vite dans l\'eau' },
            { q: 'Les humains ont plus de 5 sens.', a: 'vrai', expl: 'On en a environ 9-21 (équilibre, proprioception...)' },
            { q: 'La foudre ne frappe jamais deux fois au même endroit.', a: 'faux', expl: 'Elle frappe souvent les mêmes endroits (paratonnerres)' }
        ];
        const q = randomItem(questions);
        triviaGames.set(jid + '_vof', { a: q.a, expl: q.expl, startTime: Date.now() });
        await sock.sendMessage(jid, {
            text: `✅❌ *VRAI OU FAUX?*\n\n*"${q.q}"*\n\n💬 Tape *!vrai* ou *!faux*`
        });
    },

    vrai: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const game = triviaGames.get(jid + '_vof');
        if (!game) return sock.sendMessage(jid, { text: '❌ Tape *!vof* pour jouer.' });
        triviaGames.delete(jid + '_vof');
        if (game.a === 'vrai') {
            await sock.sendMessage(jid, { text: `✅ *CORRECT!* C'est VRAI!\n\n📚 ${game.expl}` });
        } else {
            await sock.sendMessage(jid, { text: `❌ *Faux!* C'est ${game.a.toUpperCase()}\n\n📚 ${game.expl}` });
        }
    },

    faux: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const game = triviaGames.get(jid + '_vof');
        if (!game) return sock.sendMessage(jid, { text: '❌ Tape *!vof* pour jouer.' });
        triviaGames.delete(jid + '_vof');
        if (game.a === 'faux') {
            await sock.sendMessage(jid, { text: `✅ *CORRECT!* C'est FAUX!\n\n📚 ${game.expl}` });
        } else {
            await sock.sendMessage(jid, { text: `❌ *Faux!* C'est ${game.a.toUpperCase()}\n\n📚 ${game.expl}` });
        }
    },

    // ─── OUI OU NON ───────────────────────────────────────────────────────────
    ouinon: async ({ sock, msg }) => {
        const choices = ['✅ *OUI*', '❌ *NON*', '🤔 *Peut-être*', '🎱 *Sans aucun doute*', '⚡ *Absolument pas*', '🌟 *Très probablement*'];
        await sock.sendMessage(msg.key.remoteJid, { text: `🎲 La réponse est : ${randomItem(choices)}` });
    },

    // ─── CHIFFRE MYSTERE ──────────────────────────────────────────────────────
    chiffre: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const target = randomInt(1, 100);
        rpsGames.set(jid, { type: 'number', target, attempts: 0, maxAttempts: 7, startTime: Date.now() });
        await sock.sendMessage(jid, {
            text: `🔢 *CHIFFRE MYSTÈRE*\n\nJ'ai choisi un nombre entre 1 et 100.\nTu as 7 tentatives pour le trouver!\n\n💬 Tape *!guess <nombre>*`
        });
    },

    guess: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        const game = rpsGames.get(jid);
        if (!game || game.type !== 'number') return sock.sendMessage(jid, { text: '❌ Tape *!chiffre* pour jouer.' });

        const n = parseInt(args[0]);
        if (isNaN(n)) return sock.sendMessage(jid, { text: '❌ Donne un nombre valide' });

        game.attempts++;
        if (n === game.target) {
            rpsGames.delete(jid);
            return sock.sendMessage(jid, { text: `🎉 *TROUVÉ!* C'était bien *${game.target}*!\nTentatives: ${game.attempts}/${game.maxAttempts}` });
        }
        if (game.attempts >= game.maxAttempts) {
            rpsGames.delete(jid);
            return sock.sendMessage(jid, { text: `❌ *Perdu!* Le nombre était *${game.target}*` });
        }
        const hint = n < game.target ? '📈 Plus grand!' : '📉 Plus petit!';
        await sock.sendMessage(jid, { text: `${hint}\nTentatives restantes: ${game.maxAttempts - game.attempts}` });
    },

    // ─── COMPATIBILITÉ ────────────────────────────────────────────────────────
    compat: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !compat Prénom1 Prénom2' });
        const score = randomInt(1, 100);
        const emoji = score >= 80 ? '💘' : score >= 60 ? '💕' : score >= 40 ? '😐' : '💔';
        const comment = score >= 80 ? 'Un amour parfait!' : score >= 60 ? 'Ça peut marcher!' : score >= 40 ? 'Mitigé...' : 'Incompatibles!';
        const names = body.split(/\s+/);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `${emoji} *COMPATIBILITÉ*\n\n${names[0] || '?'} ❤️ ${names[1] || '?'}\n\n💯 Score: *${score}%*\n🗣️ ${comment}\n${'█'.repeat(Math.floor(score / 10))}${'░'.repeat(10 - Math.floor(score / 10))} ${score}%`
        });
    },

    // ─── SORT (qui fait quoi) ─────────────────────────────────────────────────
    sort: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !sort prénom1, prénom2, prénom3...\nEx: !sort Zara, Lucas, Emma' });
        const names = body.split(/[,\s]+/).filter(n => n.trim());
        if (names.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Donne au moins 2 prénoms' });
        const shuffled = [...names].sort(() => Math.random() - 0.5);
        const result = shuffled.map((n, i) => `${i + 1}. ${n.trim()}`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, { text: `🎲 *TIRAGE AU SORT*\n\n${result}` });
    },

    // ─── JEUX MENU ────────────────────────────────────────────────────────────
    jeux: async ({ sock, msg, prefix }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎮 *COMMANDES DE JEUX*\n${'━'.repeat(30)}\n\n🎯 *Jeux de connaissance*\n• *${prefix}trivia* — Question culture générale\n• *${prefix}vof* — Vrai ou Faux\n• *${prefix}devinette* — Devinette à résoudre\n• *${prefix}math* — Défi mathématique\n\n🎲 *Jeux interactifs*\n• *${prefix}pendu* — Le jeu du pendu\n• *${prefix}chiffre* — Deviner le nombre (1-100)\n• *${prefix}pfc* — Pierre Feuille Ciseaux\n• *${prefix}ouinon* — Oui ou Non?\n\n😄 *Jeux sociaux*\n• *${prefix}compat Prénom1 Prénom2* — Compatibilité\n• *${prefix}sort nom1, nom2...* — Tirage au sort\n\n💬 *Commandes de réponse*\n• *${prefix}reponse <réponse>*\n• *${prefix}rep <réponse>*\n• *${prefix}lettre <lettre>* (pendu)\n• *${prefix}guess <nombre>* (chiffre)`
        });
    }
};

const aliases = {
    'hangman':  'pendu',
    'rps':      'pfc',
    'game':     'jeux',
    'games':    'jeux',
    'deviner':  'chiffre',
    'number':   'chiffre',
    'question': 'trivia',
    'quiz':     'trivia',
    'devine':   'devinette'
};

module.exports = { commands, aliases };
