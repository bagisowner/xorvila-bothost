import os from 'os';
import { Router, Request, Response } from 'express';
import { store, hydrateStoreFromDb, savePlatformSettings } from '../store';
import { db } from '../dbBridge';
import { authenticate, requireRole } from './auth';
import { syncDiskToStore, syncFilesToDisk, stopServerContainer, cleanServerWorkspaceDir } from '../dockerSimulation';
import { ClusterOverview, ServerNode, User, StoreItem, RewardTask, StarterPlanConfig } from '../../src/types';

export const adminRouter = Router();

// Require admin or moderator for all /api/admin routes
adminRouter.use(authenticate);
adminRouter.use(requireRole(['admin', 'moderator']));

// 1. Cluster Overview
adminRouter.get('/overview', (req: Request, res: Response) => {
  const allServers = Array.from(store.servers.values());
  const allNodes = Array.from(store.nodes.values());

  const onlineServers = allServers.filter(s => s.status === 'online').length;
  const offlineServers = allServers.filter(s => s.status === 'offline').length;
  const crashedServers = allServers.filter(s => s.status === 'crashed').length;

  const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeRamMb = Math.round(os.freemem() / (1024 * 1024));
  const usedRamMb = totalRamMb - freeRamMb;

  const overview: ClusterOverview = {
    totalServers: allServers.length,
    onlineServers,
    offlineServers,
    crashedServers,
    totalUsers: store.users.size,
    totalNodes: allNodes.length,
    onlineNodes: allNodes.filter(n => n.status === 'online').length,
    clusterCpuUsagePercent: Math.min(100, Math.round(os.loadavg()[0] * 10)),
    clusterRamUsageMb: usedRamMb,
    clusterRamTotalMb: totalRamMb,
    clusterDiskUsageGb: 5,
    clusterDiskTotalGb: 100,
    recentAuditLogs: store.auditLogs.slice(0, 10)
  };

  return res.json({
    success: true,
    data: overview
  });
});

// 2. User Management
adminRouter.get('/users', (req: Request, res: Response) => {
  const users = Array.from(store.users.values()).map(u => {
    const { passwordHash: _, ...safe } = u;
    return safe;
  });

  return res.json({
    success: true,
    data: users
  });
});

adminRouter.post('/users/:id/suspend', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const targetUser = store.users.get(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  targetUser.suspended = !targetUser.suspended;
  db.saveUser(targetUser);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: targetUser.suspended ? 'USER_SUSPEND' : 'USER_UNSUSPEND',
    resourceType: 'user',
    resourceId: targetUser.id,
    details: `${targetUser.suspended ? 'Suspended' : 'Unsuspended'} user ${targetUser.email}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safe } = targetUser;
  return res.json({ success: true, data: safe });
});

adminRouter.put('/users/:id/role', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const { role } = req.body;
  const targetUser = store.users.get(req.params.id);

  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  if (!['user', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role' } });
  }

  targetUser.role = role;
  db.saveUser(targetUser);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'USER_ROLE_CHANGE',
    resourceType: 'user',
    resourceId: targetUser.id,
    details: `Changed role of ${targetUser.email} to ${role}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safe } = targetUser;
  return res.json({ success: true, data: safe });
});

// Update User details (Name, Username, Email, Role, Suspended status)
adminRouter.put('/users/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const targetUser = store.users.get(req.params.id);

  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  const { name, username, email, role, suspended } = req.body;

  if (name !== undefined && name.trim()) targetUser.name = name.trim();
  if (username !== undefined && username.trim()) targetUser.username = username.trim();
  if (email !== undefined && email.trim()) targetUser.email = email.trim();

  if (role && ['user', 'moderator', 'admin'].includes(role)) {
    targetUser.role = role;
  }

  if (suspended !== undefined) {
    targetUser.suspended = Boolean(suspended);
  }

  targetUser.updatedAt = new Date().toISOString();
  db.saveUser(targetUser);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'USER_EDIT',
    resourceType: 'user',
    resourceId: targetUser.id,
    details: `Updated user profile ${targetUser.email} (${targetUser.role}, ${targetUser.suspended ? 'Suspended' : 'Active'})`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safe } = targetUser;
  return res.json({ success: true, data: safe });
});

