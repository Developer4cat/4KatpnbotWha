require("dotenv").config();
const { prefix } = process.env;
const { errorHandler } = require("../lib/functions");

const REGION_FLAGS = {
	latam: "-latam",
	can: "-can",
	eeuu: "-eeuu",
};

const COUNTRIES = [
	{
		id: "mex",
		aliases: ["mex", "mx", "mexico", "méxico"],
		name: "México",
		flag: "🇲🇽",
		region: "latam",
		zones: [
			{ tz: "America/Mexico_City", label: "Centro", primary: true },
			{ tz: "America/Cancun", label: "Sureste" },
			{ tz: "America/Mazatlan", label: "Pacífico (Sinaloa)" },
			{ tz: "America/Tijuana", label: "Pacífico (BC)" },
		],
	},
	{
		id: "gt",
		aliases: ["gt", "gua", "guatemala"],
		name: "Guatemala",
		flag: "🇬🇹",
		region: "latam",
		zones: [{ tz: "America/Guatemala", label: "Nacional", primary: true }],
	},
	{
		id: "hn",
		aliases: ["hn", "hon", "honduras"],
		name: "Honduras",
		flag: "🇭🇳",
		region: "latam",
		zones: [{ tz: "America/Tegucigalpa", label: "Nacional", primary: true }],
	},
	{
		id: "sv",
		aliases: ["sv", "slv", "salvador", "elsalvador"],
		name: "El Salvador",
		flag: "🇸🇻",
		region: "latam",
		zones: [{ tz: "America/El_Salvador", label: "Nacional", primary: true }],
	},
	{
		id: "ni",
		aliases: ["ni", "nic", "nicaragua"],
		name: "Nicaragua",
		flag: "🇳🇮",
		region: "latam",
		zones: [{ tz: "America/Managua", label: "Nacional", primary: true }],
	},
	{
		id: "cr",
		aliases: ["cr", "crc", "costarica"],
		name: "Costa Rica",
		flag: "🇨🇷",
		region: "latam",
		zones: [{ tz: "America/Costa_Rica", label: "Nacional", primary: true }],
	},
	{
		id: "pa",
		aliases: ["pa", "pan", "panama", "panamá"],
		name: "Panamá",
		flag: "🇵🇦",
		region: "latam",
		zones: [{ tz: "America/Panama", label: "Nacional", primary: true }],
	},
	{
		id: "col",
		aliases: ["col", "co", "colombia"],
		name: "Colombia",
		flag: "🇨🇴",
		region: "latam",
		zones: [{ tz: "America/Bogota", label: "Nacional", primary: true }],
	},
	{
		id: "ve",
		aliases: ["ve", "ven", "venezuela"],
		name: "Venezuela",
		flag: "🇻🇪",
		region: "latam",
		zones: [{ tz: "America/Caracas", label: "Nacional", primary: true }],
	},
	{
		id: "ec",
		aliases: ["ec", "ecu", "ecuador"],
		name: "Ecuador",
		flag: "🇪🇨",
		region: "latam",
		zones: [{ tz: "America/Guayaquil", label: "Continental", primary: true }],
	},
	{
		id: "pe",
		aliases: ["pe", "per", "peru", "perú"],
		name: "Perú",
		flag: "🇵🇪",
		region: "latam",
		zones: [{ tz: "America/Lima", label: "Nacional", primary: true }],
	},
	{
		id: "bo",
		aliases: ["bo", "bol", "bolivia"],
		name: "Bolivia",
		flag: "🇧🇴",
		region: "latam",
		zones: [{ tz: "America/La_Paz", label: "Nacional", primary: true }],
	},
	{
		id: "cl",
		aliases: ["cl", "chi", "chile"],
		name: "Chile",
		flag: "🇨🇱",
		region: "latam",
		zones: [
			{ tz: "America/Santiago", label: "Continental", primary: true },
			{ tz: "Pacific/Easter", label: "Isla de Pascua" },
		],
	},
	{
		id: "arg",
		aliases: ["arg", "ar", "argentina"],
		name: "Argentina",
		flag: "🇦🇷",
		region: "latam",
		zones: [{ tz: "America/Argentina/Buenos_Aires", label: "Nacional", primary: true }],
	},
	{
		id: "uy",
		aliases: ["uy", "uru", "uruguay"],
		name: "Uruguay",
		flag: "🇺🇾",
		region: "latam",
		zones: [{ tz: "America/Montevideo", label: "Nacional", primary: true }],
	},
	{
		id: "py",
		aliases: ["py", "par", "paraguay"],
		name: "Paraguay",
		flag: "🇵🇾",
		region: "latam",
		zones: [{ tz: "America/Asuncion", label: "Nacional", primary: true }],
	},
	{
		id: "br",
		aliases: ["br", "bra", "brasil", "brazil"],
		name: "Brasil",
		flag: "🇧🇷",
		region: "latam",
		zones: [
			{ tz: "America/Sao_Paulo", label: "Brasilia / SP / RJ", primary: true },
			{ tz: "America/Manaus", label: "Amazonas" },
			{ tz: "America/Rio_Branco", label: "Acre" },
			{ tz: "America/Noronha", label: "Fernando de Noronha" },
		],
	},
	{
		id: "cu",
		aliases: ["cu", "cub", "cuba"],
		name: "Cuba",
		flag: "🇨🇺",
		region: "latam",
		zones: [{ tz: "America/Havana", label: "Nacional", primary: true }],
	},
	{
		id: "do",
		aliases: ["do", "rd", "dom", "dominicana", "republicadominicana"],
		name: "Rep. Dominicana",
		flag: "🇩🇴",
		region: "latam",
		zones: [{ tz: "America/Santo_Domingo", label: "Nacional", primary: true }],
	},
	{
		id: "pr",
		aliases: ["pr", "puertorico"],
		name: "Puerto Rico",
		flag: "🇵🇷",
		region: "latam",
		zones: [{ tz: "America/Puerto_Rico", label: "Nacional", primary: true }],
	},
	{
		id: "usa",
		aliases: ["usa", "us", "eeuu", "eua", "estadosunidos"],
		name: "EE.UU.",
		flag: "🇺🇸",
		region: "eeuu",
		zones: [
			{ tz: "America/New_York", label: "Este (ET)", primary: true },
			{ tz: "America/Chicago", label: "Central (CT)" },
			{ tz: "America/Denver", label: "Montaña (MT)" },
			{ tz: "America/Los_Angeles", label: "Pacífico (PT)" },
			{ tz: "America/Anchorage", label: "Alaska" },
			{ tz: "Pacific/Honolulu", label: "Hawái" },
		],
	},
	{
		id: "can",
		aliases: ["can", "ca", "canada", "canadá"],
		name: "Canadá",
		flag: "🇨🇦",
		region: "can",
		zones: [
			{ tz: "America/Toronto", label: "Este (ET)", primary: true },
			{ tz: "America/Halifax", label: "Atlántico (AT)" },
			{ tz: "America/St_Johns", label: "Terranova (NT)" },
			{ tz: "America/Winnipeg", label: "Central (CT)" },
			{ tz: "America/Edmonton", label: "Montaña (MT)" },
			{ tz: "America/Vancouver", label: "Pacífico (PT)" },
		],
	},
];

