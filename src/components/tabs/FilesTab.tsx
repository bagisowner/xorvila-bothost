import React, { useState, useEffect, useRef } from 'react';
import { BotServer, ServerFile } from '../../types';
import { fetchApi } from '../../lib/api';
import {
  Folder,
  FileCode,
  FileText,
  FileJson,
  File,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronRight,
  FolderPlus,
  FilePlus,
  RefreshCw,
  AlertTriangle,
  FileArchive,
  Check,
  Play,
  Zap,
  Terminal,
  FolderArchive,
  Package,
  Layers,
  CheckSquare,
  Square,
  FileDown
} from 'lucide-react';
import JSZip from 'jszip';

interface Props {
  server: BotServer;
  onNavigateTab?: (tab: string) => void;
}

const PYTHON_TEMPLATES = [
  {
    name: 'Discord Bot (discord.py)',
    filename: 'bot.py',
    content: `# Xorvila Bot - Discord.py Gateway Bot
import os
import asyncio
import time

print("\\033[36m[Xorvila Engine]\\033[0m Booting Python Discord Bot...")
print("\\033[32m[System]\\033[0m Connected to isolated storage at /server")

async def main():
    print("[DiscordGateway] Connecting to Discord WSS Shard 0/1...")
    await asyncio.sleep(1)
    print("\\033[32m[DiscordGateway]\\033[0m Logged in as XorvilaBot#1337 (ID: 9876543210)")
    print("[Commands] Loaded 12 slash commands: /ping, /help, /status, /info")
    
    count = 0
    while True:
        await asyncio.sleep(8)
        count += 1
        print(f"\\033[35m[Heartbeat #{count}]\\033[0m Shard 0 latency: 19ms | Active guild cache: 42")

if __name__ == "__main__":
    asyncio.run(main())
`
  },
  {
    name: 'Telegram Bot (python-telegram-bot)',
    filename: 'bot.py',
    content: `# Xorvila Bot - Telegram Bot Poller
import time
import os

print("\\033[36m[Xorvila Engine]\\033[0m Starting Telegram Bot Poller...")
print("\\033[32m[Telegram]\\033[0m Bot token verified. Listening for webhook updates...")

def handle_updates():
    offset = 0
    while True:
        time.sleep(6)
        print(f"\\033[34m[Update Poll]\\033[0m Checked offset {offset}. 0 pending messages. Status: Healthy.")
        offset += 1

if __name__ == "__main__":
    handle_updates()
`
  },
  {
    name: 'Async Background Worker',
    filename: 'bot.py',
    content: `# Xorvila Bot - Async Background Task Engine
import time
import random

print("\\033[36m[Xorvila Engine]\\033[0m Python worker process started.")

jobs = 0
while True:
    time.sleep(5)
    jobs += 1
    duration = random.uniform(0.1, 0.4)
    print(f"\\033[32m[Worker Task #{jobs}]\\033[0m Executed background queue job in {duration:.3f}s. Memory clean.")
`
  },
  {
    name: 'FastAPI / Flask Microservice',
    filename: 'bot.py',
    content: `# Xorvila Bot - Python Webhook Service
import time

print("\\033[36m[Xorvila Engine]\\033[0m Starting ASGI Webhook server on 0.0.0.0:8000...")
print("\\033[32m[Uvicorn]\\033[0m Application startup complete. Uvicorn running on http://0.0.0.0:8000")

requests_count = 0
while True:
    time.sleep(7)
    requests_count += 1
    print(f"\\033[33m[HTTP GET /health]\\033[0m 200 OK (0.8ms) - Request #{requests_count}")
`
  }
];

