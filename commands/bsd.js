require("dotenv").config();
const { prefix, owner } = process.env;
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { errorHandler } = require("../lib/functions");
const { resetRankGroup, resetRankUser, resetRankAntiSpam } = require("../lib/db");
const {
	normalizeJid,
	jidUser,
	resolveMessageAuthor,
	findGroupParticipant,
} = require("../lib/participant");

const BSD_CAPTION = "Kira queen, Daisan no bakudan, bite za dusto";
const BSD_GIF_PATH = path.resolve("./media/bsd/bite-za-dusto.gif");
const BSD_MP4_PATH = path.resolve("./media/bsd/bite-za-dusto.mp4");

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
			const participant = findGroupParticipant(
				meta.participants,
				token,
				`${token}@s.whatsapp.net`,
				`${token}@lid`,
			);
			if (participant) {
				return {
					uid: jidUser(participant.phoneNumber || participant.id || participant.lid),
					jid: normalizeJid(participant.id || participant.phoneNumber || participant.lid),
				};
			}
		}
	}

	return null;
};

const resolveFfmpegBinary = () => {
	if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
		return process.env.FFMPEG_PATH;
	}
	return "ffmpeg";
};

const runFfmpeg = (args, timeoutMs = 90000) =>
	new Promise((resolve, reject) => {
		const proc = spawn(resolveFfmpegBinary(), args, { stdio: ["ignore", "ignore", "pipe"] });
		let stderr = "";
		const timer = setTimeout(() => {
			proc.kill("SIGKILL");
			reject(new Error("ffmpeg excedió el tiempo límite"));
		}, timeoutMs);
		proc.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});
		proc.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		proc.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg falló (${code}): ${stderr.slice(-500)}`));
		});
	});

const gifToMp4File = async (gifPath, mp4Path) => {
	await runFfmpeg([
		"-y",
		"-i",
		gifPath,
		"-an",
		"-vf",
		"fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2",
		"-c:v",
		"libx264",
		"-profile:v",
		"baseline",
		"-pix_fmt",
		"yuv420p",
		"-movflags",
		"+faststart",
		mp4Path,
	]);
};

let cachedMp4Buffer = null;

const getBsdMp4Buffer = async () => {
	if (cachedMp4Buffer) return cachedMp4Buffer;
	if (!fs.existsSync(BSD_GIF_PATH)) {
		throw new Error(`No se encontró el gif en ${BSD_GIF_PATH}`);
	}
	if (!fs.existsSync(BSD_MP4_PATH)) {
		await gifToMp4File(BSD_GIF_PATH, BSD_MP4_PATH);
	}
	cachedMp4Buffer = fs.readFileSync(BSD_MP4_PATH);
	return cachedMp4Buffer;
};

const sendBsdGif = async (sock, remoteJid, msg) => {
	const mp4Buffer = await getBsdMp4Buffer();
	await sock.sendMessage(
		remoteJid,
		{
			video: mp4Buffer,
			caption: BSD_CAPTION,
			gifPlayback: true,
			ptv: false,
			mimetype: "video/mp4",
		},
		{ quoted: msg },
	);
};

module.exports.run = async (sock, msg, args) => {
	try {
		if (!isBotOwner(msg)) {
			return sock.sendMessage(
				msg.key.remoteJid,
				{ text: "Solo el dueño del bot puede usar este comando." },
				{ quoted: msg },
			);
		}

		if (!msg.key.remoteJid.endsWith("@g.us")) {
			return sock.sendMessage(
				msg.key.remoteJid,
				{ text: "Este comando solo funciona en grupos." },
				{ quoted: msg },
			);
		}

		const gid = msg.key.remoteJid.split("@")[0];
		const remoteJid = msg.key.remoteJid;
		const target = await resolveTarget(sock, msg, args);

		if (target) {
			await resetRankUser(gid, target.uid);
			resetRankAntiSpam(gid, target.uid);
		} else {
			await resetRankGroup(gid);
			resetRankAntiSpam(gid);
		}

		await sendBsdGif(sock, remoteJid, msg);

		if (target) {
			await sock.sendMessage(
				remoteJid,
				{
					text: `Nivel, XP y contadores reiniciados para @${jidUser(target.jid)}.`,
					mentions: [target.jid],
				},
				{ quoted: msg },
			);
			return;
		}

		await sock.sendMessage(
			remoteJid,
			{ text: "Nivel, XP y contadores reiniciados para todo el grupo." },
			{ quoted: msg },
		);
	} catch (e) {
		await errorHandler(sock, msg, module.exports.config.name, e);
	}
};

module.exports.config = {
	name: "bsd",
	alias: ["bitezadusto", "bitesadusto"],
	type: "admin",
	description: `Reinicia rank del grupo a 0 (solo dueño) con gif de Killer Queen.`,
	expects: ["none", "mention"],
	returns: ["gif", "text"],
};