const ALIAS_MAP = new Map();
for (const country of COUNTRIES) {
	for (const alias of country.aliases) {
		ALIAS_MAP.set(normalize(alias), country);
	}
}

function normalize(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function parseTimeToken(token) {
	const match = String(token || "").match(/^(\d{1,2})(?::(\d{2}))?(?:h)?$/i);
	if (!match) return null;

	const hour = parseInt(match[1], 10);
	const minute = match[2] != null ? parseInt(match[2], 10) : 0;
	if (hour > 23 || minute > 59) return null;

	return { hour, minute };
}

function getTodayParts(timeZone) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());

	const pick = (type) => parts.find((part) => part.type === type)?.value;
	return {
		year: parseInt(pick("year"), 10),
		month: parseInt(pick("month"), 10),
		day: parseInt(pick("day"), 10),
	};
}

function zonedTimeToDate(year, month, day, hour, minute, timeZone) {
	let utc = Date.UTC(year, month - 1, day, hour, minute, 0);

	for (let attempt = 0; attempt < 4; attempt += 1) {
		const probe = new Date(utc);
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hourCycle: "h23",
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
		}).formatToParts(probe);

		const pick = (type) => parseInt(parts.find((part) => part.type === type)?.value || "0", 10);
		const shownYear = pick("year");
		const shownMonth = pick("month");
		const shownDay = pick("day");
		const shownHour = pick("hour");
		const shownMinute = pick("minute");

		const targetDayIndex = Date.UTC(year, month - 1, day) / 86400000;
		const shownDayIndex = Date.UTC(shownYear, shownMonth - 1, shownDay) / 86400000;
		const diffMinutes =
			(targetDayIndex - shownDayIndex) * 24 * 60 +
			(hour - shownHour) * 60 +
			(minute - shownMinute);

		if (diffMinutes === 0) break;
		utc += diffMinutes * 60000;
	}

	return new Date(utc);
}

