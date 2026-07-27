require("dotenv").config();
const { prefix } = process.env;
const { buildStickerBuffer, errorHandler } = require("../lib/functions");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

const pick = (...values) => values.find((value) => value != null);

const resolveStickerSource = (msg) => {
	const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
	const viewOnce = msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message;
	const quotedViewOnce = quoted?.viewOnceMessage?.message || quoted?.viewOnceMessageV2?.message;

	const imageMessage = pick(
		msg.message?.imageMessage,
		quoted?.imageMessage,
		viewOnce?.imageMessage,
		quotedViewOnce?.imageMessage,
	);
	const videoMessage = pick(
		msg.message?.videoMessage,
		quoted?.videoMessage,
		viewOnce?.videoMessage,
		quotedViewOnce?.videoMessage,
	);

	if (imageMessage?.mimetype === "image/gif") {
		return { media: imageMessage, kind: "gif", downloadType: "image" };
	}
	if (imageMessage) {
		return { media: imageMessage, kind: "image", downloadType: "image" };
	}
	if (videoMessage) {
		const kind = videoMessage.gifPlayback ? "gif" : "video";
		return { media: videoMessage, kind, downloadType: "video" };
	}
	return null;
};

module.exports.run = async (sock, msg, args) => {
	const source = resolveStickerSource(msg);
	if (!source) {
		await sock.sendMessage(
			msg.key.remoteJid,
			{
				text: `Envía una imagen/vídeo/gif con el comando *${prefix}sticker*, o bien responde a uno ya enviado.`,
			},
			{ quoted: msg },
		);
		return;
	}

	try {
		const { media, kind, downloadType } = source;
		const stream = await downloadContentFromMessage(media, downloadType).catch(async (e) => {
			await errorHandler(sock, msg, "sticker", e);
			return null;
		});
		if (!stream) return;

		const chunks = [];
		for await (const chunk of stream) {
			chunks.push(chunk);
		}
		const buffer = Buffer.concat(chunks);

		const remoteJid = msg.key.remoteJid.split("@")[0];
		const storageDir = path.resolve("./media_storage/vo");
		fs.mkdirSync(storageDir, { recursive: true });
		const ext = kind === "image" ? "jpg" : kind === "gif" ? "gif" : "mp4";
		const storagePath = path.join(
			storageDir,
			`${media.viewOnce === true ? "vo-" : ""}${remoteJid}D${new Date().toLocaleDateString().replaceAll("/", "-")}T${new Date().toLocaleTimeString().replaceAll(":", "-")}.${ext}`,
		);
		fs.writeFile(storagePath, buffer, () => {});

		const stickerBuffer = await buildStickerBuffer(buffer, kind).catch(async (e) => {
			await errorHandler(sock, msg, "sticker", e);
			return null;
		});
		if (!stickerBuffer) return;

		await sock
			.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer }, { quoted: msg })
			.catch(async (e) => {
				await errorHandler(sock, msg, module.exports.config.name, e);
			});
	} catch (e) {
		await errorHandler(sock, msg, module.exports.config.name, e);
	}
};

module.exports.config = {
	name: "sticker",
	alias: [`s`],
	type: "misc",
	description: `Envía un sticker a partir de una imagen/vídeo/gif, ya sea enviada o respondiendo a uno ya enviado.`,
	expects: ['image', 'video', 'gif'],
	returns: ['sticker']
};
