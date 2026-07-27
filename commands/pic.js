require("dotenv").config();
const { prefix, py_cmd_pic } = process.env;
const { writeFile, unlink, mkdir, readFile, copyFile } = require("fs/promises");
const { errorHandler } = require("../lib/functions");
const { exec } = require("child_process");
const path = require("path");
const axios = require("axios").default;

const pick = (...values) => values.find((value) => value != null);

const normalizeJid = (jid) => String(jid || "").replace(/:\d+(?=@)/, "");

const jidUser = (jid) => normalizeJid(jid).split("@")[0];

const isLidJid = (jid) => normalizeJid(jid).endsWith("@lid");

const isPnJid = (jid) => normalizeJid(jid).endsWith("@s.whatsapp.net");

const getContextInfo = (msg) =>
	pick(
		msg.message?.extendedTextMessage?.contextInfo,
		msg.message?.imageMessage?.contextInfo,
		msg.message?.videoMessage?.contextInfo,
	);

const unwrapQuoted = (quoted) => {
	if (!quoted) return null;
	return (
		quoted.viewOnceMessage?.message ||
		quoted.viewOnceMessageV2?.message ||
		quoted
	);
};

const getQuotedText = (quoted) => {
	const q = unwrapQuoted(quoted);
	if (!q) return null;
	if (q.conversation) return q.conversation;
	if (q.extendedTextMessage?.text) return q.extendedTextMessage.text;
	if (q.imageMessage) return q.imageMessage.caption || "[Imagen]";
	if (q.videoMessage) return q.videoMessage.caption || "[Video]";
	if (q.audioMessage) return q.audioMessage.ptt ? "[Nota de voz]" : "[Audio]";
	if (q.stickerMessage) return "[Sticker]";
	if (q.documentMessage) {
		return q.documentMessage.caption || `[Documento: ${q.documentMessage.fileName || "archivo"}]`;
	}
	if (q.contactMessage) return `[Contacto: ${q.contactMessage.displayName || "contacto"}]`;
	if (q.locationMessage) return "[Ubicación]";
	return "[Mensaje no compatible]";
};

const findGroupParticipant = (participants, ...jids) => {
	const tokens = new Set(
		jids
			.filter(Boolean)
			.map(normalizeJid)
			.flatMap((jid) => [jid, jidUser(jid)]),
	);
	return participants.find((participant) => {
		const fields = [participant.id, participant.jid, participant.phoneNumber, participant.lid]
			.filter(Boolean)
			.map(normalizeJid);
		return fields.some((field) => tokens.has(field) || tokens.has(jidUser(field)));
	});
};

const resolvePnFromLid = async (sock, lidJid) => {
	if (!lidJid || !isLidJid(lidJid)) return null;
	try {
		const mapping = sock.signalRepository?.lidMapping;
		if (!mapping?.getPNForLID) return null;
		const result = await mapping.getPNForLID(normalizeJid(lidJid));
		if (typeof result === "string" && isPnJid(result)) return normalizeJid(result);
		if (result?.pn) return normalizeJid(result.pn);
		if (Array.isArray(result)) {
			const hit = result.find((row) => row?.pn);
			if (hit?.pn) return normalizeJid(hit.pn);
		}
	} catch {}
	return null;
};

const formatPhoneLabel = (pnJid) => {
	const digits = jidUser(pnJid);
	if (!digits) return null;
	return digits.startsWith("+") ? digits : `+${digits}`;
};

const resolveDisplayName = async (sock, { contextInfo, participantJid, participantPn, remoteJid }) => {
	const memberLabel = contextInfo?.memberLabel?.label;
	if (memberLabel) return memberLabel;

	const lidJid = isLidJid(participantJid) ? normalizeJid(participantJid) : null;
	let pnJid = isPnJid(participantPn)
		? normalizeJid(participantPn)
		: isPnJid(participantJid)
			? normalizeJid(participantJid)
			: null;

	if (!pnJid && lidJid) {
		pnJid = await resolvePnFromLid(sock, lidJid);
	}

	if (remoteJid.endsWith("@g.us")) {
		const meta = await sock.groupMetadata(remoteJid);
		const groupParticipant = findGroupParticipant(
			meta.participants,
			participantJid,
			participantPn,
			lidJid,
			pnJid,
		);
		if (groupParticipant) {
			const name = pick(
				groupParticipant.notify,
				groupParticipant.name,
				groupParticipant.verifiedName,
				groupParticipant.username,
			);
			if (name) return name;
			if (groupParticipant.phoneNumber) {
				pnJid = normalizeJid(groupParticipant.phoneNumber);
			}
		}
	}

	if (pnJid) {
		return formatPhoneLabel(pnJid) || "Contacto";
	}

	return "Contacto";
};

