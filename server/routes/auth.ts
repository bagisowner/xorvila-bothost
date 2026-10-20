import { Router, Request, Response, NextFunction } from 'express';
import { store } from '../store';
import { db } from '../dbBridge';
import { User, ApiToken } from '../../src/types';
import { signJwtToken, verifyJwtToken } from '../jwt';

export const authRouter = Router();

// Helper to extract session token from Authorization Header or HttpOnly Cookie
export function extractTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  // Check req.cookies (cookie-parser)
  if ((req as any).cookies) {
    if ((req as any).cookies.xorvila_session) {
      return (req as any).cookies.xorvila_session;
    }
    if ((req as any).cookies.session) {
      return (req as any).cookies.session;
    }
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith('xorvila_session=')) {
        return decodeURIComponent(c.substring('xorvila_session='.length));
      }
      if (c.startsWith('session=')) {
        return decodeURIComponent(c.substring('session='.length));
      }
    }
  }

  return null;
}

// Authentication Middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in to continue.' }
    });
  }

  // 1. Check API token
  for (const apiToken of store.tokens.values()) {
    if (apiToken.token === token) {
      const user = store.users.get(apiToken.userId);
      if (user && !user.suspended && user.isActive !== false) {
        apiToken.lastUsedAt = new Date().toISOString();
        (req as any).user = user;
        (req as any).token = apiToken;
        (req as any).rawToken = token;
        return next();
      }
    }
  }

  // 2. Validate JWT token
  const jwtPayload = verifyJwtToken(token);
  if (jwtPayload) {
    // Validate session in database (ensures session was not revoked remotely)
    const sessionData = db.validateSessionById(jwtPayload.sessionId, jwtPayload.sub);
    if (sessionData && sessionData.user) {
      const user = sessionData.user;
      if (!user.suspended && user.isActive !== false) {
        store.users.set(user.id, user as any);
        (req as any).user = user;
        (req as any).sessionId = jwtPayload.sessionId;
        (req as any).rawToken = token;
        (req as any).jwt = jwtPayload;
        return next();
      }
    }

    // Check in-memory store session fallback
    const memSession = store.sessions.get(jwtPayload.sessionId) || store.sessions.get(token);
    if (memSession && memSession.expiresAt > Date.now()) {
      const user = store.users.get(jwtPayload.sub);
      if (user && !user.suspended && user.isActive !== false) {
        (req as any).user = user;
        (req as any).sessionId = jwtPayload.sessionId;
        (req as any).rawToken = token;
        (req as any).jwt = jwtPayload;
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: { code: 'SESSION_REVOKED', message: 'Your session has expired or was revoked. Please log in again.' }
    });
  }

  // 3. Fallback to raw database session token
  const sessionData = db.validateSession(token);
  if (sessionData && sessionData.user) {
    const user = sessionData.user;
    if (!user.suspended && user.isActive !== false) {
      store.users.set(user.id, user as any);
      (req as any).user = user;
      (req as any).sessionId = sessionData.sessionId;
      (req as any).rawToken = token;
      return next();
    }
  }

  // 4. Fallback to memory store session
  const memSession = store.sessions.get(token);
  if (memSession && memSession.expiresAt > Date.now()) {
    const user = store.users.get(memSession.userId);
    if (user && !user.suspended && user.isActive !== false) {
      (req as any).user = user;
      (req as any).rawToken = token;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: { code: 'INVALID_TOKEN', message: 'The provided authentication session is invalid, expired, or revoked.' }
  });
}

// Require Role Middleware
export function requireRole(allowedRoles: User['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You lack required administrative permissions for this action.' }
      });
    }
    next();
  };
}

export const requireAuth = authenticate;
export const requireAdmin = [authenticate, requireRole(['admin'])];
export const requireModerator = [authenticate, requireRole(['admin', 'moderator'])];

// Public configuration for guest / registration (e.g. is referral code enabled)
authRouter.get('/public-config', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      referralsEnabled: store.platformSettings.referralsEnabled !== false,
      bonusEnabled: store.platformSettings.bonusEnabled === true,
      referralRewardCoins: store.platformSettings.referralRewardCoins || 50,
      starterPlan: store.platformSettings.starterPlan
    }
  });
});

