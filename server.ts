import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { exec } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/auth';
import { serversRouter } from './server/routes/servers';
import { adminRouter } from './server/routes/admin';
import { docsRouter } from './server/routes/docs';
import { aiRouter } from './server/routes/ai';
import { healthRouter } from './server/routes/health';
import { setupWebSocketServer } from './server/ws';
import { store } from './server/store';
import { syncFilesToDisk, syncDiskToStore } from './server/dockerSimulation';
import { autoHealer } from './server/autoHealer';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Run VPS auto-configuration once on first-time start
  const setupFlag = path.join(process.cwd(), 'data', '.vps_setup_done');
  if (!fs.existsSync(setupFlag)) {
    console.log('[VPS Auto-Setup] First-time startup detected! Running setup_vps.py in the background...');
    const setupProcess = exec('python3 setup_vps.py', (error, stdout, stderr) => {
      if (error) {
        console.error(`[VPS Auto-Setup Error] Auto-provisioning failed: ${error.message}`);
        return;
      }
      console.log(`[VPS Auto-Setup] Auto-provisioning completed successfully!`);
      try {
        fs.writeFileSync(setupFlag, new Date().toISOString());
      } catch (e) {
        console.error('[VPS Auto-Setup Error] Could not write setup flag:', e);
      }
    });

    setupProcess.stdout?.on('data', (data) => console.log(`[VPS Setup] ${data.toString().trim()}`));
    setupProcess.stderr?.on('data', (data) => console.error(`[VPS Setup Error] ${data.toString().trim()}`));
  }

  // Initialize auto-healing watchdog & database integrity scan
  try {
    autoHealer.startWatchdog();
    for (const serverId of store.servers.keys()) {
      syncFilesToDisk(serverId);
      syncDiskToStore(serverId);
    }
    console.log(`[Xorvila Storage] Permanent storage synced for ${store.servers.size} servers in data/servers.`);
  } catch (err) {
    console.error('[Xorvila Storage] Error syncing storage on boot:', err);
  }

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/servers', serversRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/docs', docsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/health', healthRouter);

  const httpServer = http.createServer(app);

  // Attach WebSocket server
  setupWebSocketServer(httpServer);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[BotCloud] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[BotCloud] Failed to start server:', err);
  process.exit(1);
});
