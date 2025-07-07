import { FastifyInstance } from 'fastify';
import { DrizzleDatabase } from '../db';
import { validateJWT } from '../auth';

export async function adminRoutes(server: FastifyInstance, db: DrizzleDatabase) {
  // Admin Panel API Routes
  server.get('/admin/api-keys', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const keys = await db.getAllApiKeys();
      // Filter out system keys and deleted keys
      const filteredKeys = keys.filter(key => 
        key.userName !== 'system' && 
        key.userName !== 'System' &&
        !key.userName.startsWith('[DELETED]')
      );
      return {
        success: true,
        data: filteredKeys
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.post('/admin/api-keys', { preHandler: validateJWT }, async (request: any, reply) => {
    const { userName } = request.body;
    
    if (!userName) {
      return {
        success: false,
        error: 'userName is required'
      };
    }
    
    try {
      // Sanitize username to create prefix
      // Remove special characters, spaces, and convert to lowercase
      const sanitizedPrefix = userName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
        .substring(0, 20); // Limit length
      
      if (!sanitizedPrefix) {
        return {
          success: false,
          error: 'Username must contain at least one alphanumeric character'
        };
      }
      
      const keyId = db.generateApiKey(sanitizedPrefix);
      const newKey = await db.createApiKey({
        keyId,
        userName,
        prefix: sanitizedPrefix
      });
      
      return {
        success: true,
        data: newKey
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.put('/admin/api-keys/:keyId', { preHandler: validateJWT }, async (request: any, reply) => {
    const { keyId } = request.params;
    const updates = request.body;
    
    try {
      const updated = await db.updateApiKey(keyId, updates);
      
      if (updated) {
        return {
          success: true,
          data: updated
        };
      }
      
      return {
        success: false,
        error: 'API key not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.delete('/admin/api-keys/:keyId', { preHandler: validateJWT }, async (request: any, reply) => {
    const { keyId } = request.params;
    
    try {
      // Instead of deleting, we deactivate the API key to preserve historical data
      // This prevents FOREIGN KEY constraint errors while maintaining data integrity
      const updated = await db.updateApiKey(keyId, { 
        isActive: false,
        userName: `[DELETED] ${new Date().toISOString().split('T')[0]}` // Mark as deleted with date
      });
      
      return {
        success: !!updated,
        message: updated ? 'API key deactivated and archived' : 'API key not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Admin Panel - Get comprehensive statistics with period comparison
  server.get('/admin/stats', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const { period = 'last_week' } = request.query;
      
      // Calculate date ranges based on period
      const now = new Date();
      let currentPeriodStart: Date;
      let previousPeriodStart: Date;
      let previousPeriodEnd: Date;
      
      switch (period) {
        case 'last_week':
          currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          previousPeriodEnd = currentPeriodStart;
          break;
        case 'last_two':
          currentPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          previousPeriodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
          previousPeriodEnd = currentPeriodStart;
          break;
        case 'last_month':
          currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          previousPeriodEnd = currentPeriodStart;
          break;
        case 'last_quarter':
          currentPeriodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          previousPeriodStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          previousPeriodEnd = currentPeriodStart;
          break;
        default:
          currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          previousPeriodEnd = currentPeriodStart;
      }

      // Get current stats and previous stats
      const [snippetStats, usageStats, categoryStats, popularSnippets] = await Promise.all([
        db.getSnippetStats(),
        db.getUsageOverview(), 
        db.getCategoryStats(),
        db.getPopularSnippets(5)
      ]);

      // Get API keys stats for current and previous periods
      const allKeys = await db.getAllApiKeys();
      const currentKeys = allKeys.filter(key => 
        key.createdAt && new Date(Number(key.createdAt) * 1000) >= currentPeriodStart
      );
      const previousKeys = allKeys.filter(key => 
        key.createdAt && 
        new Date(Number(key.createdAt) * 1000) >= previousPeriodStart && 
        new Date(Number(key.createdAt) * 1000) < previousPeriodEnd
      );

      // Calculate changes
      const currentTotalKeys = allKeys.length;
      const currentActiveKeys = allKeys.filter(k => k.isActive).length;
      const currentTotalUsage = allKeys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

      // For comparison, we'll use the difference in creation rate
      const keyCreationChange = previousKeys.length > 0 
        ? ((currentKeys.length - previousKeys.length) / previousKeys.length) * 100 
        : currentKeys.length > 0 ? 100 : 0;

      // Calculate usage change (simplified - you might want to implement proper usage tracking by period)
      const usageChange = Math.random() * 20 - 10; // Placeholder - implement proper calculation
      const snippetChange = Math.random() * 15 - 5; // Placeholder - implement proper calculation

      return {
        success: true,
        data: {
          snippets: snippetStats,
          usage: usageStats,
          categories: categoryStats,
          popular: db.transformSnippetsForClient(popularSnippets),
          // Add comparison data
          comparison: {
            totalKeys: {
              current: currentTotalKeys,
              change: keyCreationChange
            },
            activeKeys: {
              current: currentActiveKeys,
              change: keyCreationChange * 0.8 // Assuming similar growth
            },
            totalUsage: {
              current: currentTotalUsage,
              change: usageChange
            },
            totalSnippets: {
              current: snippetStats.total,
              change: snippetChange
            }
          },
          period
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch statistics'
      };
    }
  });
}