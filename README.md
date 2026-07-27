# 4ktbot

Bot de WhatsApp multipropósito. Se conecta como dispositivo vinculado (Baileys), no usa la Cloud API oficial de Meta.

Funciones principales:

- Comandos con prefijo (`!help`, stickers, descargas, clima, hora, etc.)
- Sistema de niveles / rank en grupos
- Respuestas automáticas con Ollama (opcional)
- Modo Docker o ejecución local con Node.js

Repositorio: [Developer4cat/4KatpnbotWha](https://github.com/Developer4cat/4KatpnbotWha)

---

## Tabla de contenidos

1. [Requisitos](#requisitos)
2. [Instalación rápida](#instalación-rápida)
3. [Configurar `.env`](#configurar-env)
4. [Primer arranque y vinculación](#primer-arranque-y-vinculación)
5. [Uso del bot](#uso-del-bot)
6. [Comandos destacados](#comandos-destacados)
7. [Niveles y rank](#niveles-y-rank)
8. [Ollama (chat automático)](#ollama-chat-automático)
9. [Docker](#docker)
10. [Scripts de ayuda](#scripts-de-ayuda)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Troubleshooting](#troubleshooting)
13. [Notas importantes](#notas-importantes)

---

## Requisitos

### Mínimos (modo local)

| Herramienta | Para qué |
|-------------|----------|
| [Node.js](https://nodejs.org/) 18+ (recomendado 20/22/24) | Runtime del bot |
| npm | Dependencias |
| [Git](https://git-scm.com/) | Clonar el repo |
| Número de WhatsApp | El que usará el bot |

### Recomendados

| Herramienta | Para qué |
|-------------|----------|
| [FFmpeg](https://ffmpeg.org/) en PATH | Stickers, audio, conversiones |
| Python 3 | Conversores en `lib/converter/` (pic, gif, etc.) |
| [Ollama](https://ollama.com/) | Respuestas automáticas con IA |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Si prefieres contenedor |

### Windows

1. Instala Node.js y marca la opción de agregar al PATH.
2. Instala FFmpeg y asegúrate de poder ejecutar `ffmpeg -version` en una terminal nueva.
3. Si usas Python, instala dependencias con `pip install -r requirements.txt`.

### macOS / Linux

```bash
# Ejemplo macOS con Homebrew
brew install node ffmpeg python3
```

---

## Instalación rápida

```bash
git clone https://github.com/Developer4cat/4KatpnbotWha.git
cd 4KatpnbotWha
npm i
```

Crea tu configuración:

```bash
# Windows (CMD)
copy .envexample .env

# macOS / Linux
cp .envexample .env
```

Edita `.env` (ver sección siguiente) y arranca:

```bash
npm start
```

En Windows también puedes usar `start.bat`.

---

## Configurar `.env`

Copia `.envexample` → `.env` y completa al menos estos campos:

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `prefix` | Sí | Prefijo de comandos. Ejemplo: `!` |
| `owner` | Sí | Tu número (dueño). Formato: código país + número, sin `+` ni espacios. Ej: `5215512345678` |
| `bot` | Sí (primera vez) | Número del bot, mismo formato. Se usa para pedir el código de vinculación |
| `port` | No | Puerto del health-check HTTP. Default: `4000` |
| `channel` | No | URL del canal de WhatsApp (aparece en mensajes de ayuda) |
| `token` | No | Token de BotFather si usas `!stelegram` |
| `FFMPEG_PATH` | No | Ruta completa a `ffmpeg` si no está en PATH |
| `py_cmd_img` / `py_cmd_vid` / `py_cmd_gif` / `py_cmd_pic` | No | Comandos Python para conversores. En Docker ya vienen definidos |
| `OLLAMA_HOST` | No | URL de Ollama. Default: `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | No | Modelo. Ej: `llama3.1:8b` |
| `OLLAMA_CONTEXT_LIMIT` | No | Mensajes de historial que se envían al modelo |
| `BOT_MENU_IDENTIFIERS` | No | Palabras que “llaman” al bot en grupos (`bot,chip,4ktbot`) |
| `OLLAMA_SYSTEM_PROMPT` | No | Personalidad / instrucciones del asistente |

### Ejemplo mínimo

```env
prefix=!
owner=5215512345678
bot=5215512345678
port=4000
```

> **Importante:** nunca subas tu `.env` a GitHub. Ya está en `.gitignore`.

---

## Primer arranque y vinculación

1. Ejecuta `npm start`.
2. Debe aparecer algo como:
   - `Aplicacion corriendo en el puerto 4000.`
   - `Cliente listo`
   - `Codigo de verificacion: XXXX-XXXX` (si `bot` está bien configurado)
3. En el teléfono del número del bot:
   - WhatsApp → **Dispositivos vinculados** → **Vincular dispositivo**
   - Elige **vincular con número de teléfono**
   - Escribe el código que imprimió la consola
4. Cuando veas `WhatsApp conectado.`, ya está listo.

La sesión se guarda en `auth_info/`. Mientras no borres esa carpeta, no deberías volver a vincular.

### Health check

Abre en el navegador:

```
http://localhost:4000/
```

Deberías ver: `{"info":"En linea"}`.

---

## Uso del bot

### Comandos

Formato general:

```text
{prefix}comando argumentos
```

Ejemplos (con `prefix=!`):

```text
!help
!sticker
!clima Mérida, Mexico
!hora 16 col -all
!rank
```

También puedes usar el atajo:

```text
chip help
```

(en lugar de `!help`, según la lógica del router).

### En grupos

- Menciona al bot, respóndele un mensaje, o usa un identificador de `BOT_MENU_IDENTIFIERS` (ej. “4ktbot menu”).
- Pedir menú: `menu` / `comandos` junto con mención o identificador.
- Saludos simples pueden responderse si Ollama/memoria están activados.

### Chat privado

Si memoria + Ollama están activos, el bot puede:

- Responder saludos
- Mostrar el menú si pides “menu/comandos”
- Orientarte si envías imagen/sticker/video/enlace
- Contestar texto libre con el modelo

---

## Comandos destacados

Usa `!help` dentro de WhatsApp para la lista completa. Resumen:

| Tipo | Ejemplos |
|------|----------|
| Utilidad | `help`, `clima`, `hora`, `lang`, `suggest` |
| Multimedia | `sticker`, `toimg`, `tovideo`, `toaudio`, `attp`, `tts`, `pic` |
| Descargas | `tiktok`, `tkaudio`, `igdownload`, `fbdownload`, `ytmp4`, `tuiter`, `pinterest` |
| Grupos | `tagall`, `edchat`, `level`, `rank`, `edrank` |
| Admin / dueño | `rankadmin`, `bsd`, `edollama`, `edmemory` |
| Stickers TG | `stelegram` (requiere `token`) |

### Ejemplos de uso

```text
!sticker
```

Envía o responde a una imagen/video/gif.

```text
!hora 16 col -all
```

Convierte las 16:00 de Colombia a otras zonas.

```text
!clima Ciudad de Mexico
```

```text
!tiktok https://www.tiktok.com/...
```

```text
!edrank
```

Activa/desactiva niveles en el grupo (según permisos del comando).

---

## Niveles y rank

En grupos, el bot puede dar XP por mensajes (si el sistema está activo).

| Comando | Qué hace |
|---------|----------|
| `!level` | Tu nivel / XP (o el de un mencionado) |
| `!rank` | Top del grupo |
| `!edrank` | Enciende/apaga el sistema de niveles |
| `!rankadmin` | Admin del rank (solo dueño): reset, XP, nivel, etc. |
| `!bsd` | Reinicia rank del grupo (solo dueño) |

La data se guarda en `db/` (local, no se sube al repo).

---

## Ollama (chat automático)

1. Instala Ollama y descarga un modelo:

```bash
ollama pull llama3.1:8b
ollama serve
```

2. En `.env`:

```env
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

3. En el chat (WhatsApp), activa por conversación:

```text
!edmemory
!edollama
```

Opciones útiles de `!edollama`:

```text
!edollama on
!edollama off
!edollama --cada 50
```

`--cada N` controla cada cuántos mensajes puede responder solo en grupos (además de menciones / contexto).

### Docker + Ollama en el host

El `docker-compose.yml` apunta a `host.docker.internal:11434`. Ollama debe estar corriendo en la máquina anfitriona y escuchar conexiones entrantes.

---

## Docker

### Requisitos

- Docker Desktop (Windows/macOS) o Docker Engine (Linux)
- Archivo `.env` ya configurado en la raíz del proyecto

### Arranque

```bash
docker compose up -d --build
```

O con scripts:

| SO | Script |
|----|--------|
| Windows | `docker-rebuild.bat` |
| macOS/Linux | `./docker-rebuild.sh` / `./docker-start.sh` |
| Detener | `docker-stop.bat` / `./docker-stop.sh` |

### Volúmenes importantes

Se montan para no perder sesión ni datos:

- `.env`
- `auth_info/`
- `db/`
- `temp/`
- `media_storage/`
- `logs.txt`

### Logs

```bash
docker compose logs -f 4ktbot
```

---

## Scripts de ayuda

| Archivo | Uso |
|---------|-----|
| `start.bat` | Arranca con `npm start` (Windows) |
| `stop.bat` | Intenta detener el proceso en el puerto 4000 / Node |
| `docker-rebuild.*` | Rebuild limpio + up |
| `docker-start.sh` | Solo `compose up` |
| `docker-stop.*` | Baja contenedores |

---

## Estructura del proyecto

```text
.
├── index.ts              # Entrada: socket Baileys + router de mensajes
├── commands/             # Un archivo = un comando
├── lib/                  # DB, helpers, Ollama, conversores
├── auth_info/            # Sesión WhatsApp (NO subir)
├── db/                   # Datos locales: niveles, memoria, etc. (NO subir)
├── media_storage/        # Media temporal de chats (NO subir)
├── .env                  # Secretos locales (NO subir)
├── .envexample           # Plantilla pública
├── docker-compose.yml
└── Dockerfile
```

Para agregar un comando nuevo: copia `template.js`, implementa `run` + `config`, y reinicia el bot.

---

## Troubleshooting

### No aparece código de vinculación

- Verifica que `bot=` en `.env` tenga el número completo (código país + número), sin `+`, espacios ni guiones.
- Borra `auth_info/` solo si quieres forzar una sesión nueva, reinicia, y espera el código.
- Si WhatsApp dice que el código expiró, reinicia el bot para generar otro.

### “Connection closed” / se desconecta seguido

- Revisa internet estable.
- No uses el mismo número en demasiados dispositivos vinculados.
- Si te deslogueó del todo (`loggedOut`), borra `auth_info/` y vuelve a vincular.
- Evita reinicios agresivos en bucle; espera unos segundos entre intentos.

### El bot no responde a comandos

1. Confirma en consola: `WhatsApp conectado.`
2. Prueba en privado: `!help`
3. Revisa que el prefijo del `.env` sea el que estás escribiendo.
4. En grupos, asegúrate de que el bot no esté restringido (solo admins) si aplica.
5. Mira errores en consola / `logs.txt`.

### Stickers / audio / video fallan

- Instala FFmpeg y verifica `ffmpeg -version`.
- O define `FFMPEG_PATH` en `.env` a la ruta absoluta del ejecutable.
- En Docker, FFmpeg ya viene en la imagen; si falla, reconstruye: `docker compose build --no-cache`.

### Descargas (TikTok, IG, YT, etc.) fallan

- Esas webs cambian mucho; a veces el scraper se rompe temporalmente.
- Prueba otro enlace / otra red.
- Actualiza dependencias (`npm i`) y reinicia.
- Algunos contenidos privados o con restricción de región no se pueden bajar.

### Ollama no responde

- `ollama list` debe mostrar el modelo de `OLLAMA_MODEL`.
- Prueba: `curl http://127.0.0.1:11434/api/tags`
- Activa `!edmemory` y `!edollama` en ese chat.
- En Docker, confirma que el contenedor pueda llegar a `host.docker.internal:11434`.

### Puerto 4000 ocupado

Cambia `port=` en `.env`, o cierra el proceso que lo usa:

```bat
REM Windows
stop.bat
```

```bash
# macOS/Linux ejemplo
lsof -i :4000
kill <PID>
```

### Error al instalar dependencias (`npm i`)

- Usa una versión LTS de Node.
- Borra `node_modules` e intenta de nuevo:

```bash
rm -rf node_modules
npm i
```

- En Windows, ejecuta la terminal como usuario normal (no siempre hace falta admin); evita rutas con permisos raros.

### Docker: “Falta el archivo .env”

Crea `.env` desde `.envexample` antes de `docker compose up`.

### Docker build falla en `npm ci`

El Dockerfile espera `package-lock.json`. Si no existe en tu copia:

```bash
npm i --package-lock-only
```

Luego vuelve a construir. (Si tu `.gitignore` local ignora el lockfile, genéralo solo para el build o ajusta el Dockerfile a `npm i`.)

### Quiero empezar de cero (sesión)

1. Detén el bot.
2. Borra la carpeta `auth_info/`.
3. Arranca de nuevo y vuelve a vincular.

> No borres `db/` si quieres conservar niveles y configuraciones de chats.

### El dueño no recibe errores / no puede usar admin

- `owner` debe ser exactamente tu número en formato internacional sin `+`.
- Los comandos de dueño validan contra ese valor.

---

## Notas importantes

1. **No oficial.** Este bot usa Baileys (protocolo tipo WhatsApp Web). Puede romperse si WhatsApp cambia el protocolo. Úsalo bajo tu propio riesgo.
2. **Riesgo de ban.** Automatizar WhatsApp puede violar términos de Meta. Usa un número secundario si es posible.
3. **Privacidad.** El `owner` puede recibir reportes de error; no pongas el bot en grupos sensibles sin avisar.
4. **Secretos.** Nunca subas `.env`, `auth_info/`, `db/` ni zips con sesión.
5. **Recursos.** Descargas y Ollama pueden consumir CPU/RAM/disco; vigila `temp/` y `media_storage/`.

---

## Autor

Developer4cat — [4KatpnbotWha](https://github.com/Developer4cat/4KatpnbotWha)


## PD:
valentina, si estás leyendo esto, por este motivo no he empezado a chambear, tuve que hacer este commit.
