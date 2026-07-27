const MAX_CONTENT_CHARS = 100;
const MAX_XP_PER_MESSAGE = 10;
const BURST_WINDOW_MS = 60_000;
const BURST_MAX_AWARDS = 8;

const trackers = new Map();

const trackerKey = (gid, uid) => `${gid}:${uid}`;

const normalizeContent = (content) =>
	String(content || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

const getTracker = (gid, uid) => {
	const key = trackerKey(gid, uid);
	if (!trackers.has(key)) {
		trackers.set(key, { lastMessage: "", awardTimes: [] });
	}
	return trackers.get(key);
};

const calcMessageXp = (content) => {
	const effectiveLength = Math.min(normalizeContent(content).length, MAX_CONTENT_CHARS);
	if (effectiveLength <= 0) return 0;
	const raw = parseInt(((Math.random() * effectiveLength) / 10).toFixed(0)) + 1;
	return Math.min(MAX_XP_PER_MESSAGE, raw);
};

/**
 * @returns {{ allowed: boolean, xp: number, reason?: string }}
 */
const evaluateRankAward = (gid, uid, content) => {
	const normalized = normalizeContent(content);
	if (!normalized.length) {
		return { allowed: false, xp: 0, reason: "empty" };
	}

	const tracker = getTracker(gid, uid);
	const now = Date.now();

	if (tracker.lastMessage === normalized) {
		return { allowed: false, xp: 0, reason: "duplicate" };
	}

	tracker.awardTimes = tracker.awardTimes.filter((ts) => now - ts < BURST_WINDOW_MS);
	if (tracker.awardTimes.length >= BURST_MAX_AWARDS) {
		return { allowed: false, xp: 0, reason: "burst" };
	}

	const xp = calcMessageXp(content);
	if (xp <= 0) {
		return { allowed: false, xp: 0, reason: "empty" };
	}

	tracker.lastMessage = normalized;
	tracker.awardTimes.push(now);
	return { allowed: true, xp };
};

const resetCounters = (gid, uid = null) => {
	if (uid) {
		trackers.delete(trackerKey(gid, uid));
		return 1;
	}
	let count = 0;
	const prefix = `${gid}:`;
	for (const key of [...trackers.keys()]) {
		if (key.startsWith(prefix)) {
			trackers.delete(key);
			count += 1;
		}
	}
	return count;
};

module.exports = {
	MAX_CONTENT_CHARS,
	MAX_XP_PER_MESSAGE,
	BURST_WINDOW_MS,
	BURST_MAX_AWARDS,
	calcMessageXp,
	evaluateRankAward,
	resetCounters,
};
