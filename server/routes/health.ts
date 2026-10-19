import { Router, Request, Response } from 'express';
import { autoHealer } from '../autoHealer';
import { db } from '../dbBridge';
import { store } from '../store';

export const healthRouter = Router();

/**
 * GET /api/health/status
 * Returns real-time health score, self-healing status, and recent auto-repaired events
 */
healthRouter.get('/status', (req: Request, res: Response) => {
  const status = autoHealer.getStatus();
  return res.json({
    success: true,
    data: status
  });
});

/**
 * POST /api/health/heal-now
 * Runs an immediate deep health scan and auto-repairs all detected anomalies
 */
healthRouter.post('/heal-now', (req: Request, res: Response) => {
  const result = autoHealer.runHealthScanSilently();
  return res.json({
    success: true,
    message: 'Deep system health check and auto-healing routine executed successfully',
    data: {
      ...result,
      statusReport: autoHealer.getStatus()
    }
  });
});

/**
 * GET /api/health/database-check
 * Direct verification of SQLite relational core
 */
healthRouter.get('/database-check', (req: Request, res: Response) => {
  try {
    const healResult = db.heal();
    const stats = db.getStats();
    return res.json({
      success: true,
      data: {
        heal: healResult,
        stats
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Database check failed: ' + err.message
    });
  }
});
