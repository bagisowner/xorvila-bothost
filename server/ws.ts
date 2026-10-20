import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { store } from './store';
import { db } from './dbBridge';
import { verifyJwtToken } from './jwt';
import { User } from '../src/types';
import {
  subscribeLogs,
  subscribeStats,
  subscribeStatus,
  handleConsoleCommand
} from './dockerSimulation';

// Authenticate user from WebSocket query token or cookie
function authenticateWsUser(rawToken?: string, cookieHeader?: string): User | null {
  const token = rawToken || (() => {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/(?:xorvila_session|session)=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  })();

  if (!token) return null;

  // 1. Check API token
  for (const apiToken of store.tokens.values()) {
    if (apiToken.token === token) {
      const user = store.users.get(apiToken.userId);
      if (user && !user.suspended && user.isActive !== false) {
        return user;
      }
    }
  }

  // 2. Check JWT token
  const jwt = verifyJwtToken(token);
  if (jwt) {
    const sessionData = db.validateSessionById(jwt.sessionId, jwt.sub);
    if (sessionData?.user && !sessionData.user.suspended && sessionData.user.isActive !== false) {
      return sessionData.user;
    }
    const memUser = store.users.get(jwt.sub);
    if (memUser && !memUser.suspended && memUser.isActive !== false) {
      return memUser;
    }
  }

  // 3. Fallback raw session in DB
  const sess = db.validateSession(token);
  if (sess?.user && !sess.user.suspended && sess.user.isActive !== false) {
    return sess.user;
  }

  // 4. Fallback memory session
  const memSess = store.sessions.get(token);
  if (memSess && memSess.expiresAt > Date.now()) {
    const memUser = store.users.get(memSess.userId);
    if (memUser && !memUser.suspended && memUser.isActive !== false) {
      return memUser;
    }
  }

  return null;
}

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);

    if (pathname === '/ws' || pathname === '/api/ws') {
      const serverId = query.serverId as string;
      const rawToken = query.token as string;
      const cookieHeader = request.headers.cookie;

      // Check if server exists
      if (!serverId || !store.servers.has(serverId)) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const targetServer = store.servers.get(serverId)!;
      const authUser = authenticateWsUser(rawToken, cookieHeader);

      // Strict User Isolation: users can ONLY access the server they deploy!
      if (!authUser || (targetServer.ownerId !== authUser.id && authUser.role !== 'admin')) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, serverId);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, request: any, serverId: string) => {
    const server = store.servers.get(serverId);
    if (!server) {
      ws.close();
      return;
    }

    // Send initial snapshot
    ws.send(JSON.stringify({
      type: 'INIT',
      data: {
        server,
        logs: store.logs.get(serverId) || []
      }
    }));

    // Subscribe to live logs
    const unsubLogs = subscribeLogs(serverId, (line) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'LOG', data: line }));
      }
    });

    // Subscribe to live stats
    const unsubStats = subscribeStats(serverId, (stats) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'STATS', data: stats }));
      }
    });

    // Subscribe to status changes
    const unsubStatus = subscribeStatus(serverId, (status) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'STATUS', data: status }));
      }
    });

    // Handle client messages (e.g. terminal command inputs)
    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === 'COMMAND' && typeof payload.command === 'string') {
          handleConsoleCommand(serverId, payload.command);
        } else if (payload.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      unsubLogs();
      unsubStats();
      unsubStatus();
    });

    ws.on('error', () => {
      unsubLogs();
      unsubStats();
      unsubStatus();
    });
  });

  return wss;
}
