import { Router, Request, Response } from 'express';
import { store, savePlatformSettings } from '../store';
import { db } from '../dbBridge';
import { authenticate } from './auth';
import { User, StoreItem, RewardTask } from '../../src/types';

export const storeAndRewardsRouter = Router();

// Store Endpoints
export const storeRouter = Router();
storeRouter.use(authenticate);

// 1. Get Store catalog and user current wallet/upgrades
storeRouter.get('/catalog', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const currentDbUser = store.users.get(user.id);
  const settings = store.platformSettings;

  const userCoins = currentDbUser?.coins ?? settings.starterPlan.defaultCoins;
  const extraSlots = currentDbUser?.extraSlots ?? 0;
  const extraRamMb = currentDbUser?.extraRamMb ?? 0;
  const extraDiskMb = currentDbUser?.extraDiskMb ?? 0;
  const extraCpuPct = currentDbUser?.extraCpuPct ?? 0;

  return res.json({
    success: true,
    data: {
      enabled: settings.storeEnabled,
      items: settings.storeItems,
      userWallet: {
        coins: userCoins,
        extraSlots,
        extraRamMb,
        extraDiskMb,
        extraCpuPct,
        starterPlan: settings.starterPlan
      }
    }
  });
});

// 2. Purchase item from store
storeRouter.post('/purchase', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { itemId } = req.body;

  if (!store.platformSettings.storeEnabled) {
    return res.status(403).json({
      success: false,
      error: { code: 'STORE_DISABLED', message: 'The Resource Marketplace is currently disabled by administrators.' }
    });
  }

  const item = store.platformSettings.storeItems.find(i => i.id === itemId);
  if (!item || !item.enabled) {
    return res.status(404).json({
      success: false,
      error: { code: 'ITEM_NOT_FOUND', message: 'Store item not found or unavailable.' }
    });
  }

  const currentDbUser = store.users.get(user.id);
  if (!currentDbUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  const currentCoins = currentDbUser.coins ?? store.platformSettings.starterPlan.defaultCoins;
  if (currentCoins < item.priceCoins) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_COINS',
        message: `Insufficient coins. You need ${item.priceCoins} coins, but you only have ${currentCoins} coins. Complete tasks in Earn Rewards to get more!`
      }
    });
  }

  // Deduct coins & apply resource upgrade
  currentDbUser.coins = currentCoins - item.priceCoins;
  if (item.category === 'ram') {
    currentDbUser.extraRamMb = (currentDbUser.extraRamMb || 0) + item.amount;
  } else if (item.category === 'cpu') {
    currentDbUser.extraCpuPct = (currentDbUser.extraCpuPct || 0) + item.amount;
  } else if (item.category === 'disk') {
    currentDbUser.extraDiskMb = (currentDbUser.extraDiskMb || 0) + item.amount;
  } else if (item.category === 'slots') {
    currentDbUser.extraSlots = (currentDbUser.extraSlots || 0) + item.amount;
  }

  // Persist user update
  db.saveUser(currentDbUser);

  // Audit log
  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: user.id,
    userEmail: user.email,
    action: 'STORE_PURCHASE',
    resourceType: 'store_item',
    resourceId: item.id,
    details: `Purchased ${item.name} for ${item.priceCoins} coins`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safeUser } = currentDbUser;
  return res.json({
    success: true,
    data: {
      message: `Successfully purchased ${item.name}!`,
      user: safeUser,
      purchasedItem: item
    }
  });
});

// Rewards Endpoints
export const rewardsRouter = Router();
rewardsRouter.use(authenticate);

// 1. Get Reward tasks
rewardsRouter.get('/tasks', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const currentDbUser = store.users.get(user.id);
  const settings = store.platformSettings;

  const userCoins = currentDbUser?.coins ?? settings.starterPlan.defaultCoins;
  const completedTasks = currentDbUser?.completedTasks ?? [];

  // Filter tasks: if bonus is disabled by admin, hide daily bonus tasks!
  const visibleTasks = settings.rewardTasks.filter(t => {
    if (t.category === 'daily' && !settings.bonusEnabled) return false;
    return true;
  });

  return res.json({
    success: true,
    data: {
      enabled: settings.rewardsEnabled,
      bonusEnabled: settings.bonusEnabled,
      referralsEnabled: settings.referralsEnabled,
      referralRewardCoins: settings.referralRewardCoins,
      tasks: visibleTasks,
      j4rTasks: settings.j4rTasks || [],
      userWallet: {
        coins: userCoins,
        completedTasks,
        referralCode: currentDbUser?.referralCode || `XOR-${currentDbUser?.username?.toUpperCase() || 'USER'}`,
        referralsCount: currentDbUser?.referralsCount || 0,
        referralCoinsEarned: currentDbUser?.referralCoinsEarned || 0
      }
    }
  });
});

