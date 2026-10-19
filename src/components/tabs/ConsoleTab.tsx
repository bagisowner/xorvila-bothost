import React, { useState, useEffect, useRef } from 'react';
import { BotServer, ConsoleLogLine } from '../../types';
import { parseAnsi } from '../../lib/ansi';
import {
  Terminal,
  Download,
  Trash2,
  Search,
  Send,
  Wifi,
  WifiOff,
  ArrowDown,
  Zap,
  AlertCircle
} from 'lucide-react';
import { XorvilaAiIcon } from '../icons/XorvilaAiIcon';
import { fetchApi } from '../../lib/api';

interface Props {
  server: BotServer;
  initialLogs?: ConsoleLogLine[];
  onOpenAiDebugger?: (logsText: string) => void;
}

export const ConsoleTab: React.FC<Props> = ({ server, initialLogs = [], onOpenAiDebugger }) => {
  const [logs, setLogs] = useState<ConsoleLogLine[]>(initialLogs);
  const [inputCommand, setInputCommand] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect WebSocket
  useEffect(() => {
    // Initial fetch of logs via REST as reliable base
    fetchApi<ConsoleLogLine[]>(`/servers/${server.id}/logs`).then(res => {
      if (res.success && res.data) {
        setLogs(res.data);
      }
    });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?serverId=${server.id}`;

    let socket: WebSocket;
    let reconnectTimeout: any;

    function connect() {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'INIT') {
              if (msg.data.logs) setLogs(msg.data.logs);
            } else if (msg.type === 'LOG') {
              setLogs(prev => [...prev.slice(-400), msg.data]);
            }
          } catch (e) {
            console.error('Error parsing WS message', e);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [server.id]);

  // Auto-scroll when new log arrives
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleSendCommand = (cmdToSend?: string) => {
    const cmd = (cmdToSend !== undefined ? cmdToSend : inputCommand).trim();
    if (!cmd) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'COMMAND', command: cmd }));
    } else {
      // Fallback REST endpoint
      fetchApi(`/servers/${server.id}/console/input`, {
        method: 'POST',
        body: JSON.stringify({ command: cmd })
      });
    }

    setInputCommand('');
  };

  const handleClearLogs = async () => {
    await fetchApi(`/servers/${server.id}/logs`, { method: 'DELETE' });
    setLogs([]);
  };

  const handleDownloadLogs = () => {
    const rawText = logs
      .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text.replace(/\x1b\[[0-9;]*m/g, '')}`)
      .join('\n');
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = searchQuery
    ? logs.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase()) || l.timestamp.includes(searchQuery))
    : logs;

  return (
    <div id="console-tab-container" className="space-y-3">
      {/* Console Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
            {wsConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <Wifi className="w-3.5 h-3.5" /> Live Stream Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                <WifiOff className="w-3.5 h-3.5" /> Connecting...
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-400">
            Buffer: <strong className="text-zinc-200">{logs.length}</strong> lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-8 pr-2.5 py-1 text-xs rounded-lg bg-zinc-950/60 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 w-36 sm:w-48 transition-all"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-all flex items-center gap-1 ${
              autoScroll
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
            }`}
            title="Toggle Auto Scroll"
          >
            <ArrowDown className="w-3.5 h-3.5" /> Auto-scroll
          </button>

          {onOpenAiDebugger && (
            <button
              onClick={() => {
                const logsText = logs.map(l => `[${l.type.toUpperCase()}] ${l.text}`).join('\n');
                onOpenAiDebugger(logsText);
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all"
              title="Diagnose Console with XorvilaAi"
            >
              <XorvilaAiIcon className="w-3.5 h-3.5 text-cyan-200" />
              <span className="hidden sm:inline">Diagnose with AI</span>
            </button>
          )}

          <button
            onClick={handleDownloadLogs}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-all"
            title="Download Logs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClearLogs}
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-zinc-800 transition-all"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        id="terminal-viewport"
        className="w-full h-[460px] bg-slate-950/90 rounded-xl border border-purple-500/30 p-4 font-mono text-xs overflow-y-auto shadow-2xl relative select-text"
        style={{
          boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.9), 0 0 15px rgba(168, 85, 247, 0.1)'
        }}
      >
        {server.status === 'offline' && logs.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
            <Terminal className="w-8 h-8 text-zinc-600" />
            <p>Container is currently offline. Press Start to boot the bot.</p>
          </div>
        )}

        {filteredLogs.map((log) => {
          const tokens = parseAnsi(log.text);
          return (
            <div key={log.id} className="py-0.5 leading-relaxed flex items-start gap-2.5 hover:bg-white/[0.02] px-1 rounded">
              <span className="text-zinc-600 select-none text-[11px] shrink-0 font-mono">
                [{log.timestamp}]
              </span>
              <div className="break-all whitespace-pre-wrap flex-1 text-zinc-300">
                {tokens.map((token, i) => (
                  <span key={i} className={token.className}>
                    {token.text}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        <div ref={consoleEndRef} />
      </div>

      {/* Quick Command Suggestions */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-purple-400" /> Presets:
        </span>
        {['help', 'ping', 'stats', 'status', 'crash'].map((preset) => (
          <button
            key={preset}
            onClick={() => handleSendCommand(preset)}
            className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Terminal Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendCommand();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-cyan-400 text-xs font-bold select-none">
            &gt;
          </span>
          <input
            id="terminal-command-input"
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            disabled={server.status !== 'online'}
            placeholder={
              server.status === 'online'
                ? "Type a command to send to container (e.g. 'ping', 'stats', 'reload')..."
                : "Server is offline. Start the bot to send commands."
            }
            className="w-full pl-8 pr-4 py-2.5 text-xs font-mono rounded-xl bg-slate-900/80 border border-purple-500/30 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 disabled:opacity-50 transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={server.status !== 'online' || !inputCommand.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-xs font-semibold hover:from-purple-500 hover:to-cyan-500 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
        >
          <Send className="w-3.5 h-3.5" /> Send
        </button>
      </form>
    </div>
  );
};
