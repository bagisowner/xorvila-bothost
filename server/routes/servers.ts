import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { store } from '../store';
import { db } from '../dbBridge';
import { authenticate } from './auth';
import {
  BotServer,
  User,
  ServerFile,
  ServerBackup,
  RuntimeLanguage,
  RuntimeVersion,
  RestartPolicy
} from '../../src/types';
import {
  startServerContainer,
  stopServerContainer,
  restartServerContainer,
  killServerContainer,
  installDependencies,
  deployGit,
  handleConsoleCommand,
  emitLog,
  syncFilesToDisk,
  syncDiskToStore,
  cleanServerWorkspaceDir,
  loadServerLogsFromDisk,
  getServerLogFilePath,
  getServerWorkspaceDir,
  activeProcesses
} from '../dockerSimulation';

export const serversRouter = Router();

// Helper to verify server ownership
function getServerWithPermission(serverId: string, user: User, res: Response): BotServer | null {
  const server = store.servers.get(serverId);
  if (!server) {
    res.status(404).json({
      success: false,
      error: { code: 'SERVER_NOT_FOUND', message: 'The requested bot server does not exist.' }
    });
    return null;
  }

  // Strict tenant isolation: user can only access the server they deploy!
  if (server.ownerId !== user.id && user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access Denied: You can only access bot servers that you have personally deployed.' }
    });
    return null;
  }

  // Sanitize stale status if process is dead
  if (server.status === 'online' && !activeProcesses.has(server.id)) {
    server.status = 'offline';
    server.uptimeSeconds = 0;
    if (server.stats) server.stats.uptimeSeconds = 0;
  }

  return server;
}

// 1. List Servers (Strict Isolation: each user only sees the servers they deployed)
serversRouter.get('/', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const allServers = Array.from(store.servers.values());

  // Sanitize all server states against activeProcesses
  allServers.forEach(s => {
    if (s.status === 'online' && !activeProcesses.has(s.id)) {
      s.status = 'offline';
      s.uptimeSeconds = 0;
      if (s.stats) s.stats.uptimeSeconds = 0;
    }
  });

  // If ?all=true and user is admin, allow listing cluster servers (for admin dashboard), otherwise strictly own servers
  const showAll = req.query.all === 'true' && user.role === 'admin';
  const servers = showAll
    ? allServers
    : allServers.filter(s => s.ownerId === user.id);

  return res.json({
    success: true,
    data: servers
  });
});

