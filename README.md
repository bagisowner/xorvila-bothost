# BotCloud - Production Bot Hosting Platform

A sleek, enterprise-grade bot hosting platform engineered for Python & Node.js bots. Features a modern glass/hollow UI with electric blue and deep purple accents, isolated Docker containers, live WebSocket terminal, web file manager, SFTP, resource telemetry, automated backups, and multi-node cluster management.

## Key Capabilities

- **Strict Container Isolation**: Non-root container runtime (`uid 1000`) with bounded CPU cgroups, memory limits, and storage quotas.
- **Interactive Live Terminal**: Real-time bidirectional WebSocket console with ANSI color decoding, auto-scroll, command execution, and log export.
- **Comprehensive File Manager**: Built-in code editor for `.py`, `.js`, `.ts`, `.json`, `.env`, `.yml`, `.md`, drag-and-drop file upload, ZIP archiver/extractor, and permission viewer.
- **Isolated SFTP Access**: Automatic SFTP credential generation and isolated paths (`/server`) for FileZilla, Cyberduck, and WinSCP.
- **Live Resource Telemetry**: Real-time graphs for CPU %, RAM MB, Storage, Network RX/TX, and PID count.
- **Git Continuous Deployment**: One-click repository branch cloning, auto dependency resolution, and live deployment streaming.
- **Enterprise Security**: 2FA verification, API Tokens, Role-Based Access Control (`User`, `Moderator`, `Admin`), and comprehensive Audit Logs.
- **Cluster Administration**: Multi-node daemon balancing, user suspension, server reallocation, and system health checks.

## Architecture

```text
├── apps/
│   ├── web/           # React 19 + TypeScript + Tailwind CSS Frontend
│   └── api/           # Express REST API + WebSocket Server
├── server/
│   ├── dockerSimulation.ts # Real-time container state machine & telemetry
│   ├── store.ts            # Persistent state store & seed datasets
│   └── routes/             # Auth, Server, Admin, File & Docs endpoints
├── infrastructure/
│   ├── postgres/      # PostgreSQL DDL migrations & indexes
│   └── nginx/         # Nginx reverse proxy & rate limiter
└── docker/
    ├── python/        # Python 3.9 - 3.13 base images
    └── node/          # Node.js 18 - 24 base images
```