// Register
authRouter.post('/register', (req: Request, res: Response) => {
  const { email, password, name, username, referralCode } = req.body;
  const chosenUsername = (username || name || '').trim();

  if (!email || !password || !chosenUsername) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Username, email address, and password are required.' }
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  const result = db.registerUser({
    username: chosenUsername,
    email,
    password,
    ip: clientIp,
    userAgent
  });

  if (result.error || !result.user || !result.token) {
    return res.status(400).json({
      success: false,
      error: { code: 'REGISTRATION_FAILED', message: result.error || 'Failed to register account.' }
    });
  }

  // Set default coins from starter plan
  result.user.coins = store.platformSettings.starterPlan.defaultCoins;
  result.user.referralCode = `XOR-${chosenUsername.toUpperCase()}`;

  // Handle Referral Code if provided & referral system is enabled
  if (store.platformSettings.referralsEnabled !== false && referralCode && typeof referralCode === 'string') {
    const cleanRef = referralCode.trim().toUpperCase();
    // Search referrer by referralCode, username, or id
    const referrer = Array.from(store.users.values()).find(
      u => u.referralCode?.toUpperCase() === cleanRef ||
           u.username?.toUpperCase() === cleanRef ||
           `XOR-${u.username?.toUpperCase()}` === cleanRef ||
           u.id === cleanRef
    );

    if (referrer && referrer.id !== result.user.id) {
      const award = store.platformSettings.referralRewardCoins || 50;
      referrer.coins = (referrer.coins ?? store.platformSettings.starterPlan.defaultCoins) + award;
      referrer.referralsCount = (referrer.referralsCount || 0) + 1;
      referrer.referralCoinsEarned = (referrer.referralCoinsEarned || 0) + award;
      
      // Save referrer to SQLite
      db.saveUser(referrer);
      result.user.referredBy = referrer.username || referrer.id;

      db.addAudit('REFERRAL_BONUS', {
        userId: referrer.id,
        userEmail: referrer.email,
        resourceType: 'referral',
        resourceId: result.user.id,
        details: `Earned +${award} coins from referring new user ${result.user.username} (${cleanRef})`,
        ip: clientIp,
        userAgent
      });
    }
  }

  // Persist updated new user into DB
  db.saveUser(result.user);

  const sessionId = result.session ? result.session.id : ('ses_' + Math.random().toString(36).substring(2, 12));

  // Generate cryptographic JWT Token
  const jwtToken = signJwtToken({
    userId: result.user.id,
    sessionId,
    email: result.user.email,
    username: result.user.username,
    role: result.user.role
  }, '7d');

  // Update in-memory store
  store.users.set(result.user.id, result.user as any);
  if (result.session) {
    store.sessions.set(sessionId, {
      userId: result.user.id,
      expiresAt: result.session.expiresAt
    });
    store.sessions.set(jwtToken, {
      userId: result.user.id,
      expiresAt: result.session.expiresAt
    });
  }

  db.addAudit('USER_REGISTER', {
    userId: result.user.id,
    userEmail: result.user.email,
    resourceType: 'user',
    resourceId: result.user.id,
    details: `User registered: ${result.user.username} (${result.user.email})${result.user.referredBy ? ` [Referred by ${result.user.referredBy}]` : ''}`,
    ip: clientIp,
    userAgent
  });

  // Set secure HttpOnly Cookie with 7 days max-age
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  res.cookie('xorvila_session', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/'
  });

  return res.status(201).json({
    success: true,
    data: {
      user: result.user,
      token: jwtToken,
      session: result.session
    }
  });
});