// 2. Create Server
serversRouter.post('/', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const {
    name,
    description,
    runtime,
    version,
    cpuLimit,
    ramLimit,
    storageLimit,
    startupCommand,
    workingDir,
    restartPolicy,
    autoStart,
    env
  } = req.body;

  if (!name || !runtime || !version) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Server name, runtime language, and version are required.' }
    });
  }

  // Check user tier quotas dynamically using Starter Plan + Store purchased upgrades
  const isAdmin = user.role === 'admin';
  const currentDbUser = store.users.get(user.id);
  const starter = store.platformSettings?.starterPlan || {
    defaultRamMb: 512,
    defaultDiskMb: 2048,
    defaultCpuPct: 100,
    defaultMaxServers: 1
  };

  const maxAllowedSlots = isAdmin ? 100 : (starter.defaultMaxServers + (currentDbUser?.extraSlots || 0));
  const maxAllowedRam = isAdmin ? 32768 : (starter.defaultRamMb + (currentDbUser?.extraRamMb || 0));
  const maxAllowedDisk = isAdmin ? 512000 : (starter.defaultDiskMb + (currentDbUser?.extraDiskMb || 0));
  const maxAllowedCpu = isAdmin ? 800 : (starter.defaultCpuPct + (currentDbUser?.extraCpuPct || 0));

  if (!isAdmin) {
    const userServers = Array.from(store.servers.values()).filter(s => s.ownerId === user.id);
    if (userServers.length >= maxAllowedSlots) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TIER_QUOTA_EXCEEDED',
          message: `Account Slot Limit Reached (${userServers.length}/${maxAllowedSlots}). Visit the Resource Store or complete Earn Rewards tasks to unlock more server creation slots!`
        }
      });
    }
  }

  // Automatic node selection (choose node with lowest used RAM)
  const nodes = Array.from(store.nodes.values()).filter(n => n.status === 'online');
  if (nodes.length === 0) {
    return res.status(500).json({
      success: false,
      error: { code: 'NO_NODES_AVAILABLE', message: 'No online Docker nodes available in cluster to provision server.' }
    });
  }

  nodes.sort((a, b) => (a.usedRam / a.totalRam) - (b.usedRam / b.totalRam));
  const selectedNode = nodes[0];

  const serverId = `srv-${runtime}-${Math.random().toString(36).substring(2, 8)}`;
  const defaultCommand = startupCommand || (runtime === 'python' ? 'python bot.py' : 'node index.js');
  const finalWorkingDir = workingDir || '/server';

  // Apply resource ceilings based on user tier & upgrades
  const requestedCpu = Number(cpuLimit) || (isAdmin ? 100 : starter.defaultCpuPct);
  const requestedRam = Number(ramLimit) || (isAdmin ? 1024 : starter.defaultRamMb);
  const requestedStorage = Number(storageLimit) || (isAdmin ? 2048 : starter.defaultDiskMb);

  const finalCpuLimit = Math.min(requestedCpu, maxAllowedCpu);
  const finalRamLimit = Math.min(requestedRam, maxAllowedRam);
  const finalStorageLimit = Math.min(requestedStorage, maxAllowedDisk);

  const newServer: BotServer = {
    id: serverId,
    name,
    description: description || '',
    ownerId: user.id,
    ownerEmail: user.email,
    runtime: runtime as RuntimeLanguage,
    version: version as RuntimeVersion,
    status: 'offline',
    nodeId: selectedNode.id,
    nodeName: selectedNode.name,
    nodeIp: selectedNode.ip,
    port: 25500 + Math.floor(Math.random() * 500),
    cpuLimit: finalCpuLimit,
    ramLimit: finalRamLimit,
    storageLimit: finalStorageLimit,
    startupCommand: defaultCommand,
    workingDir: finalWorkingDir,
    restartPolicy: (restartPolicy as RestartPolicy) || 'on-failure',
    autoStart: false,
    suspended: false,
    env: env || {
      ENVIRONMENT: 'production',
      LOG_LEVEL: 'INFO'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uptimeSeconds: 0,
    stats: {
      cpuUsage: 0,
      ramUsage: 0,
      ramLimit: finalRamLimit,
      storageUsage: 0,
      storageLimit: finalStorageLimit,
      netRx: 0,
      netTx: 0,
      pids: 0,
      uptimeSeconds: 0
    },
    sftp: {
      host: selectedNode.hostname,
      port: 2022,
      username: serverId.replace(/-/g, '_'),
      password: 'sftp_' + Math.random().toString(36).substring(2, 12)
    }
  };

  store.servers.set(newServer.id, newServer);
  db.saveServer(newServer);
  selectedNode.serversCount += 1;

  // Initialize completely clean and empty filesystem for this bot
  store.files.set(newServer.id, new Map());
  syncFilesToDisk(newServer.id);

  // Initialize clean initial log
  store.logs.set(newServer.id, [
    {
      id: 'log_init',
      timestamp: new Date().toLocaleTimeString(),
      type: 'system',
      text: `[SYSTEM] Bot server "${name}" provisioned on ${selectedNode.name}. Storage is clean at /server.`
    }
  ]);

  // Log audit
  const auditId = 'aud_' + Math.random().toString(36).substring(2, 9);
  const auditDetails = `Created clean bot server "${name}" (${runtime} ${version})`;
  store.auditLogs.unshift({
    id: auditId,
    userId: user.id,
    userEmail: user.email,
    action: 'SERVER_CREATE',
    resourceType: 'server',
    resourceId: newServer.id,
    details: auditDetails,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  db.addAudit('SERVER_CREATE', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'server',
    resourceId: newServer.id,
    details: auditDetails,
    ip: req.ip || '127.0.0.1'
  });

  return res.status(201).json({
    success: true,
    data: newServer
  });
});

// 3. Get Server by ID
serversRouter.get('/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  return res.json({
    success: true,
    data: server
  });
});

// 4. Delete All Servers (Wipe)
serversRouter.delete('/wipe/all', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const allServers = Array.from(store.servers.values());
  const targetServers = user.role === 'admin'
    ? allServers
    : allServers.filter(s => s.ownerId === user.id);

  for (const server of targetServers) {
    try {
      stopServerContainer(server.id);
      cleanServerWorkspaceDir(server.id);
      store.servers.delete(server.id);
      store.files.delete(server.id);
      store.logs.delete(server.id);
      store.backups.delete(server.id);
      db.deleteServer(server.id);

      const node = store.nodes.get(server.nodeId);
      if (node && node.serversCount > 0) {
        node.serversCount -= 1;
      }
    } catch (e) {
      console.error(`Failed to wipe server ${server.id}:`, e);
    }
  }

  const auditId = 'aud_' + Math.random().toString(36).substring(2, 9);
  const auditDetails = `Wiped all bot servers (${targetServers.length} servers destroyed)`;
  store.auditLogs.unshift({
    id: auditId,
    userId: user.id,
    userEmail: user.email,
    action: 'SERVERS_WIPE_ALL',
    resourceType: 'server',
    resourceId: 'all',
    details: auditDetails,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  db.addAudit('SERVERS_WIPE_ALL', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'server',
    resourceId: 'all',
    details: auditDetails,
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: true,
    data: { message: `Successfully wiped ${targetServers.length} bot servers from cluster.` }
  });
});

