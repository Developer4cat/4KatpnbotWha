require("dotenv").config();
const { errorHandler } = require("../lib/functions");
const { getConfig, getXpLevel } = require("../lib/db");
const { normalizeJid, jidUser, resolveMessageAuthor } = require("../lib/participant");

module.exports.run = async (sock, msg, args) => {
    try {
        if (!msg.key.remoteJid.includes("g.us"))
            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `Comando solo disponible en grupos.`,
                },
                { quoted: msg },
            );
        const gid = msg.key.remoteJid.split("@")[0];
        const enable = await getConfig("rank", gid);
        const footer = enable ? "" : "El sistema de niveles esta desactivado.";

        let targetAuthor = null;
        let mentioned = false;

        if (args[0] !== undefined && args[0].length > 0) {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const mentionToken = String(args[0][0] || "").replace("@", "");
            const participant = meta.participants.find((entry) => {
                const fields = [entry.id, entry.jid, entry.phoneNumber, entry.lid]
                    .filter(Boolean)
                    .map(normalizeJid);
                return fields.some((field) => jidUser(field) === mentionToken || field.includes(mentionToken));
            });

            if (!participant) {
                return sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text: `No pude identificar al miembro mencionado.`,
                    },
                    { quoted: msg },
                );
            }

            targetAuthor = {
                uid: jidUser(participant.phoneNumber || participant.id || participant.lid),
                jid: normalizeJid(participant.id || participant.phoneNumber || participant.lid),
            };
            mentioned = true;
        } else {
            targetAuthor = resolveMessageAuthor(msg.key);
        }

        if (!targetAuthor) {
            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `No pude identificar al miembro.`,
                },
                { quoted: msg },
            );
        }

        const { has, xp, level } = await getXpLevel(gid, targetAuthor.uid);
        const mentionTag = mentioned ? `@${jidUser(targetAuthor.jid)}` : null;

        if (!has) {
            return sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `${mentioned ? `${mentionTag} no tiene` : "No tienes"} nivel ni experiencia aún. \n${footer}`,
                    mentions: mentioned ? [targetAuthor.jid] : [],
                },
                { quoted: msg },
            );
        }

        return sock.sendMessage(
            msg.key.remoteJid,
            {
                text: `${mentioned ? `${mentionTag} tiene` : "Tienes:"} \nNivel: *${level}*\nExperiencia: *${xp}*\n${footer}`,
                mentions: mentioned ? [targetAuthor.jid] : [],
            },
            { quoted: msg },
        );
    } catch (e) {
        await errorHandler(sock, msg, this.config.name, e);
    }
};

module.exports.config = {
    name: `level`,
    alias: [`l`, `nivel`, `lvl`, `xp`],
    type: `misc`,
    description: `Muestra tu nivel y experiencia conforme tus mensajes enviados.`,
    expects: ['none', 'mention'],
    returns: ['text']
};
