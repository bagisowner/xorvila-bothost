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
  SystemNotification,
  PlatformSettings
} from '../src/types';
import { db } from './dbBridge';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'platform_settings.json');

export const defaultPlatformSettings: PlatformSettings = {
  storeEnabled: true,
  rewardsEnabled: true,
  bonusEnabled: false,
  referralsEnabled: true,
  referralRewardCoins: 50,
  starterPlan: {
    defaultRamMb: 512,
    defaultDiskMb: 2048,
    defaultCpuPct: 100,
    defaultMaxServers: 1,
    defaultCoins: 0
  },
  storeItems: [
    {
      id: 'item_ram_512',
      name: '+512 MB High-Speed RAM',
      description: 'Expands your memory limit by 512MB for Discord & Python bot memory buffers.',
      category: 'ram',
      amount: 512,
      unit: 'MB',
      priceCoins: 100,
      enabled: true,
      badge: 'Popular'
    },
    {
      id: 'item_ram_1024',
      name: '+1024 MB Turbo RAM',
      description: 'Full 1GB extra DDR5 RAM allocation for heavy node.js bots and multiple libraries.',
      category: 'ram',
      amount: 1024,
      unit: 'MB',
      priceCoins: 180,
      enabled: true,
      badge: 'Best Value'
    },
    {
      id: 'item_cpu_50',
      name: '+50% vCPU Power',
      description: 'Increases CPU quota by 50% for smoother request handling and quicker responses.',
      category: 'cpu',
      amount: 50,
      unit: '%',
      priceCoins: 80,
      enabled: true
    },
    {
      id: 'item_cpu_100',
      name: '+100% Dedicated 1-Core CPU',
      description: 'Full 1.0 Core dedicated cgroup execution for low-latency bot performance.',
      category: 'cpu',
      amount: 100,
      unit: '%',
      priceCoins: 150,
      enabled: true,
      badge: 'High Perf'
    },
    {
      id: 'item_disk_1024',
      name: '+1 GB NVMe SSD Disk',
      description: 'Adds 1024MB fast NVMe space for SQLite databases, bot media, and log storage.',
      category: 'disk',
      amount: 1024,
      unit: 'MB',
      priceCoins: 60,
      enabled: true
    },
    {
      id: 'item_disk_2048',
      name: '+2 GB NVMe SSD Disk',
      description: 'High capacity NVMe storage expansion for large bots and rich datasets.',
      category: 'disk',
      amount: 2048,
      unit: 'MB',
      priceCoins: 100,
      enabled: true
    },
    {
      id: 'item_slot_1',
      name: '+1 Server Creation Slot',
      description: 'Unlock 1 additional bot instance to run multiple Python/Node bots simultaneously!',
      category: 'slots',
      amount: 1,
      unit: 'Slot',
      priceCoins: 250,
      enabled: true,
      badge: 'Hot Upgrade'
    },
    {
      id: 'item_slot_2',
      name: '+2 Server Creation Slots',
      description: 'Unlock 2 additional bot slots to expand your entire bot fleet across the cluster.',
      category: 'slots',
      amount: 2,
      unit: 'Slots',
      priceCoins: 450,
      enabled: true,
      badge: 'Pro Fleet'
    }
  ],
  rewardTasks: [
    {
      id: 'task_linkvertise_1',
      title: 'Linkvertise Sponsor Task #1',
      description: 'Visit Linkvertise, complete the simple 15-second sponsor step, and earn instant coins.',
      category: 'linkvertise',
      rewardCoins: 80,
      url: 'https://linkvertise.com',
      enabled: true,
      instructions: 'Click Start, proceed through the linkvertise sponsor step, and claim your coins upon returning.',
      timerSeconds: 15
    },
    {
      id: 'task_linkpays_1',
      title: 'Linkpays Fast Verification',
      description: 'Complete the short Linkpays URL step to unlock free bot server coins.',
      category: 'linkpays',
      rewardCoins: 60,
      url: 'https://linkpays.in',
      enabled: true,
      instructions: 'Open the Linkpays page, wait for the short verification timer, and collect your reward.',
      timerSeconds: 12
    },
    {
      id: 'task_shortener_droplink',
      title: 'Droplink Shortener Challenge',
      description: 'Fast 10-second sponsor check via Droplink with quick coin reward credit.',
      category: 'shortener',
      rewardCoins: 70,
      url: 'https://droplink.co',
      enabled: true,
      instructions: 'Visit the Droplink page, complete the captcha challenge, and instantly claim your credits.',
      timerSeconds: 10
    },
    {
      id: 'task_shortener_gplinks',
      title: 'GPLinks Quick Reward',
      description: 'Complete the GPLinks short link journey to get 75 bonus coins.',
      category: 'shortener',
      rewardCoins: 75,
      url: 'https://gplinks.com',
      enabled: true,
      instructions: 'Navigate to GPLinks, wait for timer to expire, and redeem your coins in one click.',
      timerSeconds: 12
    },
    {
      id: 'task_daily_bonus',
      title: 'Daily Check-in Loyalty Reward',
      description: 'Free daily bonus available every 24 hours for active Xorvila bot builders.',
      category: 'daily',
      rewardCoins: 40,
      url: '',
      enabled: true,
      instructions: 'Hit Claim Daily Reward to instantly add 40 coins to your platform wallet.',
      dailyReset: true,
      timerSeconds: 0
    },
    {
      id: 'task_discord_join',
      title: 'Join Xorvila Discord Community',
      description: 'Connect with hundreds of bot developers, get exclusive tips, and claim 120 coins.',
      category: 'community',
      rewardCoins: 120,
      url: 'https://discord.gg/xorvila',
      enabled: true,
      instructions: 'Join our official server, verify your presence, and claim your community reward.',
      timerSeconds: 5
    },
    {
      id: 'task_star_github',
      title: 'Star Xorvila on GitHub',
      description: 'Support open-source bot hosting development and receive 90 free coins.',
      category: 'community',
      rewardCoins: 90,
      url: 'https://github.com',
      enabled: true,
      instructions: 'Star our repository on GitHub, then click claim to receive 90 coins.',
      timerSeconds: 5
    }
  ],
  j4rTasks: [
    {
      id: 'j4r_xorvila_official',
      serverName: 'Xorvila Official Community',
      description: 'Official hosting hub for support, announcements, node status updates, and free server giveaways.',
      inviteUrl: 'https://discord.gg/xorvila',
      rewardCoins: 150,
      iconUrl: 'https://cdn.discordapp.com/icons/1122334455667788/a_1234.png',
      memberCount: '4,280 Members',
      category: 'Official Partner',
      enabled: true,
      requirements: 'Join server & keep membership linked.'
    },
    {
      id: 'j4r_pycord_devs',
      serverName: 'Python & Discord Bot Developers',
      description: 'Active coding hangout for Python/Node.js bot developers, code sharing, and tutorials.',
      inviteUrl: 'https://discord.gg/botdevs',
      rewardCoins: 120,
      iconUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=botdevs',
      memberCount: '12,500 Members',
      category: 'Developer Network',
      enabled: true,
      requirements: 'Join server & verify membership.'
    },
    {
      id: 'j4r_hyperscale_nodes',
      serverName: 'HyperScale Cloud Network',
      description: 'Infrastructure partner delivering cgroup isolation, edge compute, and high-performance nodes.',
      inviteUrl: 'https://discord.gg/hyperscale',
      rewardCoins: 100,
      iconUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=hyperscale',
      memberCount: '8,900 Members',
      category: 'Infrastructure Partner',
      enabled: true,
      requirements: 'Join server & verify membership.'
    }
  ]
};

