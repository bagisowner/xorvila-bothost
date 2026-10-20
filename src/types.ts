export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  username?: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  isActive?: boolean;
  suspended: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  coins?: number;
  extraSlots?: number;
  extraRamMb?: number;
  extraDiskMb?: number;
  extraCpuPct?: number;
  completedTasks?: string[];
  referralCode?: string;
  referredBy?: string;
  referralsCount?: number;
  referralCoinsEarned?: number;
}

export interface StarterPlanConfig {
  defaultRamMb: number;
  defaultDiskMb: number;
  defaultCpuPct: number;
  defaultMaxServers: number;
  defaultCoins: number;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: 'ram' | 'cpu' | 'disk' | 'slots';
  amount: number;
  unit: string;
  priceCoins: number;
  enabled: boolean;
  badge?: string;
}

export interface RewardTask {
  id: string;
  title: string;
  description: string;
  category: 'shortener' | 'linkpays' | 'linkvertise' | 'community' | 'daily';
  rewardCoins: number;
  url: string;
  enabled: boolean;
  instructions: string;
  timerSeconds?: number;
  dailyReset?: boolean;
}

export interface J4RTask {
  id: string;
  serverName: string;
  description: string;
  inviteUrl: string;
  rewardCoins: number;
  iconUrl?: string;
  memberCount?: string;
  category?: string;
  enabled: boolean;
  requirements?: string;
}

export interface PlatformSettings {
  storeEnabled: boolean;
  rewardsEnabled: boolean;
  bonusEnabled: boolean;
  referralsEnabled: boolean;
  referralRewardCoins: number;
  starterPlan: StarterPlanConfig;
  storeItems: StoreItem[];
  rewardTasks: RewardTask[];
  j4rTasks: J4RTask[];
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  token: string;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export type ServerStatus =
  | 'online'
  | 'offline'
  | 'starting'
  | 'stopping'
  | 'restarting'
  | 'installing'
  | 'crashed';

export type RuntimeLanguage = 'python' | 'node';

export type PythonVersion = '3.9' | '3.10' | '3.11' | '3.12' | '3.13';
export type NodeVersion = '18' | '20' | '22' | '24';
export type RuntimeVersion = PythonVersion | NodeVersion;

export type RestartPolicy = 'always' | 'on-failure' | 'unless-stopped' | 'never';

export interface ServerStats {
  cpuUsage: number; // percentage (0-100%)
  ramUsage: number; // MB
  ramLimit: number; // MB
  storageUsage: number; // MB
  storageLimit: number; // MB
  netRx: number; // KB/s
  netTx: number; // KB/s
  pids: number;
  uptimeSeconds: number;
}

export interface SftpCredentials {
  host: string;
  port: number;
  username: string;
  password?: string;
}

export interface GitDeploymentConfig {
  url: string;
  branch: string;
  autoDeployOnPush?: boolean;
  lastCommit?: string;
  lastDeployedAt?: string;
}

export interface BotServer {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  runtime: RuntimeLanguage;
  version: RuntimeVersion;
  status: ServerStatus;
  nodeId: string;
  nodeName: string;
  nodeIp: string;
  port: number;
  cpuLimit: number; // percentage, e.g. 100 = 1 core
  ramLimit: number; // MB
  storageLimit: number; // MB
  startupCommand: string;
  workingDir: string;
  restartPolicy: RestartPolicy;
  autoStart: boolean;
  suspended: boolean;
  env: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  uptimeSeconds: number;
  stats: ServerStats;
  sftp: SftpCredentials;
  git?: GitDeploymentConfig;
}

export interface ServerFile {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  updatedAt: string;
  permissions: string;
  extension?: string;
}

export interface ServerBackup {
  id: string;
  serverId: string;
  name: string;
  size: number;
  checksum: string;
  createdAt: string;
  status: 'completed' | 'creating' | 'restoring' | 'failed';
}

export interface ServerNode {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  location: string;
  dockerVersion: string;
  status: 'online' | 'offline' | 'maintenance';
  totalCpu: number; // cores * 100
  usedCpu: number;
  totalRam: number; // MB
  usedRam: number; // MB
  totalDisk: number; // GB
  usedDisk: number; // GB
  serversCount: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface ConsoleLogLine {
  id: string;
  timestamp: string;
  type: 'stdout' | 'stderr' | 'system' | 'info' | 'warn' | 'error';
  text: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetRole: 'all' | 'user' | 'moderator' | 'admin';
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot';
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: number;
  isCurrent?: boolean;
}

export interface DataIntegrityReport {
  status: 'healthy' | 'degraded' | 'corrupted';
  healthScore: number;
  timestamp: string;
  databasePath: string;
  canary: {
    passed: boolean;
    latencyMs: number;
  };
  checks: Array<{
    name: string;
    status: 'passed' | 'warning' | 'failed' | 'error';
    detail: string;
  }>;
  tables: Record<string, {
    count: number;
    status: 'online' | 'missing' | 'warning';
  }>;
  totalRecords: number;
  storage: {
    dbSizeBytes: number;
    dbSizeKb: string;
    walSizeBytes: number;
    walSizeKb: string;
    pageSize: number;
    pageCount: number;
    freePages: number;
    fragmentationPct: number;
    journalMode: string;
    backupsCount: number;
  };
}

export interface ClusterOverview {
  totalServers: number;
  onlineServers: number;
  offlineServers: number;
  crashedServers: number;
  totalUsers: number;
  totalNodes: number;
  onlineNodes: number;
  clusterCpuUsagePercent: number;
  clusterRamUsageMb: number;
  clusterRamTotalMb: number;
  clusterDiskUsageGb: number;
  clusterDiskTotalGb: number;
  recentAuditLogs: AuditLog[];
}
