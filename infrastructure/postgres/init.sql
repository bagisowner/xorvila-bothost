-- BotCloud PostgreSQL Production Schema
-- Designed for High-Throughput Bot Container Orchestration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(32) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    avatar_url TEXT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(64),
    email_verified BOOLEAN DEFAULT TRUE,
    suspended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);

-- 2. User Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. API Tokens
CREATE TABLE IF NOT EXISTS api_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Daemon Nodes
CREATE TABLE IF NOT EXISTS nodes (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    hostname VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    location VARCHAR(128),
    docker_version VARCHAR(64),
    status VARCHAR(32) DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
    total_cpu INTEGER NOT NULL, -- in percentage e.g. 800 for 8 cores
    used_cpu INTEGER DEFAULT 0,
    total_ram_mb INTEGER NOT NULL,
    used_ram_mb INTEGER DEFAULT 0,
    total_disk_gb INTEGER NOT NULL,
    used_disk_gb INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Bot Servers / Containers
CREATE TABLE IF NOT EXISTS servers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id VARCHAR(64) NOT NULL REFERENCES nodes(id),
    runtime VARCHAR(32) NOT NULL CHECK (runtime IN ('python', 'node')),
    version VARCHAR(32) NOT NULL,
    status VARCHAR(32) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'starting', 'stopping', 'restarting', 'installing', 'crashed')),
    port INTEGER NOT NULL,
    cpu_limit INTEGER NOT NULL DEFAULT 100,
    ram_limit_mb INTEGER NOT NULL DEFAULT 512,
    storage_limit_mb INTEGER NOT NULL DEFAULT 2048,
    startup_command VARCHAR(512) NOT NULL,
    working_dir VARCHAR(255) DEFAULT '/server',
    restart_policy VARCHAR(32) DEFAULT 'on-failure' CHECK (restart_policy IN ('always', 'on-failure', 'unless-stopped', 'never')),
    auto_start BOOLEAN DEFAULT TRUE,
    suspended BOOLEAN DEFAULT FALSE,
    sftp_username VARCHAR(64) NOT NULL,
    sftp_password_hash VARCHAR(255),
    git_repo_url TEXT,
    git_branch VARCHAR(128),
    git_auto_deploy BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_servers_owner ON servers(owner_id);
CREATE INDEX idx_servers_node ON servers(node_id);

-- 6. Server Environment Variables
CREATE TABLE IF NOT EXISTS server_environment (
    id SERIAL PRIMARY KEY,
    server_id VARCHAR(64) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    env_key VARCHAR(255) NOT NULL,
    env_value TEXT NOT NULL,
    is_secret BOOLEAN DEFAULT TRUE,
    UNIQUE(server_id, env_key)
);

-- 7. Server Backups
CREATE TABLE IF NOT EXISTS server_backups (
    id VARCHAR(64) PRIMARY KEY,
    server_id VARCHAR(64) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    status VARCHAR(32) DEFAULT 'completed' CHECK (status IN ('completed', 'creating', 'restoring', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