adminRouter.delete('/users/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const targetId = req.params.id;

  if (targetId === admin.id) {
    return res.status(400).json({
      success: false,
      error: { code: 'SELF_DELETE', message: 'You cannot delete your own active administrator account.' }
    });
  }

  // Find user in memory or fallback to database lookup
  let targetUser = store.users.get(targetId);
  if (!targetUser) {
    const allDbUsers = db.getAll().users || [];
    const found = allDbUsers.find(u => u.id === targetId);
    if (found) {
      targetUser = found as any;
    }
  }

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found in system records.' }
    });
  }

  // Stop running containers and wipe disk workspaces for all servers owned by this user
  for (const [sId, s] of Array.from(store.servers.entries())) {
    if (s.ownerId === targetId) {
      try {
        await stopServerContainer(sId, true);
        cleanServerWorkspaceDir(sId);
      } catch (e) {
        console.error(`Error cleaning server ${sId} during user deletion:`, e);
      }
      store.servers.delete(sId);
      store.files.delete(sId);
      store.logs.delete(sId);
      store.backups.delete(sId);
      db.deleteServer(sId);
    }
  }

  // Delete from persistent DB and memory
  db.deleteUser(targetId);
  store.users.delete(targetId);

  // Revoke all active sessions for this user
  for (const [token, sess] of Array.from(store.sessions.entries())) {
    if (sess.userId === targetId) {
      store.sessions.delete(token);
    }
  }

  // Rehydrate in-memory store so counts and users reflect immediately
  try {
    hydrateStoreFromDb();
  } catch (e) {
    console.warn('Rehydration warning after user deletion:', e);
  }

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'USER_DELETE',
    resourceType: 'user',
    resourceId: targetId,
    details: `Permanently deleted user account ${targetUser.email} and all assigned servers/sessions`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: { message: `Successfully deleted user ${targetUser.email}` }
  });
});

// 3. Node Management
adminRouter.get('/nodes', (req: Request, res: Response) => {
  const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
  const freeRamMb = Math.round(os.freemem() / (1024 * 1024));
  const usedRamMb = totalRamMb - freeRamMb;

  // Update primary node with live specs
  const primaryNode = store.nodes.get('host-xorvila-core');
  if (primaryNode) {
    primaryNode.serversCount = store.servers.size;
    primaryNode.totalRam = totalRamMb;
    primaryNode.usedRam = usedRamMb;
  }

  const nodes = Array.from(store.nodes.values());
  return res.json({ success: true, data: nodes });
});

adminRouter.post('/nodes', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const { name, hostname, ip, location, totalCpu, totalRam, totalDisk } = req.body;

  if (!name || !hostname || !ip) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name, hostname and IP required' } });
  }

  const newNode: ServerNode = {
    id: 'node-' + Math.random().toString(36).substring(2, 8),
    name,
    hostname,
    ip,
    location: location || 'Custom Datacenter',
    dockerVersion: 'Linux Container Engine (cgroups v2)',
    status: 'online',
    totalCpu: Number(totalCpu) || 400,
    usedCpu: 5,
    totalRam: Number(totalRam) || 16384,
    usedRam: 512,
    totalDisk: Number(totalDisk) || 250,
    usedDisk: 10,
    serversCount: 0
  };

  store.nodes.set(newNode.id, newNode);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'NODE_CREATE',
    resourceType: 'node',
    resourceId: newNode.id,
    details: `Added new daemon node ${newNode.name} (${newNode.ip})`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.status(201).json({ success: true, data: newNode });
});

// 4. Audit Logs
adminRouter.get('/audit-logs', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: store.auditLogs
  });
});

// 5. Smart Python Database Endpoints
adminRouter.get('/database/stats', (req: Request, res: Response) => {
  const stats = db.getStats();
  return res.json({
    success: true,
    data: stats
  });
});

adminRouter.get('/database/integrity', (req: Request, res: Response) => {
  const report = db.analyzeIntegrity();
  return res.json({
    success: true,
    data: report
  });
});

