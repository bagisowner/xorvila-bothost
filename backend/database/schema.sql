-- Full Schema for Xorvila Bot Hosting Local SQLite Database
-- Database file: data/database.db

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    email_verified INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    suspended INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token_hash TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_name TEXT DEFAULT 'Unknown Device',
    device_type TEXT DEFAULT 'desktop',
    browser TEXT DEFAULT 'Browser',
    os TEXT DEFAULT 'Unknown OS',
    location TEXT DEFAULT 'Local / Direct',
    created_at TEXT NOT NULL,
    last_activity TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_integrity_canary (
    id TEXT PRIMARY KEY,
    test_key TEXT NOT NULL,
    test_val TEXT NOT NULL,
    write_ts INTEGER NOT NULL,
    read_ts INTEGER,
    status TEXT NOT NULL DEFAULT 'verified'
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    username_or_email TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    prefix TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    priority TEXT NOT NULL DEFAULT 'normal',
    target_role TEXT NOT NULL DEFAULT 'all',
    created_by TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(ip_address, username_or_email, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_servers_user_id ON servers(user_id);
CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
CREATE INDEX IF NOT EXISTS idx_server_files_server_id ON server_files(server_id);
CREATE INDEX IF NOT EXISTS idx_server_backups_server_id ON server_backups(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, created_at DESC);
