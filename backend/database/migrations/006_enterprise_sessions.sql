-- Migration 006: Enterprise Multi-Device Session Tracking & Data Integrity Canary

ALTER TABLE sessions ADD COLUMN device_name TEXT DEFAULT 'Unknown Device';
ALTER TABLE sessions ADD COLUMN device_type TEXT DEFAULT 'desktop';
ALTER TABLE sessions ADD COLUMN browser TEXT DEFAULT 'Browser';
ALTER TABLE sessions ADD COLUMN os TEXT DEFAULT 'Unknown OS';
ALTER TABLE sessions ADD COLUMN location TEXT DEFAULT 'Local / Direct';

CREATE TABLE IF NOT EXISTS system_integrity_canary (
    id TEXT PRIMARY KEY,
    test_key TEXT NOT NULL,
    test_val TEXT NOT NULL,
    write_ts INTEGER NOT NULL,
    read_ts INTEGER,
    status TEXT NOT NULL DEFAULT 'verified'
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_revoked ON sessions(user_id, revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity DESC);
