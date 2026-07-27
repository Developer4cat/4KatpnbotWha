# 4ktbot

Bot de WhatsApp multipropósito basado en Baileys, con comandos, niveles y respuestas automáticas.

## Pre-requisitos

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/)
- Editor de tu preferencia (VS Code, etc.)

## Comenzando

```bash
git clone https://github.com/Developer4cat/4KatpnbotWha.git
cd 4KatpnbotWha
```

## Instalando

```bash
npm i
```

Copia `.envexample` a `.env` y completa tus valores (`prefix`, `owner`, `bot`, etc.).

## Arrancando

```bash
npm start
```

La primera vez se creará `auth_info` (sesión de WhatsApp). Vincula el número con el código de emparejamiento o QR según tu configuración.

Si falla, detén con `Ctrl+C` y vuelve a ejecutar `npm start`.

## Docker

```bash
docker compose up -d --build
```

## Desarrollo

Escrito en JavaScript/TypeScript con Node.js y [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

## Autor

- Developer4cat — [4KatpnbotWha](https://github.com/Developer4cat/4KatpnbotWha)