// 4. Delete Server
serversRouter.delete('/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  stopServerContainer(server.id);
  cleanServerWorkspaceDir(server.id);
  store.servers.delete(server.id);
  store.files.delete(server.id);
  store.logs.delete(server.id);
  store.backups.delete(server.id);
  db.deleteServer(server.id);

  const node = store.nodes.get(server.nodeId);
  if (node && node.serversCount > 0) {
    node.serversCount -= 1;
  }

  const delAuditId = 'aud_' + Math.random().toString(36).substring(2, 9);
  const delAuditDetails = `Deleted server "${server.name}"`;
  store.auditLogs.unshift({
    id: delAuditId,
    userId: user.id,
    userEmail: user.email,
    action: 'SERVER_DELETE',
    resourceType: 'server',
    resourceId: server.id,
    details: delAuditDetails,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  db.addAudit('SERVER_DELETE', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'server',
    resourceId: server.id,
    details: delAuditDetails,
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: true,
    data: { message: 'Server and all isolated storage destroyed successfully' }
  });
});

// Lifecycle actions
serversRouter.post('/:id/start', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  if (server.suspended) {
    return res.status(403).json({
      success: false,
      error: { code: 'SERVER_SUSPENDED', message: 'This server is suspended and cannot be started.' }
    });
  }

  await startServerContainer(server.id);
  return res.json({ success: true, data: { status: server.status } });
});

serversRouter.post('/:id/stop', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  await stopServerContainer(server.id);
  return res.json({ success: true, data: { status: server.status } });
});

serversRouter.post('/:id/restart', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  await restartServerContainer(server.id);
  return res.json({ success: true, data: { status: server.status } });
});

serversRouter.post('/:id/kill', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  await killServerContainer(server.id);
  return res.json({ success: true, data: { status: server.status } });
});

serversRouter.post('/:id/reinstall', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  emitLog(server.id, 'system', `\x1b[33m[REINSTALL]\x1b[0m Cleaning environment and rebuilding container...`);
  await installDependencies(server.id);
  return res.json({ success: true, data: { message: 'Dependencies reinstalled successfully' } });
});

serversRouter.post('/:id/rebuild', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  emitLog(server.id, 'system', `\x1b[35m[REBUILD]\x1b[0m Rebuilding base Docker container image on ${server.nodeName}...`);
  await restartServerContainer(server.id);
  return res.json({ success: true, data: { message: 'Container rebuilt successfully' } });
});

// Logs & Console input
serversRouter.get('/:id/logs', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  let logs = store.logs.get(server.id);
  if (!logs || logs.length === 0) {
    logs = loadServerLogsFromDisk(server.id);
    store.logs.set(server.id, logs);
  }
  return res.json({ success: true, data: logs });
});

serversRouter.delete('/:id/logs', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  store.logs.set(server.id, []);
  try {
    const logPath = getServerLogFilePath(server.id);
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '', 'utf-8');
    }
  } catch (e) {
    // ignore
  }
  return res.json({ success: true, data: { message: 'Console logs cleared' } });
});

serversRouter.post('/:id/console/input', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: { code: 'EMPTY_COMMAND', message: 'Command cannot be empty' } });
  }

  handleConsoleCommand(server.id, command);
  return res.json({ success: true });
});

// SFTP Credentials
serversRouter.get('/:id/sftp', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const hostHeader = req.get('host') || req.headers.host || '';
  const publicHost = hostHeader.split(':')[0] || server.sftp.host;

  const sftpData = {
    ...server.sftp,
    host: publicHost
  };

  return res.json({
    success: true,
    data: {
      ...sftpData,
      connectionCommand: `sftp -P ${sftpData.port} ${sftpData.username}@${sftpData.host}`
    }
  });
});

// Startup Configuration
serversRouter.get('/:id/startup', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  return res.json({
    success: true,
    data: {
      runtime: server.runtime,
      version: server.version,
      startupCommand: server.startupCommand,
      workingDir: server.workingDir,
      restartPolicy: server.restartPolicy,
      autoStart: server.autoStart,
      cpuLimit: server.cpuLimit,
      ramLimit: server.ramLimit,
      storageLimit: server.storageLimit
    }
  });
});

