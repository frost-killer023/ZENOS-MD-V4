const { readJson, writeJson, getDataPath, randomInt, getSenderNumber } = require('../lib/helper');

function getEconomy() {
    return readJson(getDataPath('economy.json'));
}
function saveEconomy(data) {
    writeJson(getDataPath('economy.json'), data);
}

function getAccount(economy, jid) {
    if (!economy[jid]) {
        economy[jid] = { wallet: 500, bank: 0, bankCapacity: 5000, lastBonus: 0, tictactoe: null };
    }
    return economy[jid];
}

const commands = {
    myecon: async ({ sock, msg, sender }) => {
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        saveEconomy(eco);
        const text = `💰 *Portefeuille de ${sender.replace('@s.whatsapp.net', '')}*\n\n` +
            `👛 Portefeuille: *${acc.wallet.toLocaleString()} 💵*\n` +
            `🏦 Banque: *${acc.bank.toLocaleString()} / ${acc.bankCapacity.toLocaleString()} 💵*\n` +
            `📊 Total: *${(acc.wallet + acc.bank).toLocaleString()} 💵*`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    },

    depot: async ({ sock, msg, sender, args }) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !depot <montant>' });
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        if (acc.wallet < amount) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Fonds insuffisants! Portefeuille: ${acc.wallet} 💵` });
        if (acc.bank + amount > acc.bankCapacity) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Capacité banque dépassée! Disponible: ${acc.bankCapacity - acc.bank} 💵` });
        acc.wallet -= amount;
        acc.bank += amount;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Dépôt effectué!*\n💵 +${amount} en banque\n👛 Portefeuille: ${acc.wallet}\n🏦 Banque: ${acc.bank}` });
    },

    retrait: async ({ sock, msg, sender, args }) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !retrait <montant>' });
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        if (acc.bank < amount) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Fonds insuffisants en banque! Banque: ${acc.bank} 💵` });
        acc.wallet += amount;
        acc.bank -= amount;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Retrait effectué!*\n💵 +${amount} dans le portefeuille\n👛 Portefeuille: ${acc.wallet}\n🏦 Banque: ${acc.bank}` });
    },

    bonus: async ({ sock, msg, sender }) => {
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        const now = Date.now();
        const cooldown = 2 * 60 * 60 * 1000; // 2 heures
        const remaining = cooldown - (now - (acc.lastBonus || 0));
        if (remaining > 0) {
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            return sock.sendMessage(msg.key.remoteJid, { text: `⏳ Bonus disponible dans: *${h}h ${m}m*` });
        }
        const bonus = randomInt(100, 1000);
        acc.wallet += bonus;
        acc.lastBonus = now;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `🎁 *Bonus réclamé!*\n💵 +${bonus} dans le portefeuille!\n👛 Total portefeuille: ${acc.wallet}` });
    },

    transfer: async ({ sock, msg, sender, args }) => {
        const amount = parseInt(args[0]);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (isNaN(amount) || amount <= 0 || !mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !transfer <montant> @user' });
        const target = mentioned[0];
        if (target === sender) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Tu ne peux pas te transférer à toi-même!' });
        const eco = getEconomy();
        const sAcc = getAccount(eco, sender);
        const tAcc = getAccount(eco, target);
        if (sAcc.wallet < amount) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Fonds insuffisants! Portefeuille: ${sAcc.wallet} 💵` });
        sAcc.wallet -= amount;
        tAcc.wallet += amount;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, {
            text: `✅ *Transfert effectué!*\n💵 ${amount} envoyé à @${target.replace('@s.whatsapp.net', '')}\n👛 Votre portefeuille: ${sAcc.wallet}`,
            mentions: [target]
        });
    },

    vol: async ({ sock, msg, sender }) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !vol @user' });
        const target = mentioned[0];
        if (target === sender) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Tu ne peux pas te voler toi-même!' });
        const eco = getEconomy();
        const sAcc = getAccount(eco, sender);
        const tAcc = getAccount(eco, target);
        const success = Math.random() < 0.45;
        const maxSteal = Math.min(Math.floor(tAcc.wallet * 0.2), 500);
        if (maxSteal <= 0) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Cette personne n\'a rien à voler!' });
        if (success) {
            const stolen = randomInt(Math.floor(maxSteal / 2), maxSteal);
            sAcc.wallet += stolen;
            tAcc.wallet -= stolen;
            saveEconomy(eco);
            await sock.sendMessage(msg.key.remoteJid, { text: `🦹 *Vol réussi!*\nTu as volé *${stolen} 💵* à @${target.replace('@s.whatsapp.net', '')}!\n👛 Ton portefeuille: ${sAcc.wallet}`, mentions: [target] });
        } else {
            const fine = randomInt(50, 200);
            sAcc.wallet = Math.max(0, sAcc.wallet - fine);
            saveEconomy(eco);
            await sock.sendMessage(msg.key.remoteJid, { text: `🚔 *Vol raté!*\nTu t'es fait attraper!\nAmende: *${fine} 💵*\n👛 Ton portefeuille: ${sAcc.wallet}`, mentions: [target] });
        }
    },

    pari: async ({ sock, msg, sender, args }) => {
        const amount = parseInt(args[0]);
        const direction = args[1]?.toLowerCase();
        if (isNaN(amount) || amount <= 0 || !['haut', 'bas', 'high', 'low'].includes(direction)) {
            return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !pari <montant> <haut/bas>' });
        }
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        if (acc.wallet < amount) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Fonds insuffisants! Portefeuille: ${acc.wallet} 💵` });
        const number = randomInt(1, 100);
        const isHaut = ['haut', 'high'].includes(direction);
        const win = isHaut ? number > 50 : number <= 50;
        if (win) {
            acc.wallet += amount;
            saveEconomy(eco);
            await sock.sendMessage(msg.key.remoteJid, { text: `🎲 *Pari Gagné!*\nNombre: *${number}* (${number > 50 ? 'Haut' : 'Bas'})\n+${amount} 💵!\n👛 Portefeuille: ${acc.wallet}` });
        } else {
            acc.wallet -= amount;
            saveEconomy(eco);
            await sock.sendMessage(msg.key.remoteJid, { text: `🎲 *Pari Perdu!*\nNombre: *${number}* (${number > 50 ? 'Haut' : 'Bas'})\n-${amount} 💵\n👛 Portefeuille: ${acc.wallet}` });
        }
    },

    slot: async ({ sock, msg, sender, args }) => {
        const bet = parseInt(args[0]) || 100;
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        if (acc.wallet < bet) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Fonds insuffisants! Portefeuille: ${acc.wallet} 💵` });
        const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '🔔', '7️⃣'];
        const s1 = symbols[randomInt(0, symbols.length - 1)];
        const s2 = symbols[randomInt(0, symbols.length - 1)];
        const s3 = symbols[randomInt(0, symbols.length - 1)];
        let win = 0;
        let msg2 = '';
        if (s1 === s2 && s2 === s3) {
            const multipliers = { '💎': 10, '7️⃣': 7, '⭐': 5, '🔔': 4, '🍇': 3, '🍊': 2.5, '🍋': 2, '🍒': 1.5 };
            win = Math.floor(bet * (multipliers[s1] || 3));
            msg2 = `🎉 *JACKPOT!* Gain: *${win} 💵*`;
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            win = Math.floor(bet * 1.5);
            msg2 = `✅ *Deux identiques!* Gain: *${win} 💵*`;
        } else {
            win = -bet;
            msg2 = `❌ *Perdu!* Perte: *${bet} 💵*`;
        }
        acc.wallet += win;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `🎰 *Machine à Sous*\n\n[ ${s1} | ${s2} | ${s3} ]\n\n${msg2}\n\n👛 Portefeuille: ${acc.wallet} 💵` });
    },

    don: async ({ sock, msg, sender, args }) => {
        const amount = parseInt(args[0]);
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (isNaN(amount) || !mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !don <montant> @user' });
        const target = mentioned[0];
        const eco = getEconomy();
        const sAcc = getAccount(eco, sender);
        const tAcc = getAccount(eco, target);
        if (sAcc.wallet < amount) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Fonds insuffisants' });
        sAcc.wallet -= amount;
        tAcc.wallet += amount;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `💝 *Don effectué!*\nTu as donné *${amount} 💵* à @${target.replace('@s.whatsapp.net', '')}`, mentions: [target] });
    },

    resetaccount: async ({ sock, msg, args }) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const target = mentioned[0] || args[0];
        if (!target) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !resetaccount @user' });
        const eco = getEconomy();
        eco[target] = { wallet: 500, bank: 0, bankCapacity: 5000, lastBonus: 0 };
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Compte de @${target.replace('@s.whatsapp.net', '')} réinitialisé`, mentions: [target] });
    },

    capacite: async ({ sock, msg, sender, args }) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !capacite <montant>' });
        const eco = getEconomy();
        const acc = getAccount(eco, sender);
        const cost = Math.floor(amount / 2);
        if (acc.wallet < cost) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Il faut ${cost} 💵 pour augmenter la capacité de ${amount}` });
        acc.wallet -= cost;
        acc.bankCapacity += amount;
        saveEconomy(eco);
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Capacité banque augmentée!*\n📈 +${amount}\n🏦 Nouvelle capacité: ${acc.bankCapacity} 💵\n💵 Coût: ${cost}` });
    },

    tictactoe: async ({ sock, msg, sender }) => {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !tictactoe @adversaire' });
        const opponent = mentioned[0];
        if (opponent === sender) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Tu ne peux pas jouer contre toi-même!' });
        const board = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const displayBoard = (b) => `${b[0]}|${b[1]}|${b[2]}\n-+-+-\n${b[3]}|${b[4]}|${b[5]}\n-+-+-\n${b[6]}|${b[7]}|${b[8]}`;
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🎮 *Tic-Tac-Toe*\n\n@${sender.replace('@s.whatsapp.net', '')} (❌) vs @${opponent.replace('@s.whatsapp.net', '')} (⭕)\n\n${displayBoard(board)}\n\n*Règles:* Tape !jouer <1-9> pour jouer!\n(Partie simplifiée - bot joue aléatoirement)`,
            mentions: [sender, opponent]
        });
    }
};

const aliases = {
    'argent': 'myecon',
    'portefeuille': 'myecon',
    'wallet': 'myecon',
    'gamble': 'pari',
    'machine': 'slot'
};

module.exports = { commands, aliases };