export function loadPlatformSettings(): PlatformSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...defaultPlatformSettings,
        ...parsed,
        bonusEnabled: parsed.bonusEnabled !== undefined ? parsed.bonusEnabled : defaultPlatformSettings.bonusEnabled,
        referralsEnabled: parsed.referralsEnabled !== undefined ? parsed.referralsEnabled : defaultPlatformSettings.referralsEnabled,
        referralRewardCoins: Number(parsed.referralRewardCoins || defaultPlatformSettings.referralRewardCoins),
        starterPlan: { ...defaultPlatformSettings.starterPlan, ...(parsed.starterPlan || {}) },
        storeItems: parsed.storeItems || defaultPlatformSettings.storeItems,
        rewardTasks: parsed.rewardTasks || defaultPlatformSettings.rewardTasks,
        j4rTasks: parsed.j4rTasks || defaultPlatformSettings.j4rTasks
      };
    }
  } catch (err) {
    console.error('[Xorvila Settings] Failed to read platform_settings.json:', err);
  }
  return JSON.parse(JSON.stringify(defaultPlatformSettings));
}

export function savePlatformSettings(settings: PlatformSettings) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Xorvila Settings] Failed to save platform_settings.json:', err);
  }
}

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
  platformSettings: PlatformSettings;
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
  notifications: new Map(),
  platformSettings: loadPlatformSettings()
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
          status: 'offline',
          uptimeSeconds: 0,
          stats: {
            cpuUsage: 0,
            ramUsage: 0,
            ramLimit: s.ramLimit || 512,
            storageUsage: s.stats?.storageUsage || 0,
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
