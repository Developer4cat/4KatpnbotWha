require("dotenv").config();
const { prefix, owner } = process.env;
const { errorHandler } = require("../lib/functions");
const {
	getXpLevel,
	resetRankAntiSpam,
	adminGiveXp,
	adminSetLevel,
	adminAddLevel,
} = require("../lib/db");
const {
	normalizeJid,
	jidUser,
	resolveMessageAuthor,
	findGroupParticipant,
} = require("../lib/participant");

const ownerId = () => String(owner || "").replace(/\D/g, "");

const isBotOwner = (msg) => {
	const id = ownerId();
	if (!id) return false;
	const author = resolveMessageAuthor(msg.key);
	const senderUid =
		author?.uid ||
		(msg.key.remoteJid.endsWith("@g.us") ? null : msg.key.remoteJid.split("@")[0]);
	return senderUid === id;
};

const getContextInfo = (msg) =>
	msg.message?.extendedTextMessage?.contextInfo ||
	msg.message?.imageMessage?.contextInfo ||
	msg.message?.videoMessage?.contextInfo;

const resolveTarget = async (sock, msg, args) => {
	const remoteJid = msg.key.remoteJid;
	const meta = remoteJid.endsWith("@g.us") ? await sock.groupMetadata(remoteJid) : null;
	const ctx = getContextInfo(msg);
	const quotedParticipant = normalizeJid(ctx?.participant || "");

	if (quotedParticipant && meta) {
		const participant = findGroupParticipant(meta.participants, quotedParticipant);
		if (participant) {
			return {
				uid: jidUser(participant.phoneNumber || participant.id || participant.lid),
				jid: normalizeJid(participant.id || participant.phoneNumber || participant.lid),
			};
		}
	}

	const tokens = (args[0] || []).map((part) => String(part).replace("@", "")).filter(Boolean);
	for (const token of tokens) {
		if (!/^\d+$/.test(token) && token.length < 8) continue;
		if (meta) {
			const participant = findGroupParticipant(meta.participants, token, `${token}@s.whatsapp.net`, `${token}@lid`);
			if (participant) {
				return {
					uid: jidUser(participant.phoneNumber || participant.id || participant.lid),
					jid: normalizeJid(participant.id || participant.phoneNumber || participant.lid),
				};
			}
		}
		if (token === ownerId()) {
			return { uid: token, jid: `${token}@s.whatsapp.net` };
		}
	}

	return null;
};

const usage = `*Comandos de dueño para rank*

*${prefix}bsd* [@usuario] — reinicia nivel/XP/contadores (grupo o usuario)
*${prefix}rankadmin contadores* [@usuario] — reinicia anti-spam
*${prefix}rankadmin xp* @usuario cantidad — da experiencia
*${prefix}rankadmin nivel* @usuario cantidad — fija el nivel
*${prefix}rankadmin addnivel* @usuario cantidad — suma niveles

Responde a alguien o menciónalo. Solo el dueño del bot.`;

const parseAmount = (args, index = 1) => {
	const token = String(args[0]?.[index] || "").replace(/[^\d-]/g, "");
	const value = parseInt(token, 10);
	return Number.isFinite(value) ? value : null;
};

module.exports.run = async (sock, msg, args) => {
	try {
		if (!isBotOwner(msg)) {
			return sock.sendMessage(msg.key.remoteJid, { text: "Solo el dueño del bot puede usar este comando." }, { quoted: msg });
		}

		if (!msg.key.remoteJid.endsWith("@g.us")) {
			return sock.sendMessage(msg.key.remoteJid, { text: "Este comando solo funciona en grupos." }, { quoted: msg });
		}

		const sub = String(args[0]?.[0] || "").toLowerCase();
		if (!sub || sub === "help" || sub === "ayuda") {
			return sock.sendMessage(msg.key.remoteJid, { text: usage }, { quoted: msg });
		}

		const gid = msg.key.remoteJid.split("@")[0];
		const remoteJid = msg.key.remoteJid;
		const target = await resolveTarget(sock, msg, args);

		if (sub === "contadores" || sub === "counters") {
			if (target) {
				resetRankAntiSpam(gid, target.uid);
				return sock.sendMessage(
					remoteJid,
					{
						text: `Contadores anti-spam reiniciados para @${jidUser(target.jid)}.`,
						mentions: [target.jid],
					},
					{ quoted: msg },
				);
			}
			const count = resetRankAntiSpam(gid);
			return sock.sendMessage(
				remoteJid,
				{ text: `Contadores anti-spam reiniciados (${count} usuarios en memoria).` },
				{ quoted: msg },
			);
		}

		if (!target) {
			return sock.sendMessage(
				remoteJid,
				{ text: "Indica un usuario respondiendo a su mensaje o mencionándolo." },
				{ quoted: msg },
			);
		}

		if (sub === "xp" || sub === "addxp") {
			const amount = parseAmount(args, 1);
			if (amount == null || amount <= 0) {
				return sock.sendMessage(remoteJid, { text: `Uso: ${prefix}rankadmin xp @usuario cantidad` }, { quoted: msg });
			}
			await adminGiveXp(sock, remoteJid, gid, target.uid, target.jid, amount);
			const stats = await getXpLevel(gid, target.uid);
			return sock.sendMessage(
				remoteJid,
				{
					text: `Se añadieron *${amount}* XP a @${jidUser(target.jid)}.\nNivel: *${stats.level}* · XP: *${stats.xp}*`,
					mentions: [target.jid],
				},
				{ quoted: msg },
			);
		}

		if (sub === "nivel" || sub === "setnivel" || sub === "setlevel") {
			const level = parseAmount(args, 1);
			if (level == null || level < 1) {
				return sock.sendMessage(remoteJid, { text: `Uso: ${prefix}rankadmin nivel @usuario cantidad` }, { quoted: msg });
			}
			const xp = parseAmount(args, 2) ?? 0;
			const stats = await adminSetLevel(gid, target.uid, level, xp);
			return sock.sendMessage(
				remoteJid,
				{
					text: `Nivel de @${jidUser(target.jid)} fijado a *${stats.level}* (XP: *${stats.xp}*).`,
					mentions: [target.jid],
				},
				{ quoted: msg },
			);
		}

		if (sub === "addnivel" || sub === "addlevel") {
			const amount = parseAmount(args, 1);
			if (amount == null || amount <= 0) {
				return sock.sendMessage(remoteJid, { text: `Uso: ${prefix}rankadmin addnivel @usuario cantidad` }, { quoted: msg });
			}
			const stats = await adminAddLevel(gid, target.uid, amount);
			return sock.sendMessage(
				remoteJid,
				{
					text: `Se añadieron *${amount}* nivel(es) a @${jidUser(target.jid)}.\nNivel actual: *${stats.level}* · XP: *${stats.xp}*`,
					mentions: [target.jid],
				},
				{ quoted: msg },
			);
		}

		return sock.sendMessage(remoteJid, { text: usage }, { quoted: msg });
	} catch (e) {
		await errorHandler(sock, msg, module.exports.config.name, e);
	}
};

module.exports.config = {
	name: "rankadmin",
	alias: ["radm", "rankadm"],
	type: "admin",
	description: `Administración del rank (solo dueño): reset, contadores, xp, nivel.`,
	expects: ["text"],
	returns: ["text"],
};
