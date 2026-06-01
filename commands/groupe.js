const { readJson, writeJson, getDataPath, getSenderNumber, OWNER_NUMBER } = require('../lib/helper');

function getWarns() { return readJson(getDataPath('warns.json')); }
function saveWarns(d) { writeJson(getDataPath('warns.json'), d); }
function getGroups() { return readJson(getDataPath('groups.json')); }
function saveGroups(d) { writeJson(getDataPath('groups.json'), d); }

function requireGroup(sock, msg) {
    if (!msg.key.remoteJid.endsWith('@g.us')) {
        sock.sendMessage(msg.key.remoteJid, { text: '❌ Cette commande fonctionne uniquement dans un groupe!' });
        return false;
    }
    return true;
}

async function getBotJid(sock) {
    return sock.user?.id?.split(':')[0] + '@s.whatsapp.net' || `${OWNER_NUMBER}@s.whatsapp.net`;
}

async function getBotAdmin(sock, groupId) {
    try {
        const botJid = await getBotJid(sock);
        const meta = await sock.groupMetadata(groupId);
        return meta.participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch { return false; }
}

function extractMentioned(msg, args) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length) return mentioned[0];
    const num = args[0]?.replace(/[^0-9]/g, '');
    return num ? `${num}@s.whatsapp.net` : null;
}

