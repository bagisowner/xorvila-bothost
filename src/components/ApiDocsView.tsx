import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Code2,
  Key,
  Copy,
  Check,
  Globe,
  Radio,
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'javascript'>('curl');

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/servers',
      desc: 'List all bot containers owned by authenticated account or all cluster containers for administrators.',
      auth: true,
      snippet: {
        curl: `curl -X GET "https://api.xorvila.com/api/servers" \\
  -H "Authorization: Bearer xor_live_your_api_token_here"`,
        python: `import requests

response = requests.get(
    "https://api.xorvila.com/api/servers",
    headers={"Authorization": "Bearer xor_live_your_api_token_here"}
)
print(response.json())`,
        javascript: `const res = await fetch('https://api.xorvila.com/api/servers', {
  headers: { 'Authorization': 'Bearer xor_live_your_api_token_here' }
});
const data = await res.json();
console.log(data);`
      }
    },
    {
      method: 'POST',
      path: '/api/servers',
      desc: 'Provision a new isolated host-native bot service process with configured runtime, CPU, RAM limits, and startup commands.',
      auth: true,
      snippet: {
        curl: `curl -X POST "https://your-botcloud-domain.com/api/servers" \\
  -H "Authorization: Bearer btc_live_your_api_token_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Discord Bot",
    "runtime": "python",
    "version": "3.12",
    "startupCommand": "python bot.py",
    "cpuLimit": 100,
    "ramLimit": 512,
    "storageLimit": 2048,
    "restartPolicy": "always",
    "autoStart": true,
    "env": {
      "DISCORD_TOKEN": "your_bot_token"
    }
  }'`,
        python: `import requests

payload = {
    "name": "Production Discord Bot",
    "runtime": "python",
    "version": "3.12",
    "startupCommand": "python bot.py",
    "cpuLimit": 100,
    "ramLimit": 512,
    "storageLimit": 2048,
    "restartPolicy": "always",
    "autoStart": True,
    "env": {"DISCORD_TOKEN": "your_bot_token"}
}

res = requests.post(
    "https://your-botcloud-domain.com/api/servers",
    json=payload,
    headers={"Authorization": "Bearer btc_live_your_api_token_here"}
)
print(res.json())`,
        javascript: `const res = await fetch('https://your-botcloud-domain.com/api/servers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer btc_live_your_api_token_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Production Discord Bot',
    runtime: 'python',
    version: '3.12',
    startupCommand: 'python bot.py',
    cpuLimit: 100,
    ramLimit: 512,
    storageLimit: 2048,
    restartPolicy: 'always',
    autoStart: true,
    env: { DISCORD_TOKEN: 'your_bot_token' }
  })
});
console.log(await res.json());`
      }
    },
    {
      method: 'POST',
      path: '/api/servers/{id}/start',
      desc: 'Start an offline or crashed bot container process.',
      auth: true,
      snippet: {
        curl: `curl -X POST "https://your-botcloud-domain.com/api/servers/srv-py-discord-01/start" \\
  -H "Authorization: Bearer btc_live_your_api_token_here"`,
        python: `import requests

res = requests.post(
    "https://your-botcloud-domain.com/api/servers/srv-py-discord-01/start",
    headers={"Authorization": "Bearer btc_live_your_api_token_here"}
)
print(res.json())`,
        javascript: `await fetch('https://your-botcloud-domain.com/api/servers/srv-py-discord-01/start', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer btc_live_your_api_token_here' }
});`
      }
    },
    {
      method: 'POST',
      path: '/api/servers/{id}/stop',
      desc: 'Send graceful SIGTERM to stop bot container.',
      auth: true,
      snippet: {
        curl: `curl -X POST "https://your-botcloud-domain.com/api/servers/srv-py-discord-01/stop" \\
  -H "Authorization: Bearer btc_live_your_api_token_here"`,
        python: `import requests

res = requests.post(
    "https://your-botcloud-domain.com/api/servers/srv-py-discord-01/stop",
    headers={"Authorization": "Bearer btc_live_your_api_token_here"}
)
print(res.json())`,
        javascript: `await fetch('https://your-botcloud-domain.com/api/servers/srv-py-discord-01/stop', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer btc_live_your_api_token_here' }
});`
      }
    },
    {
      method: 'POST',
      path: '/api/servers/{id}/git/deploy',
      desc: 'Trigger immediate Git pull / checkout and reload dependencies.',
      auth: true,
      snippet: {
        curl: `curl -X POST "https://your-botcloud-domain.com/api/servers/srv-py-discord-01/git/deploy" \\
  -H "Authorization: Bearer btc_live_your_api_token_here"`,
        python: `import requests

res = requests.post(
    "https://your-botcloud-domain.com/api/servers/srv-py-discord-01/git/deploy",
    headers={"Authorization": "Bearer btc_live_your_api_token_here"}
)
print(res.json())`,
        javascript: `await fetch('https://your-botcloud-domain.com/api/servers/srv-py-discord-01/git/deploy', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer btc_live_your_api_token_here' }
});`
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="p-6 rounded-2xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">BotCloud Developer REST & WebSocket API</h1>
            <p className="text-xs text-zinc-400">
              Integrate bot lifecycle automation, continuous deployment pipelines, and live telemetry into your CI/CD workflow.
            </p>
          </div>
        </div>

        {/* Authentication Notice */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-zinc-300">
          <Key className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <span className="font-semibold text-cyan-300">Authentication:</span> All API requests accept an HTTP header{' '}
            <code className="text-purple-300 font-mono">Authorization: Bearer &lt;API_TOKEN&gt;</code>. Generate tokens under your Account menu.
          </div>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-200">Core REST Endpoints</h2>
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setSelectedLang('curl')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
              selectedLang === 'curl' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            cURL
          </button>
          <button
            onClick={() => setSelectedLang('python')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
              selectedLang === 'python' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Python
          </button>
          <button
            onClick={() => setSelectedLang('javascript')}
            className={`px-3 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
              selectedLang === 'javascript' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Node.js / JS
          </button>
        </div>
      </div>

      {/* Endpoint Cards */}
      <div className="space-y-4">
        {endpoints.map((ep, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-purple-500/15 bg-slate-900/60 backdrop-blur-md overflow-hidden"
          >
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${
                    ep.method === 'GET'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-xs font-bold text-zinc-100">{ep.path}</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-xl">{ep.desc}</p>
            </div>

            <div className="p-4 bg-zinc-950 relative group">
              <button
                onClick={() => copyToClipboard(`snip-${idx}`, ep.snippet[selectedLang])}
                className="absolute right-4 top-4 p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-all opacity-80 group-hover:opacity-100"
                title="Copy code snippet"
              >
                {copiedId === `snip-${idx}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <pre className="text-xs font-mono text-cyan-200 overflow-x-auto pr-10 leading-relaxed">
                {ep.snippet[selectedLang]}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time WebSocket Protocol Guide */}
      <div className="p-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-zinc-100">Real-time WebSocket Live Console & Telemetry Stream</h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Connect to <code className="text-cyan-300 font-mono">wss://your-domain.com/ws?serverId=&lt;SERVER_ID&gt;</code> to receive
          instantaneous streaming STDOUT/STDERR logs, status changes (online/stopping/crashed), and continuous 2-second resource telemetry metrics.
        </p>

        <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
          <pre className="text-xs font-mono text-purple-200 overflow-x-auto">
{`const ws = new WebSocket('wss://your-botcloud.io/ws?serverId=srv-py-discord-01');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case 'LOG':
      console.log('Bot STDOUT:', message.data.text);
      break;
    case 'STATS':
      console.log('CPU:', message.data.cpuUsage, '% | RAM:', message.data.ramUsage, 'MB');
      break;
    case 'STATUS':
      console.log('Container Status Changed:', message.data);
      break;
  }
};

// Send command to stdin:
ws.send(JSON.stringify({ type: 'COMMAND', data: '!reload config' }));`}
          </pre>
        </div>
      </div>
    </div>
  );
};
