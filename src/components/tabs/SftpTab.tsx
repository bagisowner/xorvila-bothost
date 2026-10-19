import React, { useState } from 'react';
import { BotServer } from '../../types';
import { Globe, Copy, Check, ShieldCheck, Terminal, ExternalLink, Lock } from 'lucide-react';

interface Props {
  server: BotServer;
}

export const SftpTab: React.FC<Props> = ({ server }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const sftpHost = typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : (server.sftp?.host || `${server.nodeId}.botcloud.io`);
  const sftpPort = server.sftp?.port || 2022;
  const sftpUser = server.sftp?.username || server.id.replace(/-/g, '_');
  const sftpPass = server.sftp?.password || 'sftp_authed_token_secure';
  const cliCommand = `sftp -P ${sftpPort} ${sftpUser}@${sftpHost}`;

  return (
    <div id="sftp-tab-container" className="max-w-4xl space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5 text-blue-400">
          <Globe className="w-5 h-5" />
          <h3 className="text-sm font-semibold text-zinc-100">Secure File Transfer Protocol (SFTP)</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Connect directly to your isolated container filesystem (<span className="text-cyan-300 font-mono">/server</span>) using any standard SFTP client like FileZilla, Cyberduck, or Termius.
        </p>
      </div>

      {/* Credentials Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Host */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-1">
          <span className="text-xs text-zinc-400">Server Host</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-cyan-300">{sftpHost}</span>
            <button
              onClick={() => copyToClipboard(sftpHost, 'host')}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Copy Host"
            >
              {copiedField === 'host' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Port */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-1">
          <span className="text-xs text-zinc-400">SFTP Port</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-cyan-300">{sftpPort}</span>
            <button
              onClick={() => copyToClipboard(String(sftpPort), 'port')}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Copy Port"
            >
              {copiedField === 'port' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-1">
          <span className="text-xs text-zinc-400">Username</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-purple-300">{sftpUser}</span>
            <button
              onClick={() => copyToClipboard(sftpUser, 'user')}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Copy Username"
            >
              {copiedField === 'user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-1">
          <span className="text-xs text-zinc-400">Password / Token</span>
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-semibold text-zinc-300">••••••••••••••••</span>
            <button
              onClick={() => copyToClipboard(sftpPass, 'pass')}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Copy Password"
            >
              {copiedField === 'pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal CLI Command */}
      <div className="p-4 rounded-xl border border-cyan-500/20 bg-slate-950/80 backdrop-blur-md space-y-2">
        <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
          <Terminal className="w-4 h-4 text-cyan-400" /> Connect via Terminal Command Line
        </span>
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
          <code className="text-xs font-mono text-emerald-400 break-all">{cliCommand}</code>
          <button
            onClick={() => copyToClipboard(cliCommand, 'cli')}
            className="p-1.5 text-zinc-400 hover:text-emerald-300 transition-colors shrink-0 ml-2"
            title="Copy command"
          >
            {copiedField === 'cli' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Security & Chroot Guard */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-slate-900/30 backdrop-blur-md flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-zinc-200">Chrooted & Sandboxed Filesystem</div>
          <p className="text-zinc-400">
            Every SFTP user is locked in a secure Linux jail rooted to <span className="font-mono text-zinc-300">/server</span>. Host OS files and other user containers are strictly inaccessible.
          </p>
        </div>
      </div>
    </div>
  );
};
