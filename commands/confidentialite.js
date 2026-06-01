const commands = {
    presence: async ({ sock, msg, args }) => {
        const type = args[0] || 'available';
        try {
            await sock.sendPresenceUpdate(type, msg.key.remoteJid);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Présence mise à jour: *${type}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur mise à jour présence' });
        }
    },

    getprivacy: async ({ sock, msg }) => {
        try {
            const privacy = await sock.fetchPrivacySettings(true);
            const text = `🔒 *Paramètres de confidentialité:*\n\n` +
                Object.entries(privacy).map(([k, v]) => `• ${k}: *${v}*`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de récupérer les paramètres de confidentialité' });
        }
    },

    setbio: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !setbio <texte>' });
        try {
            await sock.updateProfileStatus(body);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Bio mise à jour:\n"${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de modifier la bio' });
        }
    },

    lastseen: async ({ sock, msg, args }) => {
        const value = args[0] || 'contacts';
        const valid = ['all', 'contacts', 'contact_blacklist', 'none'];
        if (!valid.includes(value)) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Valeur invalide. Utilise: ${valid.join(', ')}` });
        try {
            await sock.updateLastSeenPrivacy(value);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Confidentialité "Dernière vue" → *${value}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification confidentialité' });
        }
    },

    online: async ({ sock, msg, args }) => {
        const value = args[0] || 'all';
        try {
            await sock.updateOnlinePrivacy(value);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Confidentialité "En ligne" → *${value}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification confidentialité en ligne' });
        }
    },

    mypp: async ({ sock, msg, args }) => {
        const value = args[0] || 'contacts';
        try {
            await sock.updateProfilePicturePrivacy(value);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Confidentialité "Photo de profil" → *${value}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification confidentialité photo' });
        }
    },

    mystatus: async ({ sock, msg, args }) => {
        const value = args[0] || 'contacts';
        try {
            await sock.updateStatusPrivacy(value);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Confidentialité "Statut" → *${value}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification confidentialité statut' });
        }
    },

    read: async ({ sock, msg, args }) => {
        const value = args[0] || 'all';
        try {
            await sock.updateReadReceiptsPrivacy(value);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Confirmations de lecture → *${value}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification confirmations lecture' });
        }
    },

    groupadd: async ({ sock, msg, args }) => {
        const value = args[0] || 'contacts';
        try {
            await sock.updateGroupsAddPrivacy(value);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Confidentialité "Ajout en groupe" → *${value}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification confidentialité groupe' });
        }
    }
};

const aliases = {
    'privacy': 'getprivacy',
    'bio': 'setbio'
};

module.exports = { commands, aliases };