serversRouter.put('/:id/startup', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const {
    name,
    description,
    runtime,
    version,
    startupCommand,
    workingDir,
    restartPolicy,
    autoStart,
    cpuLimit,
    ramLimit,
    storageLimit,
    port
  } = req.body;

  const isAdmin = user.role === 'admin';
  if (name && typeof name === 'string' && name.trim()) server.name = name.trim();
  if (description !== undefined && typeof description === 'string') server.description = description.trim();
  if (port) server.port = Number(port);
  if (runtime) server.runtime = runtime;
  if (version) server.version = version;
  if (startupCommand) server.startupCommand = startupCommand;
  if (workingDir) server.workingDir = workingDir;
  if (restartPolicy) server.restartPolicy = restartPolicy;
  if (autoStart !== undefined) server.autoStart = Boolean(autoStart);
  if (cpuLimit) {
    server.cpuLimit = isAdmin ? Number(cpuLimit) : Math.min(Number(cpuLimit), 50);
  }
  if (ramLimit) {
    const finalRam = isAdmin ? Number(ramLimit) : Math.min(Number(ramLimit), 512);
    server.ramLimit = finalRam;
    server.stats.ramLimit = finalRam;
  }
  if (storageLimit) {
    const finalDisk = isAdmin ? Number(storageLimit) : Math.min(Number(storageLimit), 1024);
    server.storageLimit = finalDisk;
    server.stats.storageLimit = finalDisk;
  }

  server.updatedAt = new Date().toISOString();
  db.saveServer(server);

  emitLog(server.id, 'system', `[CONFIG] Updated startup config: Runtime=${server.runtime} ${server.version}, Command="${server.startupCommand}"`);

  return res.json({
    success: true,
    data: server
  });
});

// Environment Variables
serversRouter.get('/:id/env', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  return res.json({
    success: true,
    data: server.env
  });
});

serversRouter.put('/:id/env', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { env } = req.body;
  if (typeof env !== 'object') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ENV', message: 'Env must be key-value object' } });
  }

  server.env = env;
  server.updatedAt = new Date().toISOString();
  db.saveServer(server);

  // Sync to .env file in filesystem if it exists
  const serverFiles = store.files.get(server.id);
  if (serverFiles) {
    const envLines = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n');
    serverFiles.set('/server/.env', {
      content: envLines + '\n',
      updatedAt: new Date().toISOString(),
      permissions: 'rw-------'
    });
    db.saveFile(server.id, '/server/.env', envLines + '\n', false);
    syncFilesToDisk(server.id);
  }

  emitLog(server.id, 'system', `[ENV] Environment variables updated (${Object.keys(env).length} keys).`);

  return res.json({
    success: true,
    data: server.env
  });
});

// Dependency Management
serversRouter.post('/:id/dependencies/install', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  await installDependencies(server.id);
  return res.json({ success: true, data: { message: 'Dependencies installed successfully' } });
});

// Git Deployment
serversRouter.post('/:id/git/deploy', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { url, branch } = req.body;
  if (!url || !branch) {
    return res.status(400).json({ success: false, error: { code: 'GIT_CONFIG_REQUIRED', message: 'Git URL and branch are required' } });
  }

  await deployGit(server.id, url, branch);
  return res.json({
    success: true,
    data: {
      git: server.git,
      message: 'Repository cloned and deployed successfully'
    }
  });
});

// Backups Management
serversRouter.get('/:id/backups', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const backups = store.backups.get(server.id) || [];
  return res.json({ success: true, data: backups });
});

serversRouter.post('/:id/backups/create', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { name } = req.body;
  const backupName = name || `Manual Snapshot ${new Date().toLocaleDateString()}`;

  let backups = store.backups.get(server.id);
  if (!backups) {
    backups = [];
    store.backups.set(server.id, backups);
  }

  const newBackup: ServerBackup = {
    id: 'bkp_' + Math.random().toString(36).substring(2, 10),
    serverId: server.id,
    name: backupName,
    size: (server.stats.storageUsage || 300) * 1024 * 1024,
    checksum: 'sha256:' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    createdAt: new Date().toISOString(),
    status: 'completed'
  };

  backups.unshift(newBackup);
  emitLog(server.id, 'system', `[BACKUP] Created snapshot archive ${newBackup.id} (${(newBackup.size / (1024 * 1024)).toFixed(2)} MB)`);

  return res.json({ success: true, data: newBackup });
});

