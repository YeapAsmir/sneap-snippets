import { FastifyInstance } from 'fastify';
import { DrizzleDatabase } from '../db';
import { validateJWT } from '../auth';

export async function adminRoutes(server: FastifyInstance, db: DrizzleDatabase) {
  // Admin Panel API Routes
  server.get('/admin/api-keys', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const keys = await db.getAllApiKeys();
      return {
        success: true,
        data: keys
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.post('/admin/api-keys', { preHandler: validateJWT }, async (request: any, reply) => {
    const { userName, prefix } = request.body;
    
    if (!userName || !prefix) {
      return {
        success: false,
        error: 'userName and prefix are required'
      };
    }
    
    try {
      const keyId = db.generateApiKey(prefix);
      const newKey = await db.createApiKey({
        keyId,
        userName,
        prefix
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
      const deleted = await db.deleteApiKey(keyId);
      
      return {
        success: deleted,
        message: deleted ? 'API key deleted' : 'API key not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Admin Panel - Get comprehensive statistics
  server.get('/admin/stats', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const [snippetStats, usageStats, categoryStats, popularSnippets] = await Promise.all([
        db.getSnippetStats(),
        db.getUsageOverview(), 
        db.getCategoryStats(),
        db.getPopularSnippets(5)
      ]);

      return {
        success: true,
        data: {
          snippets: snippetStats,
          usage: usageStats,
          categories: categoryStats,
          popular: db.transformSnippetsForClient(popularSnippets)
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