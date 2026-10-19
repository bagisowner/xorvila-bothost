import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import { store } from './store';
import {
  subscribeLogs,
  subscribeStats,
  subscribeStatus,
  handleConsoleCommand
} from './dockerSimulation';

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);

    if (pathname === '/ws' || pathname === '/api/ws') {
      const serverId = query.serverId as string;
      const token = query.token as string;

      // Allow connection if server exists
      if (!serverId || !store.servers.has(serverId)) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
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