serversRouter.post('/:id/backups/:backupId/restore', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const backups = store.backups.get(server.id) || [];
  const target = backups.find(b => b.id === req.params.backupId);
  if (!target) {
    return res.status(404).json({ success: false, error: { code: 'BACKUP_NOT_FOUND', message: 'Backup not found' } });
  }

  emitLog(server.id, 'system', `\x1b[33m[RESTORE]\x1b[0m Restoring filesystem from backup ${target.name} (${target.id})...`);
  await restartServerContainer(server.id);

  return res.json({ success: true, data: { message: 'Backup restored successfully' } });
});

serversRouter.delete('/:id/backups/:backupId', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  let backups = store.backups.get(server.id) || [];
  backups = backups.filter(b => b.id !== req.params.backupId);
  store.backups.set(server.id, backups);

  return res.json({ success: true, data: { message: 'Backup deleted' } });
});

// File Manager Endpoints
// List directory
serversRouter.get('/:id/files', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  // Stream live changes from physical disk into store & db
  syncDiskToStore(server.id);

  const dirPath = (req.query.path as string) || '/server';
  const serverFiles = store.files.get(server.id) || new Map();

  // Normalize path without trailing slash except root
  const cleanDir = dirPath === '/' ? '/' : dirPath.replace(/\/$/, '');

  const itemsMap = new Map<string, ServerFile>();

  serverFiles.forEach((fileData, fullPath) => {
    // Check if file starts with cleanDir
    if (fullPath.startsWith(cleanDir + '/') || (cleanDir === '/' && fullPath.startsWith('/'))) {
      const relPath = cleanDir === '/' ? fullPath.substring(1) : fullPath.substring(cleanDir.length + 1);
      const parts = relPath.split('/');
      const itemName = parts[0];
      const itemFullPath = cleanDir === '/' ? `/${itemName}` : `${cleanDir}/${itemName}`;

      if (parts.length > 1) {
        // It's a directory
        if (!itemsMap.has(itemName)) {
          itemsMap.set(itemName, {
            name: itemName,
            path: itemFullPath,
            size: 4096,
            isDirectory: true,
            updatedAt: fileData.updatedAt,
            permissions: 'rwxr-xr-x'
          });
        }
      } else {
        // It's a direct child file
        const ext = itemName.includes('.') ? itemName.split('.').pop() : '';
        const realSize = fileData.size !== undefined
          ? fileData.size
          : (fileData.isBase64 ? Math.floor((fileData.content.length * 3) / 4) : fileData.content.length);

        itemsMap.set(itemName, {
          name: itemName,
          path: itemFullPath,
          size: realSize,
          isDirectory: false,
          updatedAt: fileData.updatedAt,
          permissions: fileData.permissions || 'rw-r--r--',
          extension: ext
        });
      }
    }
  });

  const filesList = Array.from(itemsMap.values()).sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return res.json({
    success: true,
    data: {
      currentPath: cleanDir,
      files: filesList
    }
  });
});

// Read file content
serversRouter.get('/:id/files/content', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const filePath = req.query.path as string;
  if (!filePath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'File path required' } });
  }

  // Security: prevent path traversal outside server container
  if (filePath.includes('..') || !filePath.startsWith('/server')) {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Path traversal is forbidden. Access is restricted to /server.' }
    });
  }

  syncDiskToStore(server.id);
  const serverFiles = store.files.get(server.id);
  const fileData = serverFiles?.get(filePath);

  if (!fileData) {
    return res.status(404).json({
      success: false,
      error: { code: 'FILE_NOT_FOUND', message: `File ${filePath} does not exist.` }
    });
  }

  return res.json({
    success: true,
    data: {
      path: filePath,
      content: fileData.content,
      isBase64: !!fileData.isBase64,
      size: fileData.size || (fileData.isBase64 ? Math.floor((fileData.content.length * 3) / 4) : fileData.content.length),
      updatedAt: fileData.updatedAt,
      permissions: fileData.permissions
    }
  });
});