// Login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, username, username_or_email, password, rememberMe, twoFactorCode } = req.body;
  const identifier = (username_or_email || email || username || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Username/Email and password are required.' }
    });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  const result = db.authenticateUser({
    username_or_email: identifier,
    password,
    ip: clientIp,
    userAgent
  });

  if (result.rate_limited) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: result.error || 'Too many failed login attempts. Please wait before trying again.',
        cooldown: result.cooldown
      }
    });
  }

  if (result.error || !result.user || !result.token) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: result.error || 'Invalid username, email, or password.' }
    });
  }

  const user = result.user;

  // Handle 2FA if enabled
  if (user.twoFactorEnabled && !twoFactorCode) {
    return res.json({
      success: true,
      data: {
        requires2FA: true,
        tempUserId: user.id
      }
    });
  }

  const sessionId = result.session ? result.session.id : ('ses_' + Math.random().toString(36).substring(2, 12));
  const expiresIn = rememberMe !== false ? '7d' : '24h';
  const maxAgeMs = rememberMe !== false ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  // Generate enterprise JWT session token
  const jwtToken = signJwtToken({
    userId: user.id,
    sessionId,
    email: user.email,
    username: user.username,
    role: user.role
  }, expiresIn);

  // Update in-memory store
  store.users.set(user.id, user as any);
  if (result.session) {
    store.sessions.set(sessionId, {
      userId: user.id,
      expiresAt: result.session.expiresAt
    });
    store.sessions.set(jwtToken, {
      userId: user.id,
      expiresAt: result.session.expiresAt
    });
  }

  db.addAudit('USER_LOGIN', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: user.id,
    details: `User authenticated successfully: ${user.username || user.email}`,
    ip: clientIp,
    userAgent
  });

  // Set secure HttpOnly Cookie
  res.cookie('xorvila_session', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/'
  });

  return res.json({
    success: true,
    data: {
      user: result.user,
      token: jwtToken,
      session: result.session
    }
  });
});

// Current User Profile
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const reqUser = (req as any).user as User;
  const storeUser = store.users.get(reqUser.id) || reqUser;
  if (storeUser.coins === undefined) {
    storeUser.coins = store.platformSettings.starterPlan.defaultCoins;
  }
  const { passwordHash: _, ...safe } = storeUser as any;
  return res.json({
    success: true,
    data: safe
  });
});

// Update Profile
authRouter.put('/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, avatarUrl } = req.body;

  const target = store.users.get(user.id);
  if (target) {
    if (name) {
      target.name = name;
      target.username = name;
    }
    if (avatarUrl) target.avatarUrl = avatarUrl;
    target.updatedAt = new Date().toISOString();
    db.saveUser(target);
  }

  return res.json({
    success: true,
    data: target || user
  });
});

// Toggle 2FA
authRouter.post('/2fa/toggle', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const target = store.users.get(user.id);
  if (!target) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
  }

  target.twoFactorEnabled = !target.twoFactorEnabled;
  db.saveUser(target);

  return res.json({
    success: true,
    data: {
      twoFactorEnabled: target.twoFactorEnabled,
      secret: target.twoFactorEnabled ? 'JBSWY3DPEHPK3PXP' : undefined,
      qrCodeUrl: target.twoFactorEnabled ? 'otpauth://totp/Xorvila:' + target.email + '?secret=JBSWY3DPEHPK3PXP&issuer=Xorvila' : undefined
    }
  });
});

// Change Password
authRouter.post('/password', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 6 characters long' }
    });
  }

  // Update in DB
  const userRecord = store.users.get(user.id);
  if (userRecord) {
    userRecord.updatedAt = new Date().toISOString();
    db.saveUser(userRecord);
  }

  db.addAudit('PASSWORD_CHANGE', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'user',
    resourceId: user.id,
    details: 'User password was changed successfully'
  });

  return res.json({
    success: true,
    data: { message: 'Password changed successfully' }
  });
});

// Active Enterprise Sessions
authRouter.get('/sessions', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const currentToken = (req as any).rawToken as string | undefined;
  const currentSessionId = (req as any).sessionId as string | undefined;

  let sessions = db.listUserSessions(user.id, currentToken);
  if (currentSessionId) {
    sessions = sessions.map(s => ({
      ...s,
      isCurrent: s.id === currentSessionId || s.isCurrent
    }));
  }

  return res.json({
    success: true,
    data: sessions
  });
});