adminRouter.post('/database/heal', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const healResult = db.heal();

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'DATABASE_AUTO_HEAL',
    resourceType: 'database',
    resourceId: 'database.db',
    details: `Executed Core Database Healing: Health Score ${healResult.health_score}%, ${healResult.healed_actions.length} actions executed`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: healResult
  });
});

adminRouter.post('/database/query', requireRole(['admin']), (req: Request, res: Response) => {
  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ success: false, error: { code: 'SQL_REQUIRED', message: 'SQL query string required' } });
  }

  const result = db.query(sql);
  const trimmed = sql.trim().toLowerCase();
  if (!trimmed.startsWith('select') && !trimmed.startsWith('pragma') && !trimmed.startsWith('explain')) {
    // Write/Delete/Update query was executed: rehydrate in-memory store so it reflects SQLite instantly
    try {
      hydrateStoreFromDb();
    } catch (e) {
      console.warn('Hydration warning after query:', e);
    }
  }

  return res.json({
    success: result.status === 'ok',
    data: result
  });
});

adminRouter.post('/database/delete-row', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const { table, column, value } = req.body;
  if (!table || !column || value === undefined) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Table, column, and value required' } });
  }

  const result = db.deleteTableRecord(table, column, value);
  try {
    hydrateStoreFromDb();
  } catch (e) {
    console.warn('Hydration warning after row delete:', e);
  }

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'DB_ROW_DELETE',
    resourceType: 'database',
    resourceId: `${table}:${column}=${value}`,
    details: `Admin deleted record from table ${table} where ${column}=${value}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: result.status === 'ok',
    data: result
  });
});

// Admin SQLite Native Database Backup Action
adminRouter.post('/database/backup', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const backupRes = db.backupDatabase();

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'DATABASE_BACKUP',
    resourceType: 'database',
    resourceId: backupRes.filename || 'database.db',
    details: `Created native SQLite database backup ${backupRes.filename} (${backupRes.size_kb})`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: backupRes.status === 'ok',
    data: backupRes
  });
});

adminRouter.get('/database/backups', requireRole(['admin']), (req: Request, res: Response) => {
  const backups = db.listBackups();
  return res.json({
    success: true,
    data: backups
  });
});

adminRouter.post('/database/sync-all', (req: Request, res: Response) => {
  for (const serverId of store.servers.keys()) {
    syncFilesToDisk(serverId);
    syncDiskToStore(serverId);
  }
  return res.json({
    success: true,
    data: { message: 'All server files and database state synchronized with disk' }
  });
});

// 6. System Notification & Broadcast Management
adminRouter.get('/notifications', (req: Request, res: Response) => {
  const list = db.listNotifications();
  return res.json({
    success: true,
    data: list
  });
});

adminRouter.post('/notifications', requireRole(['admin', 'moderator']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const { title, message, type, priority, targetRole, expiresAt, isActive } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: { code: 'TITLE_REQUIRED', message: 'Notification title is required' } });
  }

  const result = db.createNotification({
    title: title.trim(),
    message: message ? message.trim() : '',
    type: type || 'info',
    priority: priority || 'normal',
    targetRole: targetRole || 'all',
    createdBy: admin.username || admin.email || 'Administrator',
    expiresAt: expiresAt || undefined,
    isActive: isActive !== false
  });

  if (result.notification) {
    store.notifications.set(result.notification.id, result.notification);
    db.addAudit('NOTIFICATION_CREATE', {
      userId: admin.id,
      userEmail: admin.email,
      resourceType: 'notification',
      resourceId: result.notification.id,
      details: `Created system announcement: "${result.notification.title}" [${result.notification.type}]`,
      ip: req.ip || '127.0.0.1'
    });
  }

  return res.status(201).json({
    success: result.status === 'ok',
    data: result.notification
  });
});

adminRouter.delete('/notifications/clear-all', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const list = db.listNotifications();
  for (const notif of list) {
    db.deleteNotification(notif.id);
    store.notifications.delete(notif.id);
  }

  db.addAudit('NOTIFICATION_CLEAR_ALL', {
    userId: admin.id,
    userEmail: admin.email,
    resourceType: 'notification',
    resourceId: 'all',
    details: 'Cleared all system notifications',
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: true,
    data: { message: 'All notifications successfully cleared.' }
  });
});

adminRouter.delete('/notifications/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const notifId = req.params.id;

  const result = db.deleteNotification(notifId);
  store.notifications.delete(notifId);

  db.addAudit('NOTIFICATION_DELETE', {
    userId: admin.id,
    userEmail: admin.email,
    resourceType: 'notification',
    resourceId: notifId,
    details: `Deleted system notification ${notifId}`,
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: result.status === 'ok',
    data: { id: notifId }
  });
});

adminRouter.post('/notifications/:id/toggle', requireRole(['admin', 'moderator']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const notifId = req.params.id;

  const result = db.toggleNotification(notifId);
  const existing = store.notifications.get(notifId);
  if (existing && typeof result.isActive === 'boolean') {
    existing.isActive = result.isActive;
  }

  db.addAudit('NOTIFICATION_TOGGLE', {
    userId: admin.id,
    userEmail: admin.email,
    resourceType: 'notification',
    resourceId: notifId,
    details: `Toggled notification ${notifId} to ${result.isActive ? 'active' : 'inactive'}`,
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: result.status === 'ok',
    data: result
  });
});

// 7. Server Management (Edit Resources, Suspend & Unsuspend)
adminRouter.put('/servers/:id', requireRole(['admin', 'moderator']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const server = store.servers.get(req.params.id);

  if (!server) {
    return res.status(404).json({ success: false, error: { code: 'SERVER_NOT_FOUND', message: 'Server not found' } });
  }

  const { name, description, cpuLimit, ramLimit, storageLimit, startupCommand, ownerId, runtime, version } = req.body;

  if (name !== undefined && name.trim()) server.name = name.trim();
  if (description !== undefined) server.description = description.trim();
  if (cpuLimit !== undefined && !isNaN(Number(cpuLimit))) server.cpuLimit = Number(cpuLimit);
  if (ramLimit !== undefined && !isNaN(Number(ramLimit))) server.ramLimit = Number(ramLimit);
  if (storageLimit !== undefined && !isNaN(Number(storageLimit))) server.storageLimit = Number(storageLimit);
  if (startupCommand !== undefined) server.startupCommand = startupCommand;
  if (runtime !== undefined) server.runtime = runtime;
  if (version !== undefined) server.version = version;

  if (ownerId && store.users.has(ownerId)) {
    const newOwner = store.users.get(ownerId)!;
    server.ownerId = newOwner.id;
    server.ownerEmail = newOwner.email;
  }

  server.updatedAt = new Date().toISOString();
  db.saveServer(server);

  db.addAudit('SERVER_RESOURCE_EDIT', {
    userId: admin.id,
    userEmail: admin.email,
    resourceType: 'server',
    resourceId: server.id,
    details: `Updated resources for "${server.name}": CPU ${server.cpuLimit}%, RAM ${server.ramLimit}MB, Disk ${server.storageLimit}MB`,
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: true,
    data: server
  });
});

adminRouter.post('/servers/:id/suspend', requireRole(['admin', 'moderator']), async (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const server = store.servers.get(req.params.id);

  if (!server) {
    return res.status(404).json({ success: false, error: { code: 'SERVER_NOT_FOUND', message: 'Server not found' } });
  }

  server.suspended = !server.suspended;

  if (server.suspended) {
    server.status = 'offline';
    await stopServerContainer(server.id, true);
  }

  server.updatedAt = new Date().toISOString();
  db.saveServer(server);

  db.addAudit(server.suspended ? 'SERVER_SUSPEND' : 'SERVER_UNSUSPEND', {
    userId: admin.id,
    userEmail: admin.email,
    resourceType: 'server',
    resourceId: server.id,
    details: `${server.suspended ? 'Suspended' : 'Unsuspended'} server "${server.name}"`,
    ip: req.ip || '127.0.0.1'
  });

  return res.json({
    success: true,
    data: server
  });
});

// ==========================================
// 8. Platform Settings, Starter Plan, Store & Rewards Management
// ==========================================

// Get all platform settings
adminRouter.get('/settings', requireRole(['admin']), (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: store.platformSettings
  });
});

// Update Starter / Free Plan configuration
adminRouter.put('/settings/starter-plan', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const { defaultRamMb, defaultDiskMb, defaultCpuPct, defaultMaxServers, defaultCoins } = req.body;

  const currentPlan = store.platformSettings.starterPlan;
  store.platformSettings.starterPlan = {
    defaultRamMb: Number(defaultRamMb) || currentPlan.defaultRamMb,
    defaultDiskMb: Number(defaultDiskMb) || currentPlan.defaultDiskMb,
    defaultCpuPct: Number(defaultCpuPct) || currentPlan.defaultCpuPct,
    defaultMaxServers: Number(defaultMaxServers) || currentPlan.defaultMaxServers,
    defaultCoins: Number(defaultCoins) || currentPlan.defaultCoins
  };

  savePlatformSettings(store.platformSettings);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'STARTER_PLAN_UPDATE',
    resourceType: 'system_settings',
    resourceId: 'starter_plan',
    details: `Updated Starter Plan: RAM ${store.platformSettings.starterPlan.defaultRamMb}MB, CPU ${store.platformSettings.starterPlan.defaultCpuPct}%, Disk ${store.platformSettings.starterPlan.defaultDiskMb}MB, Slots ${store.platformSettings.starterPlan.defaultMaxServers}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: store.platformSettings.starterPlan,
    message: 'Starter Free Plan settings updated successfully!'
  });
});

// Toggle platform features (Store ON/OFF, Rewards ON/OFF, Bonus ON/OFF, Referrals ON/OFF)
adminRouter.put('/settings/toggles', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const { storeEnabled, rewardsEnabled, bonusEnabled, referralsEnabled, referralRewardCoins } = req.body;

  if (storeEnabled !== undefined) store.platformSettings.storeEnabled = Boolean(storeEnabled);
  if (rewardsEnabled !== undefined) store.platformSettings.rewardsEnabled = Boolean(rewardsEnabled);
  if (bonusEnabled !== undefined) store.platformSettings.bonusEnabled = Boolean(bonusEnabled);
  if (referralsEnabled !== undefined) store.platformSettings.referralsEnabled = Boolean(referralsEnabled);
  if (referralRewardCoins !== undefined) store.platformSettings.referralRewardCoins = Math.max(0, Number(referralRewardCoins));

  savePlatformSettings(store.platformSettings);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'PLATFORM_TOGGLES_UPDATE',
    resourceType: 'system_settings',
    resourceId: 'toggles',
    details: `Updated platform toggles: Store=${store.platformSettings.storeEnabled}, Rewards=${store.platformSettings.rewardsEnabled}, Bonus=${store.platformSettings.bonusEnabled}, Referrals=${store.platformSettings.referralsEnabled} (${store.platformSettings.referralRewardCoins} coins)`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: {
      storeEnabled: store.platformSettings.storeEnabled,
      rewardsEnabled: store.platformSettings.rewardsEnabled,
      bonusEnabled: store.platformSettings.bonusEnabled,
      referralsEnabled: store.platformSettings.referralsEnabled,
      referralRewardCoins: store.platformSettings.referralRewardCoins
    },
    message: 'Feature toggles and referral settings updated successfully!'
  });
});

