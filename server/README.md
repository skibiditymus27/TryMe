# tryme Server

Privacy-first chat backend for the tryme client. Built with Express, TypeScript, and WebSockets, tested to run on Raspberry Pi 5 (8 GB RAM).

## Features

- REST API for health, directory lookups, display-name updates, and login token rotation
- WebSocket gateway stub that authenticates clients and echoes encrypted payloads (extend to real routing)
- Structured logging with Pino and HTTP logging middleware
- Environment validation via Zod, hardened middleware stack with Helmet + CORS
- Graceful shutdown support and typed configuration

## Getting Started

```bash
cd server
npm install
npm run dev
```

The server listens on the `PORT` defined in `.env` (defaults to `8081`).

### Environment configuration

Copy the sample file:

```bash
cp .env.example .env
```

Then adjust:

- `PORT` – listening port
- `CORS_ORIGIN` – comma-separated list of allowed origins (e.g. `http://localhost:8080` for the current frontend)
- `TOKEN_ROTATION_SECRET` – 64 char random string used to harden future token-proof endpoints

## Production build

```bash
npm run build
npm start
```

The build command compiles TypeScript into `dist/`. The start command runs the compiled JavaScript with Node.

## Raspberry Pi 5 deployment

Install Node.js 20 (ARM64). Recommended steps:

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential

cd /home/pi/tryme/server
npm ci
npm run build
NODE_ENV=production PORT=8081 node dist/index.js
```

To keep the service running:

1. Install PM2 (`npm install -g pm2`) or create a `systemd` unit file.
2. Ensure `.env` is configured with production values.
3. Use `pm2 start dist/index.js --name tryme-server` or configure a service unit that runs the compiled binary.

## API overview

- `GET /api/health` – readiness probe
- `GET /api/token` – returns a fresh 8-char login token
- `POST /api/token/rotate` – returns a new token, optionally logs the old one
- `GET /api/directory?query=...` – search public directory (placeholder data)
- `POST /api/profile/update` – updates display name (currently returns new value)
- WebSocket `ws://host:port/ws?id=<clientId>` – establishes a sample channel and echoes payloads

Extend these endpoints with persistence (PostgreSQL, Redis) and real E2E messaging once ready.