function formatClock(date, timeZone) {
	const parts = new Intl.DateTimeFormat("es-MX", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const hour = parts.find((part) => part.type === "hour")?.value || "00";
	const minute = parts.find((part) => part.type === "minute")?.value || "00";
	return `${hour}:${minute}`;
}

function formatDayKey(date, timeZone) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function dayOffsetLabel(sourceKey, targetKey) {
	if (sourceKey === targetKey) return "";
	const source = new Date(`${sourceKey}T12:00:00Z`);
	const target = new Date(`${targetKey}T12:00:00Z`);
	const diffDays = Math.round((target - source) / 86400000);
	if (diffDays === 1) return " (+1 día)";
	if (diffDays === -1) return " (-1 día)";
	if (diffDays > 1) return ` (+${diffDays} días)`;
	if (diffDays < -1) return ` (${diffDays} días)`;
	return "";
}

function pickZones(country, showAll) {
	if (showAll && country.zones.length > 1) return country.zones;
	const primary = country.zones.find((zone) => zone.primary) || country.zones[0];
	return [primary];
}

function parseArgs(rawArgs) {
	const tokens = (Array.isArray(rawArgs) ? rawArgs : [])
		.flat()
		.map((part) => String(part).trim())
		.filter(Boolean);

	const flags = new Set();
	const positional = [];

	for (const token of tokens) {
		const lower = token.toLowerCase();
		if (lower === "-all") {
			flags.add("all");
			continue;
		}
		if (Object.values(REGION_FLAGS).includes(lower)) {
			flags.add(lower);
			continue;
		}
		positional.push(token);
	}

	const time = parseTimeToken(positional[0]);
	const countryToken = positional[1] ? normalize(positional[1]) : null;

	return { time, countryToken, flags };
}

function resolveRegions(flags) {
	const selected = [REGION_FLAGS.latam, REGION_FLAGS.can, REGION_FLAGS.eeuu].filter((flag) =>
		flags.has(flag),
	);
	if (selected.length === 0) return new Set(["latam", "can", "eeuu"]);

	const map = {
		[REGION_FLAGS.latam]: "latam",
		[REGION_FLAGS.can]: "can",
		[REGION_FLAGS.eeuu]: "eeuu",
	};
	return new Set(selected.map((flag) => map[flag]));
}

function buildConversionLines(sourceDate, sourceZone, regions, showAll, skipCountryId) {
	const sourceDayKey = formatDayKey(sourceDate, sourceZone);
	const lines = [];

	for (const country of COUNTRIES) {
		if (!regions.has(country.region)) continue;

		const zones = pickZones(country, showAll);
		const skipAllZones = country.id === skipCountryId && zones.length === 1;

		if (skipAllZones) continue;

		if (zones.length === 1 || !showAll) {
			const zone = zones[0];
			const clock = formatClock(sourceDate, zone.tz);
			const dayNote = dayOffsetLabel(sourceDayKey, formatDayKey(sourceDate, zone.tz));
			const zoneLabel = zones.length === 1 && zone.label === "Nacional" ? "" : ` (${zone.label})`;
			lines.push(`${country.flag} ${country.name}${zoneLabel}: *${clock}*${dayNote}`);
			continue;
		}

		lines.push(`${country.flag} *${country.name}*`);
		for (const zone of zones) {
			const clock = formatClock(sourceDate, zone.tz);
			const dayNote = dayOffsetLabel(sourceDayKey, formatDayKey(sourceDate, zone.tz));
			lines.push(`  • ${zone.label}: *${clock}*${dayNote}`);
		}
	}

	return lines;
}

module.exports.run = async (sock, msg, args) => {
	const { time, countryToken, flags } = parseArgs(args[0]);

	if (!time || !countryToken) {
		await sock.sendMessage(
			msg.key.remoteJid,
			{
				text: [
					`Indica una hora y un país de origen.`,
					`Ejemplos:`,
					`• *${prefix}hora 8 col*`,
					`• *${prefix}hora 16:30 mex -latam*`,
					`• *${prefix}hora 14 arg -all*`,
					"",
					`Banderas:`,
					`• *-latam* · *-can* · *-eeuu* (filtra regiones)`,
					`• *-all* (muestra todas las zonas horarias regionales)`,
					"",
					`Países: col, mex, arg, pe, br, cl, usa, can, etc.`,
				].join("\n"),
			},
			{ quoted: msg },
		);
		return;
	}

	const sourceCountry = ALIAS_MAP.get(countryToken);
	if (!sourceCountry) {
		await sock.sendMessage(
			msg.key.remoteJid,
			{
				text: `No reconozco el país *${countryToken}*. Prueba con col, mex, arg, pe, usa, can, etc.`,
			},
			{ quoted: msg },
		);
		return;
	}

	try {
		const sourceZone = (sourceCountry.zones.find((zone) => zone.primary) || sourceCountry.zones[0]).tz;
		const today = getTodayParts(sourceZone);
		const sourceDate = zonedTimeToDate(
			today.year,
			today.month,
			today.day,
			time.hour,
			time.minute,
			sourceZone,
		);

		const regions = resolveRegions(flags);
		const showAll = flags.has("all");
		const sourceClock = `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
		const regionLabel = [...regions]
			.map((region) => ({ latam: "LatAm", can: "Canadá", eeuu: "EE.UU." }[region]))
			.join(" · ");

		const lines = buildConversionLines(sourceDate, sourceZone, regions, showAll, sourceCountry.id);
		const text = [
			`*${sourceClock}* en ${sourceCountry.flag} *${sourceCountry.name}*`,
			`_Equivalente en ${regionLabel}_`,
			"",
			...lines,
		].join("\n");

		await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
	} catch (e) {
		await errorHandler(sock, msg, module.exports.config.name, e);
	}
};

module.exports.config = {
	name: "hora",
	alias: ["time", "timezone", "zonahoraria"],
	type: "misc",
	description: `Convierte una hora entre zonas de LatAm, Canadá y EE.UU. Ej: ${prefix || "!"}hora 16 col -all`,
	expects: ["text"],
	returns: ["text"],
};
