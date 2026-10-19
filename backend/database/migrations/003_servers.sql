-- Migration 003: Servers, Environment, Files, and Backups

CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    runtime TEXT NOT NULL DEFAULT 'python',
    version TEXT NOT NULL DEFAULT '3.10',
    status TEXT NOT NULL DEFAULT 'offline',
    node_id TEXT NOT NULL DEFAULT 'host-xorvila-core',
    node_name TEXT NOT NULL DEFAULT 'Xorvila Host Engine',
    node_ip TEXT NOT NULL DEFAULT '127.0.0.1',
    port INTEGER NOT NULL DEFAULT 25000,
    cpu_limit INTEGER NOT NULL DEFAULT 100,
    ram_limit INTEGER NOT NULL DEFAULT 512,
    storage_limit INTEGER NOT NULL DEFAULT 2048,
    startup_command TEXT,
    working_dir TEXT DEFAULT '/server',
    restart_policy TEXT DEFAULT 'on-failure',
    auto_start INTEGER DEFAULT 0,
    suspended INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_environment (
    server_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (server_id, key),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_files (
    server_id TEXT NOT NULL,
    virtual_path TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    permissions TEXT DEFAULT 'rw-r--r--',
    is_base64 INTEGER DEFAULT 0,
    size INTEGER DEFAULT 0,
    PRIMARY KEY (server_id, virtual_path),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_backups (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    download_url TEXT,
    file_count INTEGER DEFAULT 0,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_servers_user_id ON servers(user_id);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_server_files_server_id ON server_files(server_id);
CREATE INDEX IF NOT EXISTS idx_server_backups_server_id ON server_backups(server_id);
