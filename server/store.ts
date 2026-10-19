import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  User,
  BotServer,
  ServerBackup,
  ServerNode,
  AuditLog,
  ConsoleLogLine,
  ApiToken,
  SystemNotification
} from '../src/types';
import { db } from './dbBridge';

// In-memory + Python Database backed data store for Xorvila
export interface ServerDataStore {
  users: Map<string, User & { passwordHash: string; twoFactorSecret?: string }>;
  sessions: Map<string, { userId: string; expiresAt: number }>;
  tokens: Map<string, ApiToken>;
  servers: Map<string, BotServer>;
  files: Map<string, Map<string, { content: string; updatedAt: string; permissions: string; isBase64?: boolean; size?: number }>>;
  backups: Map<string, ServerBackup[]>;
  logs: Map<string, ConsoleLogLine[]>;
  nodes: Map<string, ServerNode>;
  auditLogs: AuditLog[];
  notifications: Map<string, SystemNotification>;
}

export const store: ServerDataStore = {
  users: new Map(),
  sessions: new Map(),
  tokens: new Map(),
  servers: new Map(),
  files: new Map(),
  backups: new Map(),
  logs: new Map(),
  nodes: new Map(),
  auditLogs: [],
  notifications: new Map()
};

// Real System Host Node with actual OS specs
const cpus = os.cpus();
const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
const freeRamMb = Math.round(os.freemem() / (1024 * 1024));
const usedRamMb = totalRamMb - freeRamMb;

const hostEngineNode: ServerNode = {
  id: 'host-xorvila-core',
  name: 'Bot Hosting Node 01 (streaming files to its codebase or u can storage)',
  hostname: os.hostname() || 'host.xorvila.internal',
  ip: '127.0.0.1',
  location: 'Xorvila Local Host Environment',
  dockerVersion: `Linux ${os.release()} (${os.arch()})`,
  status: 'online',
  totalCpu: (cpus.length || 2) * 100,
  usedCpu: 5,
  totalRam: totalRamMb || 8192,
  usedRam: usedRamMb || 512,
  totalDisk: 100000, // 100 GB
  usedDisk: 1200,
  serversCount: 0
};

store.nodes.set(hostEngineNode.id, hostEngineNode);

// Hydrate store from Python Smart Database
export function hydrateStoreFromDb() {
  try {
    // 1. Initialize DB tables
    db.init();

    // 2. Load all records from SQLite
    const data = db.getAll();

    if (data.users && Array.isArray(data.users)) {
      store.users.clear();
      data.users.forEach(u => {
        store.users.set(u.id, u);
      });
    }

    if (data.sessions && typeof data.sessions === 'object') {
      store.sessions.clear();
      Object.entries(data.sessions).forEach(([token, sess]) => {
        store.sessions.set(token, sess);
      });
    }

    if (data.tokens && Array.isArray(data.tokens)) {
      store.tokens.clear();
      data.tokens.forEach(t => {
        store.tokens.set(t.token, t);
      });
    }

    if (data.servers && Array.isArray(data.servers)) {
      store.servers.clear();
      data.servers.forEach(s => {
        const sWithDefaults = {
          ...s,
          stats: s.stats || {
            cpuUsage: 0,
            ramUsage: 0,
            ramLimit: s.ramLimit || 512,
            storageUsage: 0,
            storageLimit: s.storageLimit || 2048,
            netRx: 0,
            netTx: 0,
            pids: 0,
            uptimeSeconds: 0
          },
          sftp: s.sftp || {
            host: s.nodeId || 'host-xorvila-core',
            port: 2022,
            username: s.id ? s.id.replace(/-/g, '_') : 'sftp_user',
            password: 'sftp_' + Math.random().toString(36).substring(2, 12)
          }
        };
        store.servers.set(s.id, sWithDefaults as any);
      });
      hostEngineNode.serversCount = data.servers.length;
    }

    if (data.files && typeof data.files === 'object') {
      Object.entries(data.files).forEach(([serverId, fileList]) => {
        const fileMap = new Map<string, { content: string; updatedAt: string; permissions: string; isBase64?: boolean; size?: number }>();
        fileList.forEach(f => {
          fileMap.set(f.virtualPath, {
            content: f.content,
            updatedAt: f.updatedAt,
            permissions: f.permissions || 'rw-r--r--',
            isBase64: f.isBase64,
            size: f.size
          });
        });
        store.files.set(serverId, fileMap);
      });
    }

    if (data.backups && typeof data.backups === 'object') {
      Object.entries(data.backups).forEach(([serverId, bList]) => {
        store.backups.set(serverId, bList);
      });
    }

    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      store.auditLogs = data.auditLogs;
    }

    if (data.notifications && Array.isArray(data.notifications)) {
      data.notifications.forEach(n => {
        store.notifications.set(n.id, n);
      });
    }

    console.log(`[Xorvila DB] Hydrated from Python Database: ${store.users.size} users, ${store.servers.size} servers, ${store.sessions.size} sessions, ${store.notifications.size} notifications.`);
  } catch (err) {
    console.error('[Xorvila DB] Failed to hydrate database:', err);
  }
}

// Initial hydration on startup
hydrateStoreFromDb();
