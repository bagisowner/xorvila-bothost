import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn, execFile, execSync, ChildProcess } from 'child_process';
import { store } from './store';
import { db } from './dbBridge';
import { BotServer, ConsoleLogLine, ServerStats } from '../src/types';

// Active listeners for WebSocket real-time broadcast
type LogListener = (line: ConsoleLogLine) => void;
type StatsListener = (stats: ServerStats) => void;
type StatusListener = (status: BotServer['status']) => void;

interface ServerSubscribers {
  logs: Set<LogListener>;
  stats: Set<StatsListener>;
  status: Set<StatusListener>;
}

const subscribers = new Map<string, ServerSubscribers>();

// Map of active running child processes by serverId
export const activeProcesses = new Map<string, ChildProcess>();
export const processStartTimes = new Map<string, number>();

// Hidden Cooldown & Mutex Locks to prevent double-click / rapid start-stop race conditions
export const actionLocks = new Map<string, number>();
export const actionInProgress = new Map<string, boolean>();

export function checkActionCooldown(serverId: string): boolean {
  if (actionInProgress.get(serverId)) {
    return false;
  }
  const lastTime = actionLocks.get(serverId) || 0;
  if (Date.now() - lastTime < 1500) {
    return false;
  }
  return true;
}

// Base workspace root on host disk (Permanent data directory)
export const WORKSPACE_ROOT = path.join(process.cwd(), 'data', 'servers');
if (!fs.existsSync(WORKSPACE_ROOT)) {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

export function getServerWorkspaceDir(serverId: string): string {
  const dir = path.join(WORKSPACE_ROOT, serverId, 'server');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function cleanServerWorkspaceDir(serverId: string): void {
  const dir = path.join(WORKSPACE_ROOT, serverId);
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error deleting workspace directory ${dir}:`, err);
    }
  }
}

// Sync all store virtual files to physical disk before executing
export function syncFilesToDisk(serverId: string): string {
  const serverDir = getServerWorkspaceDir(serverId);
  const serverFiles = store.files.get(serverId);

  if (serverFiles) {
    serverFiles.forEach((fileData, virtualPath) => {
      // virtualPath like /server/bot.py or /server/cogs/mod.py
      const relPath = virtualPath.startsWith('/server/')
        ? virtualPath.substring('/server/'.length)
        : virtualPath.startsWith('/server')
        ? virtualPath.substring('/server'.length)
        : virtualPath.replace(/^\//, '');

      if (!relPath || relPath === '.keep') return;

      const physicalPath = path.join(serverDir, relPath);
      const parentDir = path.dirname(physicalPath);

      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      try {
        if (fileData.isBase64) {
          fs.writeFileSync(physicalPath, Buffer.from(fileData.content, 'base64'));
        } else {
          fs.writeFileSync(physicalPath, fileData.content, 'utf-8');
        }
      } catch (err) {
        console.error(`Error writing file ${physicalPath}:`, err);
      }
    });
  }

  return serverDir;
}

// Sync physical disk files into store and database
export function syncDiskToStore(serverId: string): void {
  const serverDir = getServerWorkspaceDir(serverId);
  if (!fs.existsSync(serverDir)) return;

  let serverFiles = store.files.get(serverId);
  if (!serverFiles) {
    serverFiles = new Map();
    store.files.set(serverId, serverFiles);
  }

  const scannedPaths = new Set<string>();

  function scanDir(currentDir: string, relPrefix: string = '') {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(currentDir, entry.name);
        const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        const virtualPath = `/server/${rel}`;

        if (entry.isDirectory()) {
          if (entry.name !== '__pycache__' && entry.name !== '.git') {
            scanDir(entryPath, rel);
          }
        } else if (entry.isFile()) {
          scannedPaths.add(virtualPath);
          const stats = fs.statSync(entryPath);
          const isText = isTextFile(entry.name);
          let content = '';
          let isBase64 = false;

          try {
            if (isText && stats.size < 2 * 1024 * 1024) {
              content = fs.readFileSync(entryPath, 'utf-8');
            } else if (stats.size < 5 * 1024 * 1024) {
              content = fs.readFileSync(entryPath).toString('base64');
              isBase64 = true;
            } else {
              content = '[Binary file too large to store in database cache]';
            }

            const existing = serverFiles.get(virtualPath);
            if (!existing || existing.content !== content) {
              const fileObj = {
                content,
                updatedAt: stats.mtime.toISOString(),
                permissions: 'rw-r--r--',
                isBase64,
                size: stats.size
              };
              serverFiles.set(virtualPath, fileObj);
              db.saveFile(serverId, virtualPath, content, 'rw-r--r--', isBase64);
            }
          } catch (e) {
            // ignore read error
          }
        }
      }
    } catch (err) {
      console.error(`Error scanning disk for server ${serverId}:`, err);
    }
  }

  scanDir(serverDir);

  serverFiles.forEach((_, virtualPath) => {
    if (!scannedPaths.has(virtualPath)) {
      serverFiles.delete(virtualPath);
      db.deleteFile(serverId, virtualPath);
    }
  });
}

function isTextFile(filename: string): boolean {
  const textExtensions = [
    '.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.txt', '.md', '.html',
    '.css', '.env', '.yaml', '.yml', '.toml', '.cfg', '.ini', '.sh', '.sql',
    '.xml', '.csv', '.log'
  ];
  return textExtensions.some(ext => filename.toLowerCase().endsWith(ext)) || !filename.includes('.');
}

export function getOrCreateSubscribers(serverId: string): ServerSubscribers {
  let sub = subscribers.get(serverId);
  if (!sub) {
    sub = {
      logs: new Set(),
      stats: new Set(),
      status: new Set()
    };
    subscribers.set(serverId, sub);
  }
  return sub;
}

export function subscribeLogs(serverId: string, listener: LogListener) {
  const sub = getOrCreateSubscribers(serverId);
  sub.logs.add(listener);
  return () => sub.logs.delete(listener);
}

export function subscribeStats(serverId: string, listener: StatsListener) {
  const sub = getOrCreateSubscribers(serverId);
  sub.stats.add(listener);
  return () => sub.stats.delete(listener);
}

export function subscribeStatus(serverId: string, listener: StatusListener) {
  const sub = getOrCreateSubscribers(serverId);
  sub.status.add(listener);
  return () => sub.status.delete(listener);
}

export function getServerLogFilePath(serverId: string): string {
  const dir = path.join(WORKSPACE_ROOT, serverId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'console.log');
}

export function loadServerLogsFromDisk(serverId: string): ConsoleLogLine[] {
  try {
    const logPath = getServerLogFilePath(serverId);
    if (fs.existsSync(logPath)) {
      const raw = fs.readFileSync(logPath, 'utf-8');
      const lines = raw.split('\n').filter(Boolean);
      const parsed: ConsoleLogLine[] = [];
      for (const line of lines.slice(-300)) {
        try {
          const item = JSON.parse(line);
          if (item && item.text) {
            parsed.push(item);
          }
        } catch {
          parsed.push({
            id: 'log_' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type: 'system',
            text: line
          });
        }
      }
      return parsed;
    }
  } catch (err) {
    console.error(`Error loading logs from disk for ${serverId}:`, err);
  }
  return [];
}

export function emitLog(serverId: string, type: ConsoleLogLine['type'], text: string) {
  const line: ConsoleLogLine = {
    id: 'log_' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type,
    text
  };

  let serverLogs = store.logs.get(serverId);
  if (!serverLogs) {
    serverLogs = loadServerLogsFromDisk(serverId);
    store.logs.set(serverId, serverLogs);
  }
  serverLogs.push(line);
  if (serverLogs.length > 1000) {
    serverLogs.shift();
  }

  try {
    const logPath = getServerLogFilePath(serverId);
    fs.appendFileSync(logPath, JSON.stringify(line) + '\n', 'utf-8');
  } catch (e) {
    // ignore
  }

  const sub = subscribers.get(serverId);
  if (sub) {
    sub.logs.forEach(cb => cb(line));
  }
}

export function emitStatus(serverId: string, status: BotServer['status']) {
  const server = store.servers.get(serverId);
  if (server) {
    server.status = status;
    server.updatedAt = new Date().toISOString();
  }
  const sub = subscribers.get(serverId);
  if (sub) {
    sub.status.forEach(cb => cb(status));
  }
}

export function emitStats(serverId: string, stats: ServerStats) {
  const server = store.servers.get(serverId);
  if (server) {
    server.stats = stats;
  }
  const sub = subscribers.get(serverId);
  if (sub) {
    sub.stats.forEach(cb => cb(stats));
  }
}

// Real telemetry poller: inspects actual OS CPU & RAM of the running child process
setInterval(() => {
  activeProcesses.forEach((child, serverId) => {
    const server = store.servers.get(serverId);
    if (!server || !child.pid || child.killed) return;

    const startTime = processStartTimes.get(serverId) || Date.now();
    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    server.uptimeSeconds = uptimeSec;

    execFile('ps', ['-p', String(child.pid), '-o', '%cpu,rss', '--no-headers'], (err, stdout) => {
      if (err || !stdout.trim()) {
        return;
      }
      const parts = stdout.trim().split(/\s+/);
      const rawCpu = parseFloat(parts[0]) || 0;
      const rssKb = parseInt(parts[1], 10) || 0;
      const ramMb = Math.max(1, Math.round(rssKb / 1024));

      // Cap reported CPU percentage cleanly to server cpuLimit
      const effectiveCpuLimit = server.cpuLimit || 100;
      const cpu = Math.min(effectiveCpuLimit, Number(rawCpu.toFixed(1)));

      const stats: ServerStats = {
        cpuUsage: cpu,
        ramUsage: ramMb,
        ramLimit: server.ramLimit,
        storageUsage: server.stats?.storageUsage || 0,
        storageLimit: server.storageLimit,
        netRx: server.stats?.netRx || 0,
        netTx: server.stats?.netTx || 0,
        pids: 1,
        uptimeSeconds: uptimeSec
      };

      emitStats(serverId, stats);
    });
  });
}, 1500);

// Helper to resolve Python 3 absolute binary path reliably on different hosting environments
function getPythonBinary(): string {
  // Check for local curled / portable python inside the workspace
  const localPy = path.join(process.cwd(), 'bin', 'python3');
  const localPyNested = path.join(process.cwd(), 'bin', 'python', 'bin', 'python3');
  if (fs.existsSync(localPy)) return localPy;
  if (fs.existsSync(localPyNested)) return localPyNested;

  if (fs.existsSync('/usr/bin/python3')) return '/usr/bin/python3';
  if (fs.existsSync('/usr/local/bin/python3')) return '/usr/local/bin/python3';
  if (fs.existsSync('/usr/bin/python')) return '/usr/bin/python';
  return 'python3';
}

// Helper to resolve Node.js absolute binary path reliably
function getNodeBinary(): string {
  // Check for local curled / portable node inside the workspace
  const localNode = path.join(process.cwd(), 'bin', 'node');
  const localNodeNested = path.join(process.cwd(), 'bin', 'node', 'bin', 'node');
  if (fs.existsSync(localNode)) return localNode;
  if (fs.existsSync(localNodeNested)) return localNodeNested;

  return 'node';
}

// Helper to resolve NPM absolute binary path reliably
function getNpmBinary(): string {
  // Check for local curled / portable npm inside the workspace
  const localNpm = path.join(process.cwd(), 'bin', 'npm');
  const localNpmNested = path.join(process.cwd(), 'bin', 'node', 'bin', 'npm');
  if (fs.existsSync(localNpm)) return localNpm;
  if (fs.existsSync(localNpmNested)) return localNpmNested;

  return 'npm';
}

// Asynchronously download and extract a portable, standalone Python binary
// if python3 is missing on the host server environment.
async function ensurePythonRuntime(serverId: string): Promise<string> {
  const localPyBin = path.join(process.cwd(), 'bin', 'python', 'bin', 'python3');
  
  if (fs.existsSync(localPyBin)) {
    return localPyBin;
  }

  // Check if native python3 works
  try {
    const check = require('child_process').spawnSync('python3', ['--version']);
    if (check.status === 0 || check.status === null) {
      return 'python3';
    }
  } catch (err) {
    // Missing python3
  }

  const binDir = path.join(process.cwd(), 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const archivePath = path.join(binDir, 'python.tar.gz');
  const pythonDir = path.join(binDir, 'python');

  emitLog(serverId, 'system', `\x1b[33m[Self-Healing]\x1b[0m \x1b[1;31mPython 3 was not detected on this server host!\x1b[0m`);
  emitLog(serverId, 'system', `\x1b[36m[Self-Healing]\x1b[0m Automatically fetching a zero-dependency portable Python 3.11 environment...`);

  const isArm = process.arch === 'arm64';
  const downloadUrl = isArm
    ? 'https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-aarch64-unknown-linux-gnu-install_only.tar.gz'
    : 'https://github.com/indygreg/python-build-standalone/releases/download/20231002/cpython-3.11.6+20231002-x86_64-unknown-linux-gnu-install_only.tar.gz';

  try {
    emitLog(serverId, 'system', `\x1b[36m[Self-Healing]\x1b[0m Downloading portable bundle for \x1b[1m${process.arch}\x1b[0m architecture...`);
    
    // Download using curl
    execSync(`curl -L -s -o "${archivePath}" "${downloadUrl}"`);
    
    emitLog(serverId, 'system', `\x1b[36m[Self-Healing]\x1b[0m Unpacking archive to bin/python/ (this may take 10-15 seconds)...`);
    
    if (!fs.existsSync(pythonDir)) {
      fs.mkdirSync(pythonDir, { recursive: true });
    }
    
    execSync(`tar -xzf "${archivePath}" -C "${pythonDir}" --strip-components=1`);
    
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
    }

    if (fs.existsSync(localPyBin)) {
      fs.chmodSync(localPyBin, '755');
    }

    emitLog(serverId, 'system', `\x1b[32m[Self-Healing]\x1b[0m \x1b[1;32mPortable Python 3.11 environment successfully installed!\x1b[0m`);
    return localPyBin;
  } catch (err: any) {
    emitLog(serverId, 'stderr', `\x1b[31;1m[Self-Healing Error]\x1b[0m Failed to retrieve portable python: ${err.message || err}`);
    return 'python3';
  }
}

// Helper to run command in child process and stream output to server logs
function runProcessAsync(
  serverId: string,
  cmd: string,
  args: string[],
  cwd: string,
  envVars: Record<string, string>
): Promise<{ code: number | null; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        ...envVars,
        PYTHONUNBUFFERED: '1',
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
        TERM: 'xterm-256color'
      }
    });

    proc.stdout?.on('data', (data) => {
      const text = data.toString('utf-8');
      const lines = text.split(/\r?\n/);
      lines.forEach((l: string) => {
        if (l.trim()) emitLog(serverId, 'stdout', l);
      });
    });

    proc.stderr?.on('data', (data) => {
      const text = data.toString('utf-8');
      const lines = text.split(/\r?\n/);
      lines.forEach((l: string) => {
        if (l.trim()) emitLog(serverId, 'stderr', l);
      });
    });

    proc.on('error', (err) => {
      emitLog(serverId, 'stderr', `\x1b[31;1m[Exec Error]\x1b[0m ${err.message}`);
      resolve({ code: 1, error: err.message });
    });

    proc.on('close', (code) => {
      resolve({ code });
    });
  });
}

// Start Server - Real Python/Node execution with requirements.txt auto-install
export async function startServerContainer(serverId: string): Promise<boolean> {
  const server = store.servers.get(serverId);
  if (!server) return false;

  if (server.suspended) {
    emitLog(serverId, 'stderr', `\x1b[31;1m[Suspended]\x1b[0m Container is suspended by administrator. Process start aborted.`);
    emitStatus(serverId, 'offline');
    return false;
  }

  // Check cooldown & mutex
  if (!checkActionCooldown(serverId)) {
    emitLog(serverId, 'system', `\x1b[33m[Cooldown]\x1b[0m Start action throttled (hidden cooldown active).`);
    return false;
  }

  actionInProgress.set(serverId, true);
  actionLocks.set(serverId, Date.now());

  try {
    // If already running, force kill old process group first
    if (activeProcesses.has(serverId)) {
      await stopServerContainer(serverId, true);
    }

    emitStatus(serverId, 'starting');
    emitLog(serverId, 'system', `\x1b[36m[Xorvila Engine]\x1b[0m Initializing isolated workspace for \x1b[1m${server.name}\x1b[0m...`);

    if (server.runtime === 'python') {
      await ensurePythonRuntime(serverId);
    }

    const serverDir = syncFilesToDisk(serverId);
    emitLog(serverId, 'system', `\x1b[32m[Storage]\x1b[0m Synchronized files to /server workspace.`);

    const reqFilePath = path.join(serverDir, 'requirements.txt');
    if (fs.existsSync(reqFilePath)) {
      const reqContent = fs.readFileSync(reqFilePath, 'utf-8').trim();
      if (reqContent.length > 0) {
        emitLog(serverId, 'system', `\x1b[36m[Pip Engine]\x1b[0m Found \x1b[1mrequirements.txt\x1b[0m. Installing dependencies...`);

        const pipResult = await runProcessAsync(
          serverId,
          getPythonBinary(),
          ['-m', 'pip', 'install', '--user', '--no-cache-dir', '--break-system-packages', '-r', 'requirements.txt'],
          serverDir,
          server.env || {}
        );

        if (pipResult.code !== 0) {
          emitLog(serverId, 'stderr', `\x1b[31;1m[Pip Error]\x1b[0m Failed to install requirements.txt (Exit code: ${pipResult.code})`);
          emitStatus(serverId, 'crashed');
          return false;
        }
        emitLog(serverId, 'system', `\x1b[32m[Pip Engine]\x1b[0m Successfully installed dependencies.`);
      }
    }

    const pkgFilePath = path.join(serverDir, 'package.json');
    if (server.runtime === 'node' && fs.existsSync(pkgFilePath)) {
      emitLog(serverId, 'system', `\x1b[36m[NPM Engine]\x1b[0m Found package.json. Running npm install...`);
      const npmResult = await runProcessAsync(serverId, getNpmBinary(), ['install'], serverDir, server.env || {});
      if (npmResult.code !== 0) {
        emitLog(serverId, 'stderr', `\x1b[31;1m[NPM Error]\x1b[0m npm install failed with code ${npmResult.code}`);
      }
    }

    let targetScript = 'bot.py';
    const customParts = server.startupCommand ? server.startupCommand.trim().split(/\s+/) : [];
    const foundInCmd = customParts.find(p => p.endsWith('.py') || p.endsWith('.js') || p.endsWith('.ts'));

    if (foundInCmd) {
      targetScript = foundInCmd;
    } else if (server.runtime === 'python') {
      if (fs.existsSync(path.join(serverDir, 'bot.py'))) {
        targetScript = 'bot.py';
      } else if (fs.existsSync(path.join(serverDir, 'main.py'))) {
        targetScript = 'main.py';
      } else if (fs.existsSync(path.join(serverDir, 'app.py'))) {
        targetScript = 'app.py';
      }
    } else if (server.runtime === 'node') {
      if (fs.existsSync(path.join(serverDir, 'index.js'))) {
        targetScript = 'index.js';
      } else if (fs.existsSync(path.join(serverDir, 'index.ts'))) {
        targetScript = 'index.ts';
      } else if (fs.existsSync(path.join(serverDir, 'bot.js'))) {
        targetScript = 'bot.js';
      }
    }

    const scriptFullPath = path.join(serverDir, targetScript);

    if (!fs.existsSync(scriptFullPath)) {
      emitLog(serverId, 'stderr', `\x1b[31;1mFileNotFoundError:\x1b[0m [Errno 2] No such file: '${targetScript}' in /server.`);
      emitLog(serverId, 'stderr', `\x1b[33m[Hint]\x1b[0m Upload bot files (e.g. \x1b[1m${targetScript}\x1b[0m) in File Manager first.`);
      emitStatus(serverId, 'offline');
      return false;
    }

    emitLog(serverId, 'system', `\x1b[33m[STARTUP]\x1b[0m Executing \x1b[1m${server.runtime === 'python' ? 'python3' : 'node'} -u ${targetScript}\x1b[0m`);

    const execBinary = server.runtime === 'python' ? getPythonBinary() : getNodeBinary();
    const execArgs = server.runtime === 'python' ? ['-u', targetScript] : [targetScript];

    const envVars = {
      ...process.env,
      ...server.env,
      PYTHONUNBUFFERED: '1',
      PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`,
      TERM: 'xterm-256color'
    };

    const child = spawn(execBinary, execArgs, {
      cwd: serverDir,
      env: envVars,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (!child.pid) {
      throw new Error('Failed to obtain process PID');
    }

    activeProcesses.set(serverId, child);
    processStartTimes.set(serverId, Date.now());

    emitLog(serverId, 'system', `\x1b[32m[Runtime]\x1b[0m Process spawned with real host PID: \x1b[1m${child.pid}\x1b[0m`);
    emitStatus(serverId, 'online');

    child.stdout?.on('data', (data) => {
      const text = data.toString('utf-8');
      text.split(/\r?\n/).forEach((l: string) => {
        if (l.length > 0) emitLog(serverId, 'stdout', l);
      });
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString('utf-8');
      text.split(/\r?\n/).forEach((l: string) => {
        if (l.length > 0) emitLog(serverId, 'stderr', l);
      });
    });

    child.on('error', (err) => {
      emitLog(serverId, 'stderr', `\x1b[31;1m[Process Error]\x1b[0m ${err.message}`);
      activeProcesses.delete(serverId);
      processStartTimes.delete(serverId);
      emitStatus(serverId, 'crashed');
    });

    child.on('close', (code, signal) => {
      activeProcesses.delete(serverId);
      processStartTimes.delete(serverId);

      const signalMsg = signal ? ` (Signal: ${signal})` : '';
      if (code === 0) {
        emitLog(serverId, 'system', `\x1b[33m[Process]\x1b[0m Bot process PID ${child.pid} exited cleanly with code 0${signalMsg}.`);
        emitStatus(serverId, 'offline');
      } else {
        emitLog(serverId, 'stderr', `\x1b[31;1m[Process]\x1b[0m Bot process PID ${child.pid} terminated with code ${code}${signalMsg}.`);
        emitStatus(serverId, 'crashed');

        if (server.restartPolicy === 'always' || server.restartPolicy === 'on-failure') {
          emitLog(serverId, 'system', `\x1b[36m[Auto-Restart]\x1b[0m Restarting container in 3 seconds...`);
          setTimeout(() => {
            if (server.status === 'crashed') {
              startServerContainer(serverId);
            }
          }, 3000);
        }
      }

      emitStats(serverId, {
        cpuUsage: 0,
        ramUsage: 0,
        ramLimit: server.ramLimit,
        storageUsage: server.stats?.storageUsage || 0,
        storageLimit: server.storageLimit,
        netRx: 0,
        netTx: 0,
        pids: 0,
        uptimeSeconds: 0
      });
    });

    return true;
  } catch (err: any) {
    emitLog(serverId, 'stderr', `\x1b[31;1m[Spawn Error]\x1b[0m Could not start process: ${err.message}`);
    emitStatus(serverId, 'crashed');
    return false;
  } finally {
    actionInProgress.set(serverId, false);
  }
}

// Stop Server with process group force termination
export async function stopServerContainer(serverId: string, bypassCooldown = false): Promise<boolean> {
  const server = store.servers.get(serverId);
  if (!server) return false;

  if (!bypassCooldown && !checkActionCooldown(serverId)) {
    emitLog(serverId, 'system', `\x1b[33m[Cooldown]\x1b[0m Stop action throttled (hidden cooldown active).`);
    return false;
  }

  actionInProgress.set(serverId, true);
  actionLocks.set(serverId, Date.now());

  try {
    emitStatus(serverId, 'stopping');
    const child = activeProcesses.get(serverId);

    if (child && child.pid) {
      emitLog(serverId, 'system', `\x1b[33m[Stop]\x1b[0m Sending SIGTERM/SIGKILL to process group PID ${child.pid}...`);
      try {
        if (process.platform !== 'win32') {
          try { process.kill(-child.pid, 'SIGTERM'); } catch (_) {}
          await new Promise(r => setTimeout(r, 400));
          try { process.kill(-child.pid, 'SIGKILL'); } catch (_) {}
        } else {
          try { child.kill('SIGKILL'); } catch (_) {}
        }
      } catch (e) {
        // Ignore if dead
      }
    }

    activeProcesses.delete(serverId);
    processStartTimes.delete(serverId);
    server.uptimeSeconds = 0;
    emitStatus(serverId, 'offline');
    emitLog(serverId, 'system', `\x1b[32m[Stop]\x1b[0m Server stopped successfully.`);

    emitStats(serverId, {
      cpuUsage: 0,
      ramUsage: 0,
      ramLimit: server.ramLimit,
      storageUsage: server.stats?.storageUsage || 0,
      storageLimit: server.storageLimit,
      netRx: 0,
      netTx: 0,
      pids: 0,
      uptimeSeconds: 0
    });

    return true;
  } finally {
    actionInProgress.set(serverId, false);
  }
}

// Restart Server
export async function restartServerContainer(serverId: string): Promise<boolean> {
  if (!checkActionCooldown(serverId)) {
    emitLog(serverId, 'system', `\x1b[33m[Cooldown]\x1b[0m Restart action throttled (hidden cooldown active).`);
    return false;
  }
  await stopServerContainer(serverId, true);
  await new Promise(r => setTimeout(r, 600));
  return startServerContainer(serverId);
}

// Kill Server
export async function killServerContainer(serverId: string): Promise<boolean> {
  const child = activeProcesses.get(serverId);
  if (child && child.pid) {
    emitLog(serverId, 'system', `\x1b[31;1m[KILL]\x1b[0m Forcefully sending SIGKILL to PID ${child.pid}`);
    try {
      if (process.platform !== 'win32') {
        try { process.kill(-child.pid, 'SIGKILL'); } catch (_) {}
      }
      child.kill('SIGKILL');
    } catch (e) {}
  }
  activeProcesses.delete(serverId);
  processStartTimes.delete(serverId);
  emitStatus(serverId, 'offline');
  return true;
}

// Send interactive command to running child process stdin
export function handleConsoleCommand(serverId: string, command: string) {
  emitLog(serverId, 'info', `> ${command}`);
  const child = activeProcesses.get(serverId);

  if (child && !child.killed && child.stdin?.writable) {
    try {
      child.stdin.write(command + '\n');
    } catch (err: any) {
      emitLog(serverId, 'stderr', `Failed to send stdin: ${err.message}`);
    }
  } else {
    emitLog(serverId, 'stderr', `Cannot send command: Server is not currently online or running.`);
  }
}

// Install dependencies on-demand
export async function installDependencies(serverId: string, pkgName?: string): Promise<boolean> {
  const server = store.servers.get(serverId);
  if (!server) return false;

  const serverDir = getServerWorkspaceDir(serverId);

  if (pkgName) {
    emitLog(serverId, 'system', `\x1b[36m[Package Manager]\x1b[0m Installing package \x1b[1m${pkgName}\x1b[0m...`);
    const cmd = server.runtime === 'python' ? getPythonBinary() : getNpmBinary();
    const args = server.runtime === 'python'
      ? ['-m', 'pip', 'install', '--user', '--break-system-packages', pkgName]
      : ['install', pkgName];

    const res = await runProcessAsync(serverId, cmd, args, serverDir, server.env || {});
    if (res.code === 0) {
      emitLog(serverId, 'system', `\x1b[32m[Package Manager]\x1b[0m Successfully installed ${pkgName}`);
      return true;
    }
    return false;
  } else {
    emitLog(serverId, 'system', `\x1b[36m[Package Manager]\x1b[0m Rebuilding environment dependencies...`);
    if (server.runtime === 'python') {
      const reqPath = path.join(serverDir, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        const res = await runProcessAsync(serverId, getPythonBinary(), ['-m', 'pip', 'install', '--user', '--break-system-packages', '-r', 'requirements.txt'], serverDir, server.env || {});
        return res.code === 0;
      }
    } else {
      const res = await runProcessAsync(serverId, getNpmBinary(), ['install'], serverDir, server.env || {});
      return res.code === 0;
    }
    return true;
  }
}

// Deploy Git
export async function deployGit(serverId: string, repoUrl: string, branch: string = 'main'): Promise<boolean> {
  const server = store.servers.get(serverId);
  if (!server) return false;

  const serverDir = getServerWorkspaceDir(serverId);
  emitLog(serverId, 'system', `\x1b[36m[Git Deploy]\x1b[0m Cloning from ${repoUrl} (branch: ${branch})...`);

  const res = await runProcessAsync(
    serverId,
    'git',
    ['clone', '--depth', '1', '--branch', branch, repoUrl, '.'],
    serverDir,
    {}
  );

  if (res.code === 0) {
    emitLog(serverId, 'system', `\x1b[32m[Git Deploy]\x1b[0m Successfully pulled repository. Reloading files...`);
    return true;
  }
  return false;
}