export const FilesTab: React.FC<Props> = ({ server, onNavigateTab }) => {
  const [currentPath, setCurrentPath] = useState('/server');
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string; originalContent: string; isBase64?: boolean } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);

  // Selected files for batch operations
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  // Dialogs state
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameTarget, setRenameTarget] = useState<ServerFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ServerFile | null>(null);

  // Archive & Extract Dialogs
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [archiveName, setArchiveName] = useState('archive.zip');
  const [extractTarget, setExtractTarget] = useState<ServerFile | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const autoSaveTimerRef = useRef<any>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadFiles = async (path: string) => {
    setLoading(true);
    const res = await fetchApi<{ currentPath: string; files: ServerFile[] }>(
      `/servers/${server.id}/files?path=${encodeURIComponent(path)}`
    );
    if (res.success && res.data) {
      setFiles(res.data.files);
      setCurrentPath(res.data.currentPath);
      setSelectedPaths([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, [server.id, currentPath]);

  // Open file in built-in code editor
  const handleOpenFile = async (file: ServerFile) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      return;
    }

    // If it's a zip file, ask to extract or download instead of viewing raw binary in text editor
    const isZip = file.name.endsWith('.zip') || file.name.endsWith('.tar') || file.name.endsWith('.gz');
    if (isZip) {
      setExtractTarget(file);
      return;
    }

    const res = await fetchApi<{ path: string; content: string; isBase64?: boolean }>(
      `/servers/${server.id}/files/content?path=${encodeURIComponent(file.path)}`
    );

    if (res.success && res.data) {
      setEditingFile({
        path: file.path,
        name: file.name,
        content: res.data.content,
        originalContent: res.data.content,
        isBase64: res.data.isBase64
      });
      setSaveStatus('saved');
    }
  };

  // Save file content
  const handleSaveContent = async (silent: boolean = false) => {
    if (!editingFile) return;
    setSaveStatus('saving');

    const res = await fetchApi(`/servers/${server.id}/files/content`, {
      method: 'PUT',
      body: JSON.stringify({
        path: editingFile.path,
        content: editingFile.content,
        isBase64: editingFile.isBase64
      })
    });

    if (res.success) {
      setEditingFile(prev => prev ? { ...prev, originalContent: prev.content } : null);
      setSaveStatus('saved');
      setLastAutoSaveTime(new Date().toLocaleTimeString());
      if (!silent) {
        showToast(`Saved ${editingFile.name} to /server storage`);
        loadFiles(currentPath);
      }
    } else {
      setSaveStatus('dirty');
    }
  };

  // Debounced auto-save hook
  useEffect(() => {
    if (!editingFile || !autoSaveEnabled) return;
    if (editingFile.content === editingFile.originalContent) return;

    setSaveStatus('dirty');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      await handleSaveContent(true);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editingFile?.content, autoSaveEnabled]);

  // Save & Restart & Switch to live stream console
  const handleSaveAndStream = async () => {
    if (!editingFile) return;
    setSaveStatus('saving');

    // 1. Save file to storage
    await fetchApi(`/servers/${server.id}/files/content`, {
      method: 'PUT',
      body: JSON.stringify({
        path: editingFile.path,
        content: editingFile.content,
        isBase64: editingFile.isBase64
      })
    });
    setEditingFile(prev => prev ? { ...prev, originalContent: prev.content } : null);
    setSaveStatus('saved');

    // 2. Restart container so the new python script runs immediately
    await fetchApi(`/servers/${server.id}/restart`, { method: 'POST' });

    // 3. Switch directly to live console tab
    if (onNavigateTab) {
      onNavigateTab('console');
    }
  };

  const handleApplyTemplate = (tmplContent: string) => {
    if (!editingFile) return;
    setEditingFile(prev => prev ? { ...prev, content: tmplContent } : null);
    setSaveStatus('dirty');
  };

  // Create new file
  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    const res = await fetchApi(`/servers/${server.id}/files/create`, {
      method: 'POST',
      body: JSON.stringify({
        path: currentPath,
        name: newFileName.trim(),
        isDirectory: false,
        content: ''
      })
    });

    if (res.success) {
      const created = newFileName.trim();
      setNewFileName('');
      setNewFileDialog(false);
      showToast(`Created ${created}`);
      loadFiles(currentPath);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const res = await fetchApi(`/servers/${server.id}/files/create`, {
      method: 'POST',
      body: JSON.stringify({
        path: currentPath,
        name: newFolderName.trim(),
        isDirectory: true
      })
    });

    if (res.success) {
      const created = newFolderName.trim();
      setNewFolderName('');
      setNewFolderDialog(false);
      showToast(`Created folder /${created}`);
      loadFiles(currentPath);
    }
  };

  // Rename
  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const res = await fetchApi(`/servers/${server.id}/files/rename`, {
      method: 'POST',
      body: JSON.stringify({
        oldPath: renameTarget.path,
        newName: renameValue.trim()
      })
    });

    if (res.success) {
      showToast(`Renamed to ${renameValue.trim()}`);
      setRenameTarget(null);
      setRenameValue('');
      loadFiles(currentPath);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetchApi(`/servers/${server.id}/files/delete`, {
      method: 'POST',
      body: JSON.stringify({
        path: deleteTarget.path
      })
    });

    if (res.success) {
      showToast(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      loadFiles(currentPath);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedPaths.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedPaths.length} selected item(s)?`)) return;

    for (const path of selectedPaths) {
      await fetchApi(`/servers/${server.id}/files/delete`, {
        method: 'POST',
        body: JSON.stringify({ path })
      });
    }

    showToast(`Deleted ${selectedPaths.length} items`);
    setSelectedPaths([]);
    loadFiles(currentPath);
  };

  // Convert File to Base64
  const fileToBase64 = (file: globalThis.File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:*;base64, header
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload handler supporting both text scripts and binary/zip files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setLoading(true);
    const filesToUpload: { name: string; content: string; isBase64: boolean; size: number }[] = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const isZip = file.name.endsWith('.zip') || file.name.endsWith('.tar') || file.name.endsWith('.gz');
      const isText = /\.(py|js|ts|json|env|txt|md|html|css|sh|yml|yaml|toml|ini|cfg)$/i.test(file.name);

      if (isText && !isZip) {
        const text = await file.text();
        filesToUpload.push({
          name: file.name,
          content: text,
          isBase64: false,
          size: file.size
        });
      } else {
        // Binary or Zip file - encode to Base64 to preserve all bytes accurately
        const base64 = await fileToBase64(file);
        filesToUpload.push({
          name: file.name,
          content: base64,
          isBase64: true,
          size: file.size
        });
      }
    }

    const res = await fetchApi(`/servers/${server.id}/files/upload`, {
      method: 'POST',
      body: JSON.stringify({
        parentPath: currentPath,
        files: filesToUpload
      })
    });

    if (res.success) {
      showToast(`Uploaded ${filesToUpload.length} file(s) successfully!`);
      // If a zip file was uploaded, trigger prompt to extract
      const firstZip = filesToUpload.find(f => f.name.endsWith('.zip'));
      if (firstZip) {
        const fullZipPath = `${currentPath.replace(/\/$/, '')}/${firstZip.name}`;
        setExtractTarget({
          name: firstZip.name,
          path: fullZipPath,
          size: firstZip.size,
          isDirectory: false,
          updatedAt: new Date().toISOString(),
          permissions: 'rw-r--r--',
          extension: 'zip'
        });
      }
    } else {
      showToast('Upload failed: ' + (res.error?.message || 'Server error'), 'error');
    }

    setLoading(false);
    loadFiles(currentPath);
    // Reset file input value
    e.target.value = '';
  };

  // Download a single file reliably
  const handleDownloadFile = async (file: ServerFile, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      showToast(`Preparing download for ${file.name}...`, 'info');
      const res = await fetchApi<{ path: string; content: string; isBase64?: boolean }>(
        `/servers/${server.id}/files/content?path=${encodeURIComponent(file.path)}`
      );

      if (res.success && res.data) {
        let blob: Blob;
        if (res.data.isBase64) {
          // Decode Base64 into Uint8Array
          const byteCharacters = atob(res.data.content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: 'application/octet-stream' });
        } else {
          blob = new Blob([res.data.content], { type: 'text/plain;charset=utf-8' });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${file.name}`);
      } else {
        showToast('Download failed: ' + (res.error?.message || 'File not found'), 'error');
      }
    } catch (err: any) {
      console.error('Download error:', err);
      showToast('Download failed: ' + err.message, 'error');
    }
  };

  // Download Directory as .zip
  const handleDownloadDirectoryZip = async () => {
    try {
      showToast(`Generating zip archive for ${currentPath}...`, 'info');
      const res = await fetchApi<{ currentPath: string; files: ServerFile[] }>(
        `/servers/${server.id}/files?path=${encodeURIComponent(currentPath)}`
      );

      // Client-side ZIP creation with JSZip for seamless fast download
      const zip = new JSZip();
      let added = 0;

      for (const f of files) {
        if (!f.isDirectory) {
          const contentRes = await fetchApi<{ content: string; isBase64?: boolean }>(
            `/servers/${server.id}/files/content?path=${encodeURIComponent(f.path)}`
          );
          if (contentRes.success && contentRes.data) {
            if (contentRes.data.isBase64) {
              zip.file(f.name, contentRes.data.content, { base64: true });
            } else {
              zip.file(f.name, contentRes.data.content);
            }
            added++;
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const folderName = currentPath === '/server' ? `${server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-files` : currentPath.split('/').pop();
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${folderName}.zip (${added} files)`);
    } catch (err: any) {
      showToast('Zip download failed: ' + err.message, 'error');
    }
  };

  // Extract Archive (.zip)
  const handleExtractArchive = async () => {
    if (!extractTarget) return;
    setExtracting(true);

    try {
      // 1. Fetch file content
      const contentRes = await fetchApi<{ content: string; isBase64?: boolean }>(
        `/servers/${server.id}/files/content?path=${encodeURIComponent(extractTarget.path)}`
      );

      if (!contentRes.success || !contentRes.data) {
        throw new Error(contentRes.error?.message || 'Could not read archive file');
      }

      // 2. Load zip in JSZip
      const zip = new JSZip();
      let loadedZip: JSZip;
      if (contentRes.data.isBase64) {
        loadedZip = await zip.loadAsync(contentRes.data.content, { base64: true });
      } else {
        loadedZip = await zip.loadAsync(contentRes.data.content);
      }

      // 3. Extract all entries and upload them to target directory
      const destDir = currentPath;
      const extractedBatch: { name: string; content: string; isBase64: boolean; size: number }[] = [];
      let foldersCreated = 0;

      const fileKeys = Object.keys(loadedZip.files);
      for (const relPath of fileKeys) {
        const zipEntry = loadedZip.files[relPath];
        if (zipEntry.dir) {
          // Create directory
          const folderParts = relPath.replace(/\/$/, '').split('/');
          const folderName = folderParts[folderParts.length - 1];
          const parentSub = folderParts.slice(0, -1).join('/');
          const targetParent = parentSub ? `${destDir}/${parentSub}` : destDir;

          await fetchApi(`/servers/${server.id}/files/create`, {
            method: 'POST',
            body: JSON.stringify({
              path: targetParent,
              name: folderName,
              isDirectory: true
            })
          });
          foldersCreated++;
        } else {
          // File
          const isText = /\.(py|js|ts|json|env|txt|md|html|css|sh|yml|yaml|toml|ini|cfg)$/i.test(relPath);
          if (isText) {
            const text = await zipEntry.async('string');
            extractedBatch.push({
              name: relPath,
              content: text,
              isBase64: false,
              size: text.length
            });
          } else {
            const b64 = await zipEntry.async('base64');
            extractedBatch.push({
              name: relPath,
              content: b64,
              isBase64: true,
              size: Math.floor((b64.length * 3) / 4)
            });
          }
        }
      }

      if (extractedBatch.length > 0) {
        await fetchApi(`/servers/${server.id}/files/upload`, {
          method: 'POST',
          body: JSON.stringify({
            parentPath: destDir,
            files: extractedBatch
          })
        });
      }

      showToast(`Extracted ${extractedBatch.length} files & ${foldersCreated} folders into ${destDir}!`);
      setExtractTarget(null);
      loadFiles(currentPath);
    } catch (err: any) {
      console.error('Extract error:', err);
      showToast('Extract failed: ' + (err.message || 'Invalid zip format'), 'error');
    } finally {
      setExtracting(false);
    }
  };

  // Create Archive (.zip) from selected items or current directory
  const handleCreateArchive = async () => {
    setArchiving(true);
    const targetPaths = selectedPaths.length > 0 ? selectedPaths : files.map(f => f.path);

    try {
      const res = await fetchApi(`/servers/${server.id}/files/archive`, {
        method: 'POST',
        body: JSON.stringify({
          paths: targetPaths,
          targetDir: currentPath,
          archiveName: archiveName.trim() || 'archive.zip'
        })
      });

      if (res.success) {
        showToast(`Created archive ${archiveName} (${targetPaths.length} items)`);
        setArchiveDialog(false);
        setArchiveName('archive.zip');
        setSelectedPaths([]);
        loadFiles(currentPath);
      } else {
        showToast('Archive failed: ' + (res.error?.message || 'Server error'), 'error');
      }
    } catch (err: any) {
      showToast('Archive failed: ' + err.message, 'error');
    } finally {
      setArchiving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPaths.length === files.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(files.map(f => f.path));
    }
  };

  const toggleSelectPath = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPaths(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const getFileIcon = (file: ServerFile) => {
    if (file.isDirectory) return <Folder className="w-4 h-4 text-purple-400 fill-purple-400/20" />;
    const ext = file.extension?.toLowerCase() || file.name.split('.').pop()?.toLowerCase();
    if (ext === 'py' || ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
      return <FileCode className="w-4 h-4 text-cyan-400" />;
    }
    if (ext === 'json' || ext === 'env' || ext === 'yml' || ext === 'yaml') {
      return <FileJson className="w-4 h-4 text-amber-400" />;
    }
    if (ext === 'zip' || ext === 'tar' || ext === 'gz') {
      return <FileArchive className="w-4 h-4 text-rose-400" />;
    }
    return <FileText className="w-4 h-4 text-zinc-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  // If currently editing a file in code editor
  if (editingFile) {
    const lineCount = editingFile.content.split('\n').length;
    const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
      <div id="code-editor-container" className="space-y-3">
        {/* Editor Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-purple-500/20 bg-slate-900/70 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (saveStatus === 'dirty') {
                  if (confirm('You have unsaved changes. Are you sure you want to exit?')) {
                    setEditingFile(null);
                  }
                } else {
                  setEditingFile(null);
                }
              }}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-all"
              title="Close Editor"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs">
              <span className="text-zinc-500 font-mono">Editing: </span>
              <strong className="text-cyan-300 font-mono">{editingFile.path}</strong>
            </div>

            {/* Auto-Save & Status Badge */}
            {saveStatus === 'dirty' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse">
                Auto-saving...
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-950/60 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400" /> Auto-Saved {lastAutoSaveTime && `at ${lastAutoSaveTime}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Templates for Python */}
            {editingFile.name.endsWith('.py') && (
              <select
                onChange={(e) => {
                  const tmpl = PYTHON_TEMPLATES.find(t => t.name === e.target.value);
                  if (tmpl) handleApplyTemplate(tmpl.content);
                }}
                defaultValue=""
                className="px-2.5 py-1.5 text-xs rounded-lg bg-zinc-950 border border-purple-500/30 text-purple-300 focus:outline-none focus:border-cyan-400"
              >
                <option value="" disabled>Insert Python Template...</option>
                {PYTHON_TEMPLATES.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => handleSaveContent(false)}
              disabled={saveStatus === 'saving'}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>

            <button
              onClick={handleSaveAndStream}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.35)]"
              title="Saves script to storage area and switches to live streaming console"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Save & Stream Live
            </button>
          </div>
        </div>

        {/* Code Editor Body with Line Numbers */}
        <div className="flex rounded-xl border border-purple-500/30 bg-slate-950/90 font-mono text-xs overflow-hidden h-[500px] shadow-2xl">
          {/* Line Numbers Gutter */}
          <div className="w-12 bg-slate-900/60 border-r border-zinc-800/80 py-3 text-right pr-3 select-none text-zinc-600 overflow-hidden shrink-0">
            {lines.map((num) => (
              <div key={num} className="leading-6 text-[11px]">
                {num}
              </div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            value={editingFile.content}
            onChange={(e) => {
              const val = e.target.value;
              setEditingFile(prev => prev ? { ...prev, content: val } : null);
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveContent(false);
              }
            }}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-zinc-200 resize-none focus:outline-none leading-6 font-mono selection:bg-purple-900/50"
          />
        </div>
      </div>
    );
  }

  return (
    <div id="file-manager-container" className="space-y-4 relative">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-medium backdrop-blur-md shadow-2xl border flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
          toastMessage.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
            : toastMessage.type === 'info'
            ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500/40'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
        }`}>
          {toastMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-emerald-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* File Manager Toolbar & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-purple-500/20 bg-slate-900/60 backdrop-blur-md">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-1">
          <button
            onClick={() => setCurrentPath('/server')}
            className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
          >
            <Folder className="w-3.5 h-3.5" /> /server
          </button>
          {pathParts.slice(1).map((part, idx) => {
            const subPath = '/server/' + pathParts.slice(1, idx + 2).join('/');
            return (
              <React.Fragment key={subPath}>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                <button
                  onClick={() => setCurrentPath(subPath)}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Batch operations */}
          {selectedPaths.length > 0 && (
            <div className="flex items-center gap-1.5 bg-purple-950/60 border border-purple-500/40 px-2 py-1 rounded-lg mr-1">
              <span className="text-[11px] text-purple-300 font-bold">{selectedPaths.length} selected</span>
              <button
                onClick={() => {
                  setArchiveName(`archive-${selectedPaths.length}-items.zip`);
                  setArchiveDialog(true);
                }}
                className="px-2 py-0.5 text-[11px] font-semibold rounded bg-purple-600 text-white hover:bg-purple-500 transition-all flex items-center gap-1"
                title="Archive selected to .zip"
              >
                <FolderArchive className="w-3 h-3" /> Archive
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-2 py-0.5 text-[11px] font-semibold rounded bg-rose-600 text-white hover:bg-rose-500 transition-all flex items-center gap-1"
                title="Delete selected"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          <button
            onClick={() => loadFiles(currentPath)}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-all"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Upload Button */}
          <label className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm">
            <Upload className="w-3.5 h-3.5 text-purple-400" /> Upload Files / Zip
            <input type="file" multiple onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Archive (.zip) Toolbar Button */}
          <button
            onClick={() => {
              setArchiveName(currentPath === '/server' ? `${server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip` : `${currentPath.split('/').pop() || 'files'}.zip`);
              setArchiveDialog(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
            title="Compress directory or selected items into a .zip file"
          >
            <FolderArchive className="w-3.5 h-3.5" /> Archive (.zip)
          </button>

          {/* Download Directory Zip */}
          <button
            onClick={handleDownloadDirectoryZip}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
            title="Download current directory as a .zip file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> Download Zip
          </button>

          <button
            onClick={() => setNewFileDialog(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
          >
            <FilePlus className="w-3.5 h-3.5" /> New File
          </button>

          <button
            onClick={() => setNewFolderDialog(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New Folder
          </button>
        </div>
      </div>

      {/* Files Table */}
      <div className="rounded-xl border border-purple-500/20 bg-slate-900/40 backdrop-blur-md overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-950/40 border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider items-center">
          <div className="col-span-1 sm:col-span-1 flex items-center">
            <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-purple-400">
              {selectedPaths.length > 0 && selectedPaths.length === files.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <div className="col-span-5 sm:col-span-4">Name</div>
          <div className="col-span-3 sm:col-span-2 text-right">Size</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Permissions</div>
          <div className="hidden sm:block sm:col-span-1 text-right">Modified</div>
          <div className="col-span-3 sm:col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-zinc-800/40">
          {currentPath !== '/server' && (
            <div
              onClick={() => {
                const parts = currentPath.split('/');
                parts.pop();
                setCurrentPath(parts.join('/') || '/server');
              }}
              className="grid grid-cols-12 gap-2 px-4 py-2 text-xs hover:bg-white/[0.02] cursor-pointer text-purple-400 items-center"
            >
              <div className="col-span-12 flex items-center gap-2">
                <Folder className="w-4 h-4 text-purple-400" />
                <span className="font-mono">.. (Parent Directory)</span>
              </div>
            </div>
          )}

          {files.length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
              <Package className="w-8 h-8 mx-auto text-zinc-600" />
              <p>This storage directory is empty.</p>
              <p className="text-zinc-600">Upload a <code className="text-rose-400">.zip</code> archive, create <code className="text-cyan-300">bot.py</code>, or use starter templates.</p>
            </div>
          )}

          {files.map((file) => {
            const isZip = file.name.endsWith('.zip') || file.name.endsWith('.tar') || file.name.endsWith('.gz');
            const isSelected = selectedPaths.includes(file.path);

            return (
              <div
                key={file.path}
                onClick={() => handleOpenFile(file)}
                className={`grid grid-cols-12 gap-2 px-4 py-2.5 text-xs hover:bg-white/[0.03] cursor-pointer items-center transition-all group ${
                  isSelected ? 'bg-purple-950/30' : ''
                }`}
              >
                {/* Select Checkbox */}
                <div className="col-span-1 sm:col-span-1 flex items-center" onClick={(e) => toggleSelectPath(file.path, e)}>
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                  )}
                </div>

                {/* Name */}
                <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 min-w-0">
                  {getFileIcon(file)}
                  <span className="font-medium text-zinc-200 truncate group-hover:text-cyan-300 transition-colors">
                    {file.name}
                  </span>
                  {file.name === 'bot.py' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 shrink-0">
                      Live Entry
                    </span>
                  )}
                  {isZip && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-950 text-rose-300 border border-rose-500/30 shrink-0">
                      Zip Archive
                    </span>
                  )}
                </div>

                {/* Size */}
                <div className="col-span-3 sm:col-span-2 text-right text-zinc-400 font-mono text-[11px]">
                  {file.isDirectory ? '-' : formatSize(file.size)}
                </div>

                {/* Permissions */}
                <div className="hidden sm:block sm:col-span-2 text-right text-zinc-400 font-mono text-[11px]">
                  {file.permissions}
                </div>

                {/* Modified Time */}
                <div className="hidden sm:block sm:col-span-1 text-right text-zinc-400 text-[11px] truncate">
                  {new Date(file.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Actions */}
                <div className="col-span-3 sm:col-span-2 flex justify-end items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Extract Button for Zip Archives */}
                  {isZip && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExtractTarget(file);
                      }}
                      className="px-2 py-0.5 text-[11px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40 transition-all flex items-center gap-1"
                      title="Extract all files from this archive"
                    >
                      <Layers className="w-3 h-3 text-cyan-400" /> Extract
                    </button>
                  )}

                  {!file.isDirectory && (
                    <button
                      onClick={(e) => handleDownloadFile(file, e)}
                      className="p-1 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded transition-colors"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setRenameTarget(file);
                      setRenameValue(file.name);
                    }}
                    className="p-1 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteTarget(file)}
                    className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extract Zip Modal */}
      {extractTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <FileArchive className="w-5 h-5" />
                <h3 className="text-sm font-bold text-zinc-100">Extract Archive</h3>
              </div>
              <button onClick={() => setExtractTarget(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Extract all files from <strong className="text-cyan-300 font-mono">{extractTarget.name}</strong> ({formatSize(extractTarget.size)}) into destination directory:
            </p>

            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200 flex items-center gap-2">
              <Folder className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{currentPath}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setExtractTarget(null)}
                disabled={extracting}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExtractArchive}
                disabled={extracting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Unzipping...
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" /> Extract Files Here
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive / Zip Modal */}
      {archiveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-purple-400">
                <FolderArchive className="w-5 h-5" />
                <h3 className="text-sm font-bold text-zinc-100">Create Zip Archive</h3>
              </div>
              <button onClick={() => setArchiveDialog(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-zinc-400">Archive File Name</label>
              <input
                type="text"
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="backup.zip"
                className="w-full mt-1.5 px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-purple-400 font-mono"
                autoFocus
              />
            </div>

            <p className="text-xs text-zinc-400">
              {selectedPaths.length > 0
                ? `Compressing ${selectedPaths.length} selected item(s) into this archive.`
                : `Compressing all files in ${currentPath} into this archive.`}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setArchiveDialog(false)}
                disabled={archiving}
                className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateArchive}
                disabled={archiving || !archiveName.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                {archiving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compressing...
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-3.5 h-3.5" /> Compress to Zip
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {newFileDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-cyan-400" /> Create New File
              </h3>
              <button onClick={() => setNewFileDialog(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-zinc-400">File Name (e.g. bot.py, requirements.txt, config.json)</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="bot.py"
                className="w-full mt-1.5 px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400 font-mono"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewFileDialog(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {newFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-purple-400" /> Create New Folder
              </h3>
              <button onClick={() => setNewFolderDialog(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Folder Name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="modules"
                className="w-full mt-1.5 px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewFolderDialog(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-100">Rename Item</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenameTarget(null)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button>
              <button onClick={handleRename} className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 text-white">Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-rose-500/40 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-zinc-100">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete <strong className="text-zinc-200 font-mono">{deleteTarget.name}</strong>? This operation cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-3 py-1.5 text-xs text-zinc-400">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