// Direct Download File or Directory as Zip
serversRouter.get('/:id/files/download', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const targetPath = (req.query.path as string) || '/server';

  if (targetPath.includes('..') || !targetPath.startsWith('/server')) {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Path traversal forbidden.' } });
  }

  syncDiskToStore(server.id);
  const serverFiles = store.files.get(server.id);
  if (!serverFiles) {
    return res.status(404).json({ success: false, error: { code: 'NO_FILES', message: 'No files found on server.' } });
  }

  // Check if it's a single direct file
  const singleFile = serverFiles.get(targetPath);
  if (singleFile) {
    const filename = targetPath.split('/').pop() || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    if (singleFile.isBase64) {
      const buffer = Buffer.from(singleFile.content, 'base64');
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Length', Buffer.byteLength(singleFile.content));
      return res.end(singleFile.content);
    }
  }

  // If it's a folder or full archive download, zip all matching files
  const cleanDir = targetPath.replace(/\/$/, '');
  const zip = new JSZip();

  serverFiles.forEach((fileData, fullPath) => {
    if (fullPath.startsWith(cleanDir + '/') || fullPath === cleanDir) {
      // Relative path inside zip
      const relPath = fullPath.startsWith(cleanDir + '/') ? fullPath.substring(cleanDir.length + 1) : fullPath.split('/').pop() || 'file';
      if (relPath && !relPath.endsWith('/.keep')) {
        if (fileData.isBase64) {
          zip.file(relPath, Buffer.from(fileData.content, 'base64'));
        } else {
          zip.file(relPath, fileData.content);
        }
      }
    }
  });

  const zipFilename = cleanDir === '/server'
    ? `${server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-archive.zip`
    : `${cleanDir.split('/').pop() || 'archive'}.zip`;

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
  res.setHeader('Content-Length', zipBuffer.length);
  return res.end(zipBuffer);
});

// Save file content
serversRouter.put('/:id/files/content', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { path: filePath, content, isBase64 } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Path and content are required' } });
  }

  if (filePath.includes('..') || !filePath.startsWith('/server')) {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Path traversal forbidden.' }
    });
  }

  let serverFiles = store.files.get(server.id);
  if (!serverFiles) {
    serverFiles = new Map();
    store.files.set(server.id, serverFiles);
  }

  const realSize = isBase64 ? Math.floor((content.length * 3) / 4) : Buffer.byteLength(content);

  serverFiles.set(filePath, {
    content,
    isBase64: !!isBase64,
    size: realSize,
    updatedAt: new Date().toISOString(),
    permissions: 'rw-r--r--'
  });

  db.saveFile(server.id, filePath, content, !!isBase64);
  syncFilesToDisk(server.id);

  return res.json({
    success: true,
    data: {
      path: filePath,
      size: realSize,
      updatedAt: new Date().toISOString()
    }
  });
});

// Create file or folder
serversRouter.post('/:id/files/create', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { path: parentPath, name, isDirectory, content = '', isBase64 = false } = req.body;
  if (!parentPath || !name) {
    return res.status(400).json({ success: false, error: { code: 'PARAMS_REQUIRED', message: 'Parent path and name are required' } });
  }

  const cleanParent = parentPath.replace(/\/$/, '');
  const targetPath = `${cleanParent}/${name}`;

  if (targetPath.includes('..') || !targetPath.startsWith('/server')) {
    return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Path traversal forbidden.' } });
  }

  let serverFiles = store.files.get(server.id);
  if (!serverFiles) {
    serverFiles = new Map();
    store.files.set(server.id, serverFiles);
  }

  if (isDirectory) {
    // Create placeholder inside folder
    serverFiles.set(`${targetPath}/.keep`, {
      content: '',
      updatedAt: new Date().toISOString(),
      permissions: 'rw-r--r--'
    });
    db.saveFile(server.id, `${targetPath}/.keep`, '', false);
  } else {
    const realSize = isBase64 ? Math.floor((content.length * 3) / 4) : Buffer.byteLength(content);
    serverFiles.set(targetPath, {
      content: content || '',
      isBase64: !!isBase64,
      size: realSize,
      updatedAt: new Date().toISOString(),
      permissions: 'rw-r--r--'
    });
    db.saveFile(server.id, targetPath, content || '', !!isBase64);
  }

  syncFilesToDisk(server.id);

  return res.json({
    success: true,
    data: {
      path: targetPath,
      name,
      isDirectory: !!isDirectory
    }
  });
});