const commands = {
    // ─── TAG TOUS ─────────────────────────────────────────────────────────────
    tagall: async ({ sock, msg, body }) => {
        if (!requireGroup(sock, msg)) return;
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = meta.participants.map(p => p.id);
            const tags = meta.participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `📢 *${meta.subject}*\n${body || 'Attention tout le monde!'}\n\n${tags}`,
                mentions
            });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── TAG ADMINS ───────────────────────────────────────────────────────────
    tagadmin: async ({ sock, msg, body }) => {
        if (!requireGroup(sock, msg)) return;
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const admins = meta.participants.filter(p => p.admin);
            if (!admins.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Aucun admin trouvé' });
            const mentions = admins.map(p => p.id);
            const tags = admins.map(p => `@${p.id.split('@')[0]}`).join(' ');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `👑 *Admins du groupe:*\n${body || ''}\n${tags}`,
                mentions
            });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── TAG (avec message) ───────────────────────────────────────────────────
    tag: async ({ sock, msg, body }) => {
        if (!requireGroup(sock, msg)) return;
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(msg.key.remoteJid, { text: body || '📢 Message', mentions });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── ADD (ajouter un membre) ──────────────────────────────────────────────
    add: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        if (!args[0]) return sock.sendMessage(gid, {
            text: '❌ Usage: *!add <numéro>*\nEx: *!add 33612345678* (avec indicatif pays, sans +)'
        });
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être *admin* du groupe pour ajouter des membres!' });

        const num = args[0].replace(/[^0-9]/g, '');
        const jid = `${num}@s.whatsapp.net`;
        try {
            const result = await sock.groupParticipantsUpdate(gid, [jid], 'add');
            const status = result?.[0]?.status;
            if (status === '200' || status === 200) {
                await sock.sendMessage(gid, { text: `✅ *+${num}* a été ajouté au groupe!`, mentions: [jid] });
            } else if (status === '403') {
                await sock.sendMessage(gid, { text: `❌ *+${num}* a restreint les ajouts à ses contacts.` });
            } else if (status === '408') {
                await sock.sendMessage(gid, { text: `❌ *+${num}* a un compte WhatsApp inexistant.` });
            } else {
                await sock.sendMessage(gid, { text: `⚠️ Résultat pour *+${num}*: code ${status}` });
            }
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Impossible d'ajouter: ${e.message}` });
        }
    },

    // ─── KICK (supprimer un membre) ───────────────────────────────────────────
    kick: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });

        const target = extractMentioned(msg, args);
        if (!target) return sock.sendMessage(gid, { text: '❌ Usage: *!kick @membre* ou *!kick numéro*' });
        try {
            await sock.groupParticipantsUpdate(gid, [target], 'remove');
            await sock.sendMessage(gid, { text: `🚪 @${target.split('@')[0]} a été retiré du groupe.`, mentions: [target] });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── PROMOTE (passer admin) ───────────────────────────────────────────────
    promote: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });

        const target = extractMentioned(msg, args);
        if (!target) return sock.sendMessage(gid, { text: '❌ Usage: *!promote @membre*' });
        try {
            await sock.groupParticipantsUpdate(gid, [target], 'promote');
            await sock.sendMessage(gid, { text: `👑 @${target.split('@')[0]} est maintenant *admin*!`, mentions: [target] });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── DEMOTE (retirer admin) ───────────────────────────────────────────────
    demote: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });

        const target = extractMentioned(msg, args);
        if (!target) return sock.sendMessage(gid, { text: '❌ Usage: *!demote @admin*' });
        try {
            await sock.groupParticipantsUpdate(gid, [target], 'demote');
            await sock.sendMessage(gid, { text: `📉 @${target.split('@')[0]} n'est plus admin.`, mentions: [target] });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── LINK (lien d'invitation) ─────────────────────────────────────────────
    link: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin pour obtenir le lien!' });
        try {
            const code = await sock.groupInviteCode(gid);
            await sock.sendMessage(gid, { text: `🔗 *Lien d'invitation:*\nhttps://chat.whatsapp.com/${code}` });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── REVOKE LINK ──────────────────────────────────────────────────────────
    revokelink: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });
        try {
            await sock.groupRevokeInvite(gid);
            await sock.sendMessage(gid, { text: '✅ Lien d\'invitation révoqué. Un nouveau lien a été généré.' });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── GINFO (infos du groupe) ──────────────────────────────────────────────
    ginfo: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const admins = meta.participants.filter(p => p.admin).length;
            const created = new Date(meta.creation * 1000).toLocaleDateString('fr-FR');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `📊 *Infos du groupe*\n\n📛 Nom: ${meta.subject}\n👥 Membres: ${meta.participants.length}\n👑 Admins: ${admins}\n📅 Créé le: ${created}\n🔒 Annonces: ${meta.announce ? 'Oui' : 'Non'}\n🔐 Restreint: ${meta.restrict ? 'Oui' : 'Non'}\n📝 Description: ${meta.desc || 'Aucune'}`
            });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── GMEMBERS (liste des membres) ────────────────────────────────────────
    gmembers: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const list = meta.participants.map((p, i) => {
                const num = p.id.split('@')[0];
                const role = p.admin === 'superadmin' ? '👑' : p.admin === 'admin' ? '⭐' : '👤';
                return `${role} ${i + 1}. +${num}`;
            }).join('\n');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `👥 *Membres de ${meta.subject}* (${meta.participants.length})\n\n${list}\n\n👑 Créateur | ⭐ Admin | 👤 Membre`
            });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── MUTE (fermer le groupe) ──────────────────────────────────────────────
    mute: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });
        try {
            await sock.groupSettingUpdate(gid, 'announcement');
            await sock.sendMessage(gid, { text: '🔇 *Groupe muté* — Seuls les admins peuvent écrire.' });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── UNMUTE (ouvrir le groupe) ────────────────────────────────────────────
    unmute: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });
        try {
            await sock.groupSettingUpdate(gid, 'not_announcement');
            await sock.sendMessage(gid, { text: '🔊 *Groupe ouvert* — Tout le monde peut écrire.' });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── GNAME (changer le nom) ───────────────────────────────────────────────
    gname: async ({ sock, msg, body }) => {
        if (!requireGroup(sock, msg)) return;
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gname <nouveau_nom>' });
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });
        try {
            await sock.groupUpdateSubject(gid, body);
            await sock.sendMessage(gid, { text: `✅ Nom du groupe changé en: *${body}*` });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── GDESC (changer la description) ──────────────────────────────────────
    gdesc: async ({ sock, msg, body }) => {
        if (!requireGroup(sock, msg)) return;
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gdesc <description>' });
        const gid = msg.key.remoteJid;
        const isAdmin = await getBotAdmin(sock, gid);
        if (!isAdmin) return sock.sendMessage(gid, { text: '❌ Le bot doit être admin!' });
        try {
            await sock.groupUpdateDescription(gid, body);
            await sock.sendMessage(gid, { text: `✅ Description du groupe mise à jour.` });
        } catch (e) {
            await sock.sendMessage(gid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── WARN ─────────────────────────────────────────────────────────────────
    warn: async ({ sock, msg, args, body }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const target = extractMentioned(msg, args);
        if (!target) return sock.sendMessage(gid, { text: '❌ Usage: !warn @membre [raison]' });
        const warns = getWarns();
        if (!warns[gid]) warns[gid] = {};
        if (!warns[gid][target]) warns[gid][target] = 0;
        warns[gid][target]++;
        saveWarns(warns);
        const count = warns[gid][target];
        const reason = body.replace(args[0] || '', '').trim() || 'Non précisée';
        await sock.sendMessage(gid, {
            text: `⚠️ *AVERTISSEMENT*\n\n👤 @${target.split('@')[0]}\n📝 Raison: ${reason}\n🔢 Avertissements: ${count}/3${count >= 3 ? '\n\n🔴 Limite atteinte!' : ''}`,
            mentions: [target]
        });
        if (count >= 3) {
            warns[gid][target] = 0;
            saveWarns(warns);
            const isAdmin = await getBotAdmin(sock, gid);
            if (isAdmin) {
                try {
                    await sock.groupParticipantsUpdate(gid, [target], 'remove');
                    await sock.sendMessage(gid, { text: `🚪 @${target.split('@')[0]} a été expulsé (3 avertissements).`, mentions: [target] });
                } catch {}
            }
        }
    },

    // ─── WARNS (voir les warns) ───────────────────────────────────────────────
    warns: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const warns = getWarns();
        const groupWarns = warns[gid] || {};
        const target = extractMentioned(msg, args);
        if (target) {
            const count = groupWarns[target] || 0;
            return sock.sendMessage(gid, { text: `⚠️ @${target.split('@')[0]} a *${count}* avertissement(s).`, mentions: [target] });
        }
        if (!Object.keys(groupWarns).length) return sock.sendMessage(gid, { text: '✅ Aucun avertissement dans ce groupe.' });
        const list = Object.entries(groupWarns).map(([jid, n]) => `• +${jid.split('@')[0]}: ${n} warn(s)`).join('\n');
        await sock.sendMessage(gid, { text: `📋 *Avertissements du groupe:*\n\n${list}` });
    },

    // ─── CLEARWARN ────────────────────────────────────────────────────────────
    clearwarn: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const target = extractMentioned(msg, args);
        if (!target) return sock.sendMessage(gid, { text: '❌ Usage: !clearwarn @membre' });
        const warns = getWarns();
        if (warns[gid]) { delete warns[gid][target]; saveWarns(warns); }
        await sock.sendMessage(gid, { text: `✅ Avertissements de @${target.split('@')[0]} effacés.`, mentions: [target] });
    },

    // ─── ANTILINK (toggle) ────────────────────────────────────────────────────
    antilink: async ({ sock, msg, args }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const groups = getGroups();
        if (!groups[gid]) groups[gid] = {};
        const enable = args[0]?.toLowerCase() !== 'off';
        groups[gid].antilink = enable;
        saveGroups(groups);
        await sock.sendMessage(gid, { text: `🔗 Anti-lien: *${enable ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}*` });
    },

    // ─── WELCOME MESSAGE ──────────────────────────────────────────────────────
    welcome: async ({ sock, msg, args, body }) => {
        if (!requireGroup(sock, msg)) return;
        const gid = msg.key.remoteJid;
        const groups = getGroups();
        if (!groups[gid]) groups[gid] = {};
        if (args[0]?.toLowerCase() === 'off') {
            groups[gid].welcome = false;
            saveGroups(groups);
            return sock.sendMessage(gid, { text: '👋 Message de bienvenue désactivé.' });
        }
        const text = body.replace(/^(on|off)?\s*/i, '').trim() || '👋 Bienvenue @participant dans le groupe!';
        groups[gid].welcome = true;
        groups[gid].welcomeMsg = text;
        saveGroups(groups);
        await sock.sendMessage(gid, { text: `✅ Message de bienvenue activé:\n\n_${text}_` });
    },

    // ─── QUITTER LE GROUPE ────────────────────────────────────────────────────
    quitter: async ({ sock, msg }) => {
        if (!requireGroup(sock, msg)) return;
        await sock.sendMessage(msg.key.remoteJid, { text: '👋 Au revoir! Le bot quitte le groupe...' });
        try {
            await sock.groupLeave(msg.key.remoteJid);
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },

    // ─── MENU GROUPE ──────────────────────────────────────────────────────────
    groupe: async ({ sock, msg, prefix }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `👥 *COMMANDES GROUPE*\n${'━'.repeat(30)}\n\n➕ *Gestion membres*\n• *${prefix}add <numéro>* — Ajouter\n• *${prefix}kick @membre* — Expulser\n• *${prefix}promote @membre* — Passer admin\n• *${prefix}demote @admin* — Retirer admin\n\n📢 *Tags*\n• *${prefix}tagall [msg]* — Mentionner tout le monde\n• *${prefix}tagadmin [msg]* — Mentionner les admins\n• *${prefix}tag <msg>* — Tag + message\n\n⚙️ *Paramètres (admin requis)*\n• *${prefix}mute* — Fermer le groupe\n• *${prefix}unmute* — Ouvrir le groupe\n• *${prefix}gname <nom>* — Renommer\n• *${prefix}gdesc <desc>* — Description\n• *${prefix}link* — Lien d'invitation\n• *${prefix}revokelink* — Révoquer le lien\n• *${prefix}antilink on/off* — Anti-liens\n• *${prefix}welcome <msg>* — Msg bienvenue\n• *${prefix}quitter* — Quitter le groupe\n\n⚠️ *Avertissements*\n• *${prefix}warn @membre [raison]*\n• *${prefix}warns [@membre]*\n• *${prefix}clearwarn @membre*\n\nℹ️ *Infos*\n• *${prefix}ginfo* — Informations groupe\n• *${prefix}gmembers* — Liste membres`
        });
    }
};

const aliases = {
    'remove':    'kick',
    'expulser':  'kick',
    'ajouter':   'add',
    'admins':    'tagadmin',
    'fermer':    'mute',
    'ouvrir':    'unmute',
    'nom':       'gname',
    'desc':      'gdesc',
    'membres':   'gmembers',
    'infos':     'ginfo',
    'invitelink': 'link'
};

module.exports = { commands, aliases };