// Store Item CRUD
adminRouter.post('/settings/store-items', requireRole(['admin']), (req: Request, res: Response) => {
  const { name, description, category, amount, unit, priceCoins, enabled, badge } = req.body;
  if (!name || !priceCoins || !category) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing required item fields' } });
  }

  const newItem: StoreItem = {
    id: 'item_' + category + '_' + Date.now().toString(36),
    name: String(name).trim(),
    description: String(description || '').trim(),
    category: category as any,
    amount: Number(amount) || 1,
    unit: String(unit || 'Unit'),
    priceCoins: Number(priceCoins),
    enabled: enabled !== false,
    badge: badge ? String(badge).trim() : undefined
  };

  store.platformSettings.storeItems.push(newItem);
  savePlatformSettings(store.platformSettings);

  return res.json({ success: true, data: newItem, message: 'Store item created successfully!' });
});

adminRouter.put('/settings/store-items/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const itemIndex = store.platformSettings.storeItems.findIndex(i => i.id === req.params.id);
  if (itemIndex === -1) {
    return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Store item not found' } });
  }

  const existing = store.platformSettings.storeItems[itemIndex];
  const { name, description, category, amount, unit, priceCoins, enabled, badge } = req.body;

  const updated: StoreItem = {
    ...existing,
    name: name !== undefined ? String(name).trim() : existing.name,
    description: description !== undefined ? String(description).trim() : existing.description,
    category: category !== undefined ? category : existing.category,
    amount: amount !== undefined ? Number(amount) : existing.amount,
    unit: unit !== undefined ? String(unit) : existing.unit,
    priceCoins: priceCoins !== undefined ? Number(priceCoins) : existing.priceCoins,
    enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled,
    badge: badge !== undefined ? String(badge).trim() : existing.badge
  };

  store.platformSettings.storeItems[itemIndex] = updated;
  savePlatformSettings(store.platformSettings);

  return res.json({ success: true, data: updated, message: 'Store item updated successfully!' });
});