// Delete file or folder
serversRouter.post('/:id/files/delete', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { path: targetPath } = req.body;
  if (!targetPath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Path is required' } });
  }

  const serverFiles = store.files.get(server.id);
  if (serverFiles) {
    const keysToDelete: string[] = [];
    serverFiles.forEach((_, key) => {
      if (key === targetPath || key.startsWith(targetPath + '/')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(k => {
      serverFiles.delete(k);
      db.deleteFile(server.id, k);
    });

    // Also delete physically from disk so it does not get re-synchronized
    try {
      const serverDir = getServerWorkspaceDir(server.id);
      const relPath = targetPath.startsWith('/server/')
        ? targetPath.substring('/server/'.length)
        : targetPath.startsWith('/server')
        ? targetPath.substring('/server'.length)
        : targetPath.replace(/^\//, '');
      const physicalPath = path.join(serverDir, relPath);
      if (fs.existsSync(physicalPath)) {
        fs.rmSync(physicalPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Error physically deleting path:', e);
    }

    syncFilesToDisk(server.id);
  }

  return res.json({ success: true, data: { message: 'Item deleted successfully' } });
});

// Rename file or folder
serversRouter.post('/:id/files/rename', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { oldPath, newName } = req.body;
  if (!oldPath || !newName) {
    return res.status(400).json({ success: false, error: { code: 'PARAMS_REQUIRED', message: 'Old path and new name required' } });
  }

  const parts = oldPath.split('/');
  parts.pop();
  const parent = parts.join('/');
  const newPath = `${parent}/${newName}`;

  const serverFiles = store.files.get(server.id);
  if (serverFiles) {
    const keysToRename: { oldKey: string; newKey: string; data: any }[] = [];
    serverFiles.forEach((data, key) => {
      if (key === oldPath) {
        keysToRename.push({ oldKey: key, newKey: newPath, data });
      } else if (key.startsWith(oldPath + '/')) {
        const sub = key.substring(oldPath.length);
        keysToRename.push({ oldKey: key, newKey: newPath + sub, data });
      }
    });

    keysToRename.forEach(item => {
      serverFiles.delete(item.oldKey);
      db.deleteFile(server.id, item.oldKey);
      serverFiles.set(item.newKey, item.data);
      db.saveFile(server.id, item.newKey, item.data.content, !!item.data.isBase64);
    });

    // Also delete old physical path from disk so it is not left behind
    try {
      const serverDir = getServerWorkspaceDir(server.id);
      const relPath = oldPath.startsWith('/server/')
        ? oldPath.substring('/server/'.length)
        : oldPath.startsWith('/server')
        ? oldPath.substring('/server'.length)
        : oldPath.replace(/^\//, '');
      const physicalPath = path.join(serverDir, relPath);
      if (fs.existsSync(physicalPath)) {
        fs.rmSync(physicalPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Error physically deleting old path during rename:', e);
    }

    syncFilesToDisk(server.id);
  }

  return res.json({ success: true, data: { oldPath, newPath } });
});

// Upload batch of files (supports base64 for zip/binaries)
serversRouter.post('/:id/files/upload', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { parentPath, files } = req.body as { parentPath: string; files: { name: string; content: string; isBase64?: boolean; size?: number }[] };
  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ success: false, error: { code: 'FILES_REQUIRED', message: 'Files list is required' } });
  }

  const cleanParent = (parentPath || '/server').replace(/\/$/, '');
  let serverFiles = store.files.get(server.id);
  if (!serverFiles) {
    serverFiles = new Map();
    store.files.set(server.id, serverFiles);
  }

  files.forEach(f => {
    const fullPath = `${cleanParent}/${f.name}`;
    const realSize = f.size !== undefined ? f.size : (f.isBase64 ? Math.floor((f.content.length * 3) / 4) : Buffer.byteLength(f.content || ''));
    serverFiles.set(fullPath, {
      content: f.content || '',
      isBase64: !!f.isBase64,
      size: realSize,
      updatedAt: new Date().toISOString(),
      permissions: 'rw-r--r--'
    });
    db.saveFile(server.id, fullPath, f.content || '', !!f.isBase64);
  });

  syncFilesToDisk(server.id);
  emitLog(server.id, 'system', `\x1b[36m[STORAGE]\x1b[0m Uploaded ${files.length} file(s) to ${cleanParent}`);

  return res.json({
    success: true,
    data: { uploadedCount: files.length }
  });
});

// Extract Zip Archive into target directory
serversRouter.post('/:id/files/extract', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { filePath, targetDir } = req.body;
  if (!filePath) {
    return res.status(400).json({ success: false, error: { code: 'PATH_REQUIRED', message: 'Zip file path is required' } });
  }

  syncDiskToStore(server.id);
  const serverFiles = store.files.get(server.id);
  const targetZip = serverFiles?.get(filePath);

  if (!targetZip) {
    return res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: `Archive ${filePath} not found.` } });
  }

  try {
    const destDir = (targetDir || filePath.substring(0, filePath.lastIndexOf('/')) || '/server').replace(/\/$/, '');
    let zipBuffer: Buffer;

    if (targetZip.isBase64) {
      zipBuffer = Buffer.from(targetZip.content, 'base64');
    } else {
      zipBuffer = Buffer.from(targetZip.content, 'binary');
    }

    const zip = await JSZip.loadAsync(zipBuffer);
    let extractedCount = 0;

    const entries = Object.keys(zip.files);
    for (const relPath of entries) {
      const entry = zip.files[relPath];
      if (entry.dir) {
        const fullDirPath = `${destDir}/${relPath.replace(/\/$/, '')}`;
        serverFiles?.set(`${fullDirPath}/.keep`, {
          content: '',
          updatedAt: new Date().toISOString(),
          permissions: 'rw-r--r--'
        });
        db.saveFile(server.id, `${fullDirPath}/.keep`, '', false);
      } else {
        const fullFilePath = `${destDir}/${relPath}`;
        // Read as text if code/config, otherwise base64
        const isText = /\.(py|js|ts|json|env|txt|md|html|css|sh|yml|yaml|toml|ini|cfg)$/i.test(relPath);
        if (isText) {
          const textContent = await entry.async('string');
          serverFiles?.set(fullFilePath, {
            content: textContent,
            isBase64: false,
            size: Buffer.byteLength(textContent),
            updatedAt: new Date().toISOString(),
            permissions: 'rw-r--r--'
          });
          db.saveFile(server.id, fullFilePath, textContent, false);
        } else {
          const base64Content = await entry.async('base64');
          const binarySize = Math.floor((base64Content.length * 3) / 4);
          serverFiles?.set(fullFilePath, {
            content: base64Content,
            isBase64: true,
            size: binarySize,
            updatedAt: new Date().toISOString(),
            permissions: 'rw-r--r--'
          });
          db.saveFile(server.id, fullFilePath, base64Content, true);
        }
        extractedCount++;
      }
    }

    syncFilesToDisk(server.id);
    emitLog(server.id, 'system', `\x1b[32m[ARCHIVE]\x1b[0m Extracted ${extractedCount} item(s) from ${filePath.split('/').pop()} into ${destDir}`);

    return res.json({
      success: true,
      data: {
        extractedCount,
        destination: destDir
      }
    });
  } catch (err: any) {
    console.error('Extract error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'EXTRACT_FAILED', message: 'Failed to uncompress archive: ' + (err.message || 'Invalid zip format') }
    });
  }
});

