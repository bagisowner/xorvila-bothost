import React, { useState } from 'react';
import { BotServer, GitDeploymentConfig } from '../../types';
import { fetchApi } from '../../lib/api';
import { GitBranch, GitPullRequest, Play, Check, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

interface Props {
  server: BotServer;
  onUpdate: (updated: BotServer) => void;
}

export const GitTab: React.FC<Props> = ({ server, onUpdate }) => {
  const [repoUrl, setRepoUrl] = useState(server.git?.url || '');
  const [branch, setBranch] = useState(server.git?.branch || 'main');
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  const handleDeploy = async () => {
    if (!repoUrl.trim()) return;
    setDeploying(true);
    setDeploySuccess(false);

    const res = await fetchApi<{ git: GitDeploymentConfig; message: string }>(
      `/servers/${server.id}/git/deploy`,
      {
        method: 'POST',
        body: JSON.stringify({
          url: repoUrl.trim(),
          branch: branch.trim() || 'main'
        })
      }
    );

    if (res.success && res.data) {
      onUpdate({ ...server, git: res.data.git });
      setDeploySuccess(true);
      setTimeout(() => setDeploySuccess(false), 4000);
    }
    setDeploying(false);
  };

  return (
    <div id="git-tab-container" className="max-w-4xl space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2 text-emerald-400">
          <GitBranch className="w-5 h-5" />
          <h3 className="text-sm font-semibold text-zinc-100">Git Repository Continuous Deployment</h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Connect your GitHub, GitLab, or Gitea repository. The bot container will pull the branch, install dependencies, and hot-restart seamlessly.
        </p>
      </div>

      {/* Git Config Form */}
      <div className="p-5 rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md space-y-4">
        <div>
          <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Git Repository URL (HTTPS)</label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/my-discord-bot.git"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-700 text-cyan-300 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Target Branch</label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main or master"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleDeploy}
              disabled={deploying || !repoUrl.trim()}
              className="w-full py-2 px-4 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {deploying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : deploySuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {deploying ? 'Cloning & Deploying...' : deploySuccess ? 'Deployed Successfully!' : 'Pull & Deploy Now'}
            </button>
          </div>
        </div>

        {server.git?.lastDeployedAt && (
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Last Deployed:</span>
              <span className="text-zinc-200">{new Date(server.git.lastDeployedAt).toLocaleString()}</span>
            </div>
            {server.git.lastCommit && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Commit:</span>
                <span className="text-cyan-400 font-mono">{server.git.lastCommit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-slate-900/30 backdrop-blur-md flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-semibold text-zinc-200">Isolated Git Execution</div>
          <p className="text-zinc-400">
            Git clone and hook commands are executed purely within the non-root container environment. Host execution is strictly forbidden.
          </p>
        </div>
      </div>
    </div>
  );
};