// 2. Claim reward for completing a task
rewardsRouter.post('/claim', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { taskId } = req.body;

  if (!store.platformSettings.rewardsEnabled) {
    return res.status(403).json({
      success: false,
      error: { code: 'REWARDS_DISABLED', message: 'Earn Rewards is currently disabled by platform administrators.' }
    });
  }

  const task = store.platformSettings.rewardTasks.find(t => t.id === taskId);
  if (!task || !task.enabled) {
    return res.status(404).json({
      success: false,
      error: { code: 'TASK_NOT_FOUND', message: 'Reward offer not found or no longer active.' }
    });
  }

  // If daily bonus is disabled, prevent claim
  if (task.category === 'daily' && !store.platformSettings.bonusEnabled) {
    return res.status(403).json({
      success: false,
      error: { code: 'BONUS_DISABLED', message: 'Daily bonus claims are currently turned off in admin settings.' }
    });
  }

  const currentDbUser = store.users.get(user.id);
  if (!currentDbUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  const completedList = currentDbUser.completedTasks || [];
  
  // Non-daily tasks can only be claimed once
  if (!task.dailyReset && completedList.includes(task.id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'ALREADY_CLAIMED', message: 'You have already completed and claimed this reward task.' }
    });
  }

  // Credit coins
  const currentCoins = currentDbUser.coins ?? store.platformSettings.starterPlan.defaultCoins;
  currentDbUser.coins = currentCoins + task.rewardCoins;
  
  if (!completedList.includes(task.id)) {
    currentDbUser.completedTasks = [...completedList, task.id];
  }

  // Save to DB
  db.saveUser(currentDbUser);

  // Audit log
  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: user.id,
    userEmail: user.email,
    action: 'REWARD_CLAIM',
    resourceType: 'reward_task',
    resourceId: task.id,
    details: `Claimed +${task.rewardCoins} coins for completing "${task.title}"`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safeUser } = currentDbUser;
  return res.json({
    success: true,
    data: {
      message: `Awesome! You earned +${task.rewardCoins} coins!`,
      coinsAdded: task.rewardCoins,
      newBalance: currentDbUser.coins,
      user: safeUser
    }
  });
});

// 3. Dedicated Join 4 Reward (J4R) Claim Endpoint
rewardsRouter.post('/j4r/claim', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { j4rId, discordHandle } = req.body;

  if (!store.platformSettings.rewardsEnabled) {
    return res.status(403).json({
      success: false,
      error: { code: 'REWARDS_DISABLED', message: 'Rewards are currently disabled by platform administrators.' }
    });
  }

  const j4r = store.platformSettings.j4rTasks?.find(j => j.id === j4rId);
  if (!j4r || !j4r.enabled) {
    return res.status(404).json({
      success: false,
      error: { code: 'J4R_NOT_FOUND', message: 'Discord Join partner not found or expired.' }
    });
  }

  const currentDbUser = store.users.get(user.id);
  if (!currentDbUser) {
    return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }

  const completedList = currentDbUser.completedTasks || [];
  if (completedList.includes(j4r.id)) {
    return res.status(400).json({
      success: false,
      error: { code: 'ALREADY_JOINED', message: 'You have already joined and claimed rewards for this Discord server.' }
    });
  }

  // Credit J4R coins
  const currentCoins = currentDbUser.coins ?? store.platformSettings.starterPlan.defaultCoins;
  currentDbUser.coins = currentCoins + j4r.rewardCoins;
  currentDbUser.completedTasks = [...completedList, j4r.id];

  // Save to SQLite
  db.saveUser(currentDbUser);

  // Audit
  store.auditLogs.unshift({
    id: 'aud_' + Math.random().toString(36).substring(2, 9),
    userId: user.id,
    userEmail: user.email,
    action: 'J4R_CLAIM',
    resourceType: 'j4r_server',
    resourceId: j4r.id,
    details: `Claimed +${j4r.rewardCoins} coins for joining Discord server "${j4r.serverName}" (${discordHandle || 'Linked Account'})`,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString()
  });

  const { passwordHash: _, ...safeUser } = currentDbUser;
  return res.json({
    success: true,
    data: {
      message: `Verified! +${j4r.rewardCoins} coins added for joining ${j4r.serverName}!`,
      coinsAdded: j4r.rewardCoins,
      newBalance: currentDbUser.coins,
      user: safeUser
    }
  });
});

// 4. Referral System Stats & Info
rewardsRouter.get('/referrals', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const currentDbUser = store.users.get(user.id);
  const settings = store.platformSettings;

  const referralCode = currentDbUser?.referralCode || `XOR-${currentDbUser?.username?.toUpperCase() || 'USER'}`;
  if (currentDbUser && !currentDbUser.referralCode) {
    currentDbUser.referralCode = referralCode;
    db.saveUser(currentDbUser);
  }

  return res.json({
    success: true,
    data: {
      enabled: settings.referralsEnabled,
      rewardPerReferral: settings.referralRewardCoins,
      referralCode,
      referralsCount: currentDbUser?.referralsCount || 0,
      referralCoinsEarned: currentDbUser?.referralCoinsEarned || 0,
      referredBy: currentDbUser?.referredBy || null
    }
  });
});
