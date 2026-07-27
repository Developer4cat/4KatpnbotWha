const normalizeJid = (jid) => String(jid || "").replace(/:\d+(?=@)/, "");

const jidUser = (jid) => normalizeJid(jid).split("@")[0];

const isLidJid = (jid) => normalizeJid(jid).endsWith("@lid");

const isPnJid = (jid) => normalizeJid(jid).endsWith("@s.whatsapp.net");

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

const resolveMessageAuthor = (key) => {
	const participantPn = key?.participantPn;
	const participantAlt = key?.participantAlt;
	const participant = key?.participant;

	let jid = null;
	if (participantPn) jid = normalizeJid(participantPn);
	else if (participantAlt && isPnJid(participantAlt)) jid = normalizeJid(participantAlt);
	else if (participant && !String(participant).endsWith("@g.us")) jid = normalizeJid(participant);

	if (!jid) return null;

	return {
		uid: jidUser(jid),
		jid,
	};
};

const guessJidFromStoredUid = (uid) => {
	const value = String(uid || "");
	if (!value) return null;
	if (value.includes("@")) return normalizeJid(value);
	if (value.length > 14) return `${value}@lid`;
	return `${value}@s.whatsapp.net`;
};

const buildParticipantIndex = (participants) => {
	const index = new Map();
	for (const participant of participants) {
		const notify =
			participant.notify ||
			participant.name ||
			participant.verifiedName ||
			participant.username ||
			null;
		const mentionJid = normalizeJid(
			participant.id || participant.phoneNumber || participant.lid,
		);
		if (!mentionJid) continue;

		const entry = { notify, mentionJid };
		for (const field of [participant.id, participant.phoneNumber, participant.lid, mentionJid]) {
			if (!field) continue;
			const normalized = normalizeJid(field);
			index.set(normalized, entry);
			index.set(jidUser(normalized), entry);
		}
	}
	return index;
};

const resolveParticipantLabel = async (sock, remoteJid, storedUid, participants = null) => {
	const guessedJid = guessJidFromStoredUid(storedUid);
	const metaParticipants =
		participants ||
		(remoteJid?.endsWith("@g.us")
			? (await sock.groupMetadata(remoteJid)).participants
			: []);

	const index = buildParticipantIndex(metaParticipants);
	const indexed =
		index.get(String(storedUid)) ||
		index.get(jidUser(String(storedUid))) ||
		(guessedJid ? index.get(guessedJid) || index.get(jidUser(guessedJid)) : null);

	if (indexed?.notify) {
		return {
			label: indexed.notify,
			mentionJid: indexed.mentionJid,
		};
	}

	const groupParticipant = findGroupParticipant(
		metaParticipants,
		guessedJid,
		storedUid,
	);

	const label =
		groupParticipant?.notify ||
		groupParticipant?.name ||
		groupParticipant?.verifiedName ||
		groupParticipant?.username;

	const mentionJid = normalizeJid(
		indexed?.mentionJid ||
			groupParticipant?.id ||
			groupParticipant?.phoneNumber ||
			groupParticipant?.lid ||
			guessedJid,
	);

	if (label) {
		return { label, mentionJid };
	}

	let pnJid = groupParticipant?.phoneNumber ? normalizeJid(groupParticipant.phoneNumber) : null;
	if (!pnJid && guessedJid && isLidJid(guessedJid)) {
		pnJid = await resolvePnFromLid(sock, guessedJid);
	}

	if (pnJid && mentionJid) {
		return {
			label: jidUser(pnJid),
			mentionJid,
		};
	}

	return {
		label: jidUser(mentionJid || storedUid) || "Contacto",
		mentionJid,
	};
};

const formatRankLine = (position, mentionJid, level, xp) => {
	const token = jidUser(mentionJid);
	return `${position}-. @${token} ~ Nivel: ${level} ~ Experiencia: ${xp}\n`;
};

module.exports = {
	normalizeJid,
	jidUser,
	isLidJid,
	isPnJid,
	findGroupParticipant,
	resolvePnFromLid,
	resolveMessageAuthor,
	buildParticipantIndex,
	guessJidFromStoredUid,
	resolveParticipantLabel,
	formatRankLine,
};
