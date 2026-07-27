require("dotenv").config();
const { prefix } = process.env;
const axios = require("axios").default;
const { errorHandler } = require("../lib/functions");

const WEATHER_LABELS = {
	0: "Despejado",
	1: "Mayormente despejado",
	2: "Parcialmente nublado",
	3: "Nublado",
	45: "Niebla",
	48: "Niebla con escarcha",
	51: "Llovizna ligera",
	53: "Llovizna moderada",
	55: "Llovizna intensa",
	56: "Llovizna helada ligera",
	57: "Llovizna helada intensa",
	61: "Lluvia ligera",
	63: "Lluvia moderada",
	65: "Lluvia fuerte",
	66: "Lluvia helada ligera",
	67: "Lluvia helada fuerte",
	71: "Nevada ligera",
	73: "Nevada moderada",
	75: "Nevada fuerte",
	77: "Granizo",
	80: "Chubascos ligeros",
	81: "Chubascos moderados",
	82: "Chubascos fuertes",
	85: "Nevadas ligeras",
	86: "Nevadas fuertes",
	95: "Tormenta",
	96: "Tormenta con granizo ligero",
	99: "Tormenta con granizo fuerte",
};

const weatherLabel = (code) => WEATHER_LABELS[code] || "Condición desconocida";

const normalizeText = (value) =>
	String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();

const pickLocation = (results, countryHint) => {
	if (!Array.isArray(results) || results.length === 0) return null;
	if (!countryHint) return results[0];

	const hint = normalizeText(countryHint);
	const match = results.find((row) => {
		const country = normalizeText(row.country);
		const admin1 = normalizeText(row.admin1);
		return country.includes(hint) || hint.includes(country) || admin1.includes(hint);
	});

	return match || results[0];
};

const geocodeCity = async (query) => {
	const parts = query.split(",").map((part) => part.trim()).filter(Boolean);
	const city = parts[0] || query;
	const countryHint = parts.slice(1).join(", ");

	const { data } = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
		params: {
			name: city,
			count: 10,
			language: "es",
			format: "json",
		},
		timeout: 15000,
	});

	const location = pickLocation(data.results, countryHint);
	if (!location) {
		throw new Error(`No encontré la ubicación "${query}".`);
	}

	return location;
};

const fetchWeather = async (latitude, longitude) => {
	const { data } = await axios.get("https://api.open-meteo.com/v1/forecast", {
		params: {
			latitude,
			longitude,
			current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
			daily: "temperature_2m_max,temperature_2m_min,weather_code",
			timezone: "auto",
			forecast_days: 1,
		},
		timeout: 15000,
	});

	if (!data?.current) {
		throw new Error("No se pudo obtener el clima para esa ubicación.");
	}

	return data;
};

const formatLocationName = (location) => {
	const chunks = [location.name, location.admin1, location.country].filter(Boolean);
	return chunks.join(", ");
};

module.exports.run = async (sock, msg, args) => {
	const query = Array.isArray(args[0]) ? args[0].join(" ").trim() : "";

	if (!query) {
		await sock.sendMessage(
			msg.key.remoteJid,
			{
				text: `Indica una ciudad. Ejemplo: *${prefix}clima Mérida, Mexico*`,
			},
			{ quoted: msg },
		);
		return;
	}

	try {
		const location = await geocodeCity(query);
		const weather = await fetchWeather(location.latitude, location.longitude);
		const current = weather.current;
		const daily = weather.daily;
		const place = formatLocationName(location);
		const condition = weatherLabel(current.weather_code);
		const todayCondition = daily?.weather_code?.[0] != null
			? weatherLabel(daily.weather_code[0])
			: condition;

		const text = [
			`*Clima en ${place}*`,
			"",
			`Estado: ${condition}`,
			`Temperatura: ${current.temperature_2m}°C`,
			`Sensación térmica: ${current.apparent_temperature}°C`,
			`Humedad: ${current.relative_humidity_2m}%`,
			`Viento: ${current.wind_speed_10m} km/h`,
			daily?.temperature_2m_max?.[0] != null && daily?.temperature_2m_min?.[0] != null
				? `Hoy: ${daily.temperature_2m_min[0]}°C / ${daily.temperature_2m_max[0]}°C · ${todayCondition}`
				: null,
			"",
			"_Fuente: Open-Meteo_",
		]
			.filter(Boolean)
			.join("\n");

		await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
	} catch (e) {
		const message = e?.response?.status === 404 || String(e.message || "").includes("No encontré")
			? `No encontré clima para *${query}*. Prueba con formato: *${prefix}clima Mérida, Mexico*`
			: e;
		await errorHandler(sock, msg, module.exports.config.name, message);
	}
};

module.exports.config = {
	name: "clima",
	alias: ["weather", "tiempo"],
	type: "misc",
	description: `Consulta el clima actual de una ciudad. Ejemplo: ${prefix || "!"}clima Mérida, Mexico`,
	expects: ["text"],
	returns: ["text"],
};