adminRouter.delete('/settings/store-items/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const initialLength = store.platformSettings.storeItems.length;
  store.platformSettings.storeItems = store.platformSettings.storeItems.filter(i => i.id !== req.params.id);
  if (store.platformSettings.storeItems.length === initialLength) {
    return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Store item not found' } });
  }
  savePlatformSettings(store.platformSettings);
  return res.json({ success: true, message: 'Store item removed successfully!' });
});

// Reward Task CRUD
adminRouter.post('/settings/reward-tasks', requireRole(['admin']), (req: Request, res: Response) => {
  const { title, description, category, rewardCoins, url, instructions, enabled, timerSeconds, dailyReset } = req.body;
  if (!title || !rewardCoins) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Missing required task fields' } });
  }

  const newTask: RewardTask = {
    id: 'task_' + Date.now().toString(36),
    title: String(title).trim(),
    description: String(description || '').trim(),
    category: (category || 'shortener') as any,
    rewardCoins: Number(rewardCoins),
    url: String(url || '').trim(),
    instructions: String(instructions || 'Complete the task to earn coins.').trim(),
    enabled: enabled !== false,
    timerSeconds: timerSeconds !== undefined ? Number(timerSeconds) : 10,
    dailyReset: Boolean(dailyReset)
  };

  store.platformSettings.rewardTasks.push(newTask);
  savePlatformSettings(store.platformSettings);

  return res.json({ success: true, data: newTask, message: 'Reward offer created successfully!' });
});

adminRouter.put('/settings/reward-tasks/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const taskIndex = store.platformSettings.rewardTasks.findIndex(t => t.id === req.params.id);
  if (taskIndex === -1) {
    return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Reward task not found' } });
  }

  const existing = store.platformSettings.rewardTasks[taskIndex];
  const { title, description, category, rewardCoins, url, instructions, enabled, timerSeconds, dailyReset } = req.body;

  const updated: RewardTask = {
    ...existing,
    title: title !== undefined ? String(title).trim() : existing.title,
    description: description !== undefined ? String(description).trim() : existing.description,
    category: category !== undefined ? category : existing.category,
    rewardCoins: rewardCoins !== undefined ? Number(rewardCoins) : existing.rewardCoins,
    url: url !== undefined ? String(url).trim() : existing.url,
    instructions: instructions !== undefined ? String(instructions).trim() : existing.instructions,
    enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled,
    timerSeconds: timerSeconds !== undefined ? Number(timerSeconds) : existing.timerSeconds,
    dailyReset: dailyReset !== undefined ? Boolean(dailyReset) : existing.dailyReset
  };

  store.platformSettings.rewardTasks[taskIndex] = updated;
  savePlatformSettings(store.platformSettings);

  return res.json({ success: true, data: updated, message: 'Reward offer updated successfully!' });
});

adminRouter.delete('/settings/reward-tasks/:id', requireRole(['admin']), (req: Request, res: Response) => {
  const initialLength = store.platformSettings.rewardTasks.length;
  store.platformSettings.rewardTasks = store.platformSettings.rewardTasks.filter(t => t.id !== req.params.id);
  if (store.platformSettings.rewardTasks.length === initialLength) {
    return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Reward task not found' } });
  }
  savePlatformSettings(store.platformSettings);
  return res.json({ success: true, message: 'Reward offer deleted successfully!' });
});