// Create Archive (.zip) from selected items or folder
serversRouter.post('/:id/files/archive', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const server = getServerWithPermission(req.params.id, user, res);
  if (!server) return;

  const { paths, targetDir = '/server', archiveName = 'archive.zip' } = req.body as { paths?: string[]; targetDir?: string; archiveName?: string };

  const serverFiles = store.files.get(server.id);
  if (!serverFiles) {
    return res.status(400).json({ success: false, error: { code: 'NO_FILES', message: 'Server has no files' } });
  }

  try {
    const zip = new JSZip();
    const cleanTargetDir = targetDir.replace(/\/$/, '');
    const cleanArchiveName = archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`;
    const finalArchivePath = `${cleanTargetDir}/${cleanArchiveName}`;

    let fileCount = 0;

    if (paths && Array.isArray(paths) && paths.length > 0) {
      paths.forEach(selectedPath => {
        serverFiles.forEach((fileData, fullPath) => {
          if (fullPath === selectedPath || fullPath.startsWith(selectedPath + '/')) {
            const relPath = fullPath.substring(cleanTargetDir.length + 1);
            if (!relPath.endsWith('/.keep') && fullPath !== finalArchivePath) {
              fileCount++;
              if (fileData.isBase64) {
                zip.file(relPath, Buffer.from(fileData.content, 'base64'));
              } else {
                zip.file(relPath, fileData.content);
              }
            }
          }
        });
      });
    } else {
      // Archive everything in current folder
      serverFiles.forEach((fileData, fullPath) => {
        if (fullPath.startsWith(cleanTargetDir + '/') && fullPath !== finalArchivePath) {
          const relPath = fullPath.substring(cleanTargetDir.length + 1);
          if (!relPath.endsWith('/.keep')) {
            fileCount++;
            if (fileData.isBase64) {
              zip.file(relPath, Buffer.from(fileData.content, 'base64'));
            } else {
              zip.file(relPath, fileData.content);
            }
          }
        }
      });
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    const realSize = Math.floor((zipBase64.length * 3) / 4);

    serverFiles.set(finalArchivePath, {
      content: zipBase64,
      isBase64: true,
      size: realSize,
      updatedAt: new Date().toISOString(),
      permissions: 'rw-r--r--'
    });

    emitLog(server.id, 'system', `\x1b[35m[ARCHIVE]\x1b[0m Compressed ${fileCount} item(s) into ${cleanArchiveName} (${(realSize / 1024).toFixed(1)} KB)`);

    return res.json({
      success: true,
      data: {
        archivePath: finalArchivePath,
        fileCount,
        size: realSize
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ARCHIVE_FAILED', message: 'Failed to create zip: ' + (err.message || 'Unknown error') }
    });
  }
});