const resolveProfileJids = async (sock, { participantJid, participantPn, remoteJid }) => {
	const seen = new Set();
	const ordered = [];

	const push = (jid) => {
		const normalized = normalizeJid(jid || "");
		if (!normalized || seen.has(normalized)) return;
		seen.add(normalized);
		ordered.push(normalized);
	};

	push(participantJid);
	push(participantPn);

	if (remoteJid.endsWith("@g.us")) {
		const meta = await sock.groupMetadata(remoteJid);
		const groupParticipant = findGroupParticipant(
			meta.participants,
			participantJid,
			participantPn,
		);
		if (groupParticipant) {
			push(groupParticipant.id);
			push(groupParticipant.lid);
			push(groupParticipant.phoneNumber);
			if (groupParticipant.imgUrl && groupParticipant.imgUrl !== "changed") {
				return { jids: ordered, imgUrl: groupParticipant.imgUrl };
			}
		}
	}

	const lidJid = ordered.find(isLidJid);
	if (lidJid) {
		push(await resolvePnFromLid(sock, lidJid));
	}

	return { jids: ordered, imgUrl: null };
};

const sanitizeFileName = (value) =>
	String(value || "contacto")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
		.replace(/\s+/g, "_")
		.slice(0, 80) || "contacto";

const downloadImageFromUrl = async (url, outputPath) => {
	const response = await axios.get(url, { responseType: "arraybuffer" });
	await writeFile(outputPath, Buffer.from(response.data));
};

const downloadProfilePicture = async (sock, profileTargets, outputPath) => {
	if (profileTargets.imgUrl) {
		try {
			await downloadImageFromUrl(profileTargets.imgUrl, outputPath);
			return true;
		} catch {}
	}

	for (const jid of profileTargets.jids) {
		try {
			const url = await sock.profilePictureUrl(jid, "image");
			await downloadImageFromUrl(url, outputPath);
			return true;
		} catch {}
	}

	try {
		await unlink(outputPath);
	} catch {}
	return false;
};

const runPicScript = (command) =>
	new Promise((resolve, reject) => {
		exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(new Error(stderr || error.message));
				return;
			}
			resolve(stdout.trim());
		});
	});

module.exports.run = async (sock, msg) => {
	const contextInfo = getContextInfo(msg);
	const quoted = contextInfo?.quotedMessage;
	const messageText = getQuotedText(quoted);

	if (!quoted || !messageText) {
		await sock.sendMessage(
			msg.key.remoteJid,
			{
				text: `Responde a un mensaje con *${prefix}pic* para guardarlo como imagen con foto de perfil y nombre de WhatsApp.`,
			},
			{ quoted: msg },
		);
		return;
	}

	const pyCmd = py_cmd_pic || (process.platform === "win32" ? "python lib/converter/pic.py" : "python3 lib/converter/pic.py");
	const tempDir = path.resolve("./temp");
	const avatarPath = path.join(tempDir, "pic_avatar.jpg");
	const metaPath = path.join(tempDir, "pic_meta.json");
	const outputPath = path.join(tempDir, "pic_out.png");

	try {
		await mkdir(tempDir, { recursive: true });

		const participantJid = normalizeJid(contextInfo?.participant || "");
		const participantPn = normalizeJid(
			contextInfo?.participantAlt ||
				contextInfo?.placeholderKey?.participantAlt ||
				contextInfo?.placeholderKey?.remoteJidAlt ||
				"",
		);

		const displayName = await resolveDisplayName(sock, {
			contextInfo,
			participantJid,
			participantPn,
			remoteJid: msg.key.remoteJid,
		});
		const profileTargets = await resolveProfileJids(sock, {
			participantJid,
			participantPn,
			remoteJid: msg.key.remoteJid,
		});
		const hasAvatar = await downloadProfilePicture(sock, profileTargets, avatarPath);

		await writeFile(
			metaPath,
			JSON.stringify(
				{
					name: displayName,
					message: messageText,
					avatar: hasAvatar ? avatarPath : null,
					output: outputPath,
				},
				null,
				2,
			),
			"utf8",
		);

		await runPicScript(pyCmd);

		const storageDir = path.resolve("./media_storage/pic");
		await mkdir(storageDir, { recursive: true });
		const stamp = `${new Date().toLocaleDateString().replaceAll("/", "-")}T${new Date()
			.toLocaleTimeString()
			.replaceAll(":", "-")}`;
		const storagePath = path.join(storageDir, `${sanitizeFileName(displayName)}_${stamp}.png`);
		await copyFile(outputPath, storagePath);

		const imageBuffer = await readFile(outputPath);
		await sock.sendMessage(
			msg.key.remoteJid,
			{
				image: imageBuffer,
				caption: `Mensaje de *${displayName}*`,
			},
			{ quoted: msg },
		);

		for (const file of [avatarPath, metaPath, outputPath]) {
			try {
				await unlink(file);
			} catch {}
		}
	} catch (e) {
		await errorHandler(sock, msg, module.exports.config.name, e);
	}
};

module.exports.config = {
	name: "pic",
	alias: ["p"],
	type: "misc",
	description: "Responde a un mensaje para guardarlo como imagen con su foto de perfil y nombre de WhatsApp.",
	expects: ["text"],
	returns: ["image"],
};
