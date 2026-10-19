-- Migration 005: System Notifications and Announcements

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

CREATE INDEX IF NOT EXISTS idx_system_notifications_active ON system_notifications(is_active, created_at DESC);