// J4R Tasks CRUD
adminRouter.post('/settings/j4r-tasks', requireRole(['admin']), (req: Request, res: Response) => {
  const { serverName, description, inviteUrl, rewardCoins, iconUrl, memberCount, category, enabled, requirements } = req.body;
  if (!serverName || !inviteUrl || !rewardCoins) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Server name, invite URL, and reward coins are required.' } });
  }

  const newJ4r = {
    id: 'j4r_' + Date.now().toString(36),
    serverName: String(serverName).trim(),
    description: String(description || '').trim(),
    inviteUrl: String(inviteUrl).trim(),
    rewardCoins: Number(rewardCoins),
    iconUrl: String(iconUrl || ''),
    memberCount: String(memberCount || '1,000+ Members'),
    category: String(category || 'Partner Server'),
    enabled: enabled !== false,
    requirements: String(requirements || 'Join server & verify membership.')
  };

  if (!store.platformSettings.j4rTasks) store.platformSettings.j4rTasks = [];
  store.platformSettings.j4rTasks.push(newJ4r);
  savePlatformSettings(store.platformSettings);

  return res.status(201).json({ success: true, data: newJ4r });
});

adminRouter.put('/settings/j4r-tasks/:id', requireRole(['admin']), (req: Request, res: Response) => {
  if (!store.platformSettings.j4rTasks) store.platformSettings.j4rTasks = [];
  const idx = store.platformSettings.j4rTasks.findIndex(j => j.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'J4R partner not found' } });
  }

  store.platformSettings.j4rTasks[idx] = {
    ...store.platformSettings.j4rTasks[idx],
    ...req.body,
    id: req.params.id
  };

  savePlatformSettings(store.platformSettings);
  return res.json({ success: true, data: store.platformSettings.j4rTasks[idx] });
});

adminRouter.delete('/settings/j4r-tasks/:id', requireRole(['admin']), (req: Request, res: Response) => {
  if (!store.platformSettings.j4rTasks) store.platformSettings.j4rTasks = [];
  store.platformSettings.j4rTasks = store.platformSettings.j4rTasks.filter(j => j.id !== req.params.id);
  savePlatformSettings(store.platformSettings);
  return res.json({ success: true, message: 'J4R partner removed' });
});

// Admin adjust coins for a specific user
adminRouter.post('/users/:id/adjust-coins', requireRole(['admin']), (req: Request, res: Response) => {
  const admin = (req as any).user as User;
  const targetUser = store.users.get(req.params.id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  const { deltaCoins, setAbsoluteCoins, extraSlots, extraRamMb, extraDiskMb, extraCpuPct } = req.body;

  if (setAbsoluteCoins !== undefined) {
    targetUser.coins = Math.max(0, Number(setAbsoluteCoins));
  } else if (deltaCoins !== undefined) {
    targetUser.coins = Math.max(0, (targetUser.coins || store.platformSettings.starterPlan.defaultCoins) + Number(deltaCoins));
  }

  if (extraSlots !== undefined) targetUser.extraSlots = Math.max(0, Number(extraSlots));
  if (extraRamMb !== undefined) targetUser.extraRamMb = Math.max(0, Number(extraRamMb));
  if (extraDiskMb !== undefined) targetUser.extraDiskMb = Math.max(0, Number(extraDiskMb));
  if (extraCpuPct !== undefined) targetUser.extraCpuPct = Math.max(0, Number(extraCpuPct));

  db.saveUser(targetUser);

  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: admin.id,
    userEmail: admin.email,
    action: 'USER_BALANCE_ADJUST',
    resourceType: 'user',
    resourceId: targetUser.id,
    details: `Adjusted resources/coins for ${targetUser.email}: Coins=${targetUser.coins}, ExtraSlots=${targetUser.extraSlots || 0}`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safe } = targetUser;
  return res.json({
    success: true,
    data: safe,
    message: `Updated coins/limits for ${targetUser.email}!`
  });
});