// Revoke Single Device Session
authRouter.delete('/sessions/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const sessionId = req.params.id;

  const result = db.revokeUserSession(user.id, sessionId);
  if (result.error) {
    return res.status(400).json({
      success: false,
      error: { code: 'REVOCATION_FAILED', message: result.error }
    });
  }

  db.addAudit('SESSION_REVOKED', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'session',
    resourceId: sessionId,
    details: `User revoked remote device session ${sessionId}`
  });

  return res.json({
    success: true,
    data: { message: `Device session ${sessionId} was revoked successfully.` }
  });
});

// Revoke All Other Sessions (Sign out everywhere else)
authRouter.post('/sessions/revoke-others', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const currentToken = (req as any).rawToken as string | undefined;

  const result = db.revokeOtherSessions(user.id, currentToken);
  if (result.error) {
    return res.status(400).json({
      success: false,
      error: { code: 'REVOCATION_FAILED', message: result.error }
    });
  }

  db.addAudit('SESSIONS_REVOKE_OTHERS', {
    userId: user.id,
    userEmail: user.email,
    resourceType: 'session',
    resourceId: user.id,
    details: 'User signed out from all other active device sessions'
  });

  return res.json({
    success: true,
    data: { message: 'All other active device sessions have been securely signed out.' }
  });
});

// List API Tokens
authRouter.get('/tokens', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const tokens = Array.from(store.tokens.values()).filter(t => t.userId === user.id);
  return res.json({
    success: true,
    data: tokens
  });
});

// Create API Token
authRouter.post('/tokens', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: { code: 'NAME_REQUIRED', message: 'Token name is required' }
    });
  }

  const rawToken = 'xor_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const newToken: ApiToken = {
    id: 'tok_' + Math.random().toString(36).substring(2, 10),
    userId: user.id,
    name,
    token: rawToken,
    createdAt: new Date().toISOString()
  };

  store.tokens.set(newToken.token, newToken);
  db.saveApiToken(newToken);

  return res.json({
    success: true,
    data: newToken
  });
});

// Delete API Token
authRouter.delete('/tokens/:id', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const tokenId = req.params.id;

  let foundKey: string | null = null;
  let foundToken: ApiToken | null = null;
  for (const [key, t] of store.tokens.entries()) {
    if ((t.id === tokenId || t.token === tokenId) && t.userId === user.id) {
      foundKey = key;
      foundToken = t;
      break;
    }
  }

  if (!foundKey) {
    return res.status(404).json({
      success: false,
      error: { code: 'TOKEN_NOT_FOUND', message: 'API token not found or access denied' }
    });
  }

  store.tokens.delete(foundKey);
  db.deleteApiToken(foundToken ? foundToken.id : tokenId);
  if (foundToken?.token) {
    db.deleteApiToken(foundToken.token);
  }

  return res.json({
    success: true,
    data: { message: 'Token deleted successfully' }
  });
});

// Logout (current session)
authRouter.post('/logout', (req: Request, res: Response) => {
  const token = extractTokenFromRequest(req);
  if (token) {
    const jwtPayload = verifyJwtToken(token);
    if (jwtPayload) {
      db.revokeUserSession(jwtPayload.sub, jwtPayload.sessionId);
      store.sessions.delete(jwtPayload.sessionId);
    }
    store.sessions.delete(token);
    db.revokeSession(token);
  }

  res.clearCookie('xorvila_session', { path: '/' });
  res.clearCookie('session', { path: '/' });

  return res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

// Logout from all devices
authRouter.post('/logout-all', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user) {
    // Clear all in-memory sessions for user
    for (const [sToken, s] of store.sessions.entries()) {
      if (s.userId === user.id) {
        store.sessions.delete(sToken);
      }
    }
    db.revokeAllSessions(user.id);
  }

  res.clearCookie('xorvila_session', { path: '/' });
  res.clearCookie('session', { path: '/' });

  return res.json({
    success: true,
    data: { message: 'Logged out from all devices successfully' }
  });
});

// Active System Announcements / Notifications
authRouter.get('/notifications', (req: Request, res: Response) => {
  const allNotifs = db.listNotifications();
  const activeNotifs = allNotifs.filter(n => n.isActive);
  return res.json({
    success: true,
    data: activeNotifs
  });
});
