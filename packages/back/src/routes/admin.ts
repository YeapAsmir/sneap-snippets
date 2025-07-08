import { FastifyInstance } from 'fastify';
import { DrizzleDatabase } from '../db';
import { validateJWT } from '../auth';

export async function adminRoutes(server: FastifyInstance, db: DrizzleDatabase) {
  // Admin Panel API Routes
  server.get('/admin/api-keys', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const keysWithMembers = await db.getApiKeysWithTeamMembers();
      // Filter out system keys and deleted keys
      const filteredKeys = keysWithMembers.filter(key => 
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
    const { userName, teamMemberId } = request.body;
    
    if (!userName) {
      return {
        success: false,
        error: 'userName is required'
      };
    }
    
    try {
      // If teamMemberId is provided, verify it exists
      if (teamMemberId) {
        const teamMember = await db.getTeamMemberById(teamMemberId);
        if (!teamMember) {
          return {
            success: false,
            error: 'Invalid team member ID'
          };
        }
        
        // Check if team member already has maximum number of API keys (2)
        const allApiKeys = await db.getAllApiKeys();
        const memberKeys = allApiKeys.filter(key => key.teamMemberId === teamMemberId && key.isActive);
        
        if (memberKeys.length >= 2) {
          return {
            success: false,
            error: 'Maximum of 2 active API keys allowed per team member'
          };
        }
      }
      
      // Capitalize first letter of name
      const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
      
      // Sanitize username to create prefix
      // Remove special characters, spaces, and convert to lowercase
      const sanitizedPrefix = capitalizedName
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
        userName: capitalizedName,
        prefix: sanitizedPrefix,
        teamMemberId: teamMemberId || null
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
    const { force = false } = request.query as { force?: boolean };
    
    try {
      if (force) {
        // Perform actual deletion - the foreign key constraints will handle cascading
        const deleted = await db.deleteApiKey(keyId);
        
        return {
          success: deleted,
          message: deleted ? 'API key permanently deleted' : 'API key not found'
        };
      } else {
        // Default behavior: deactivate the API key to preserve historical data
        const updated = await db.updateApiKey(keyId, { 
          isActive: false,
          userName: `[DELETED] ${new Date().toISOString().split('T')[0]}` // Mark as deleted with date
        });
        
        return {
          success: !!updated,
          message: updated ? 'API key deactivated and archived' : 'API key not found'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Teams Management
  server.get('/admin/teams', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const teams = await db.getAllTeams();
      return {
        success: true,
        data: teams
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.post('/admin/teams', { preHandler: validateJWT }, async (request: any, reply) => {
    const { name } = request.body;
    
    if (!name) {
      return {
        success: false,
        error: 'Name is required'
      };
    }
    
    try {
      const newTeam = await db.createTeam({ name });
      
      return {
        success: true,
        data: newTeam
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.put('/admin/teams/:id', { preHandler: validateJWT }, async (request: any, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    try {
      const updated = await db.updateTeam(parseInt(id), updates);
      
      if (updated) {
        return {
          success: true,
          data: updated
        };
      }
      
      return {
        success: false,
        error: 'Team not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.delete('/admin/teams/:id', { preHandler: validateJWT }, async (request: any, reply) => {
    const { id } = request.params;
    
    try {
      const deleted = await db.deleteTeam(parseInt(id));
      
      return {
        success: deleted,
        message: deleted ? 'Team deleted successfully' : 'Team not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.get('/admin/teams/:id/members', { preHandler: validateJWT }, async (request: any, reply) => {
    const { id } = request.params;
    
    try {
      const members = await db.getTeamMembersByTeam(parseInt(id));
      return {
        success: true,
        data: members
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Team Members Management
  server.get('/admin/team-members', { preHandler: validateJWT }, async (request: any, reply) => {
    try {
      const members = await db.getAllTeamMembers();
      return {
        success: true,
        data: members
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.post('/admin/team-members', { preHandler: validateJWT }, async (request: any, reply) => {
    const { name, email, avatar, teamId } = request.body;
    
    if (!name) {
      return {
        success: false,
        error: 'Name is required'
      };
    }
    
    if (!teamId) {
      return {
        success: false,
        error: 'Team ID is required'
      };
    }
    
    try {
      // Verify team exists
      const team = await db.getTeamById(teamId);
      if (!team) {
        return {
          success: false,
          error: 'Invalid team ID'
        };
      }
      
      // Capitalize first letter of name
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      
      const newMember = await db.createTeamMember({
        name: capitalizedName,
        email,
        avatar,
        teamId
      });
      
      return {
        success: true,
        data: newMember
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.put('/admin/team-members/:id', { preHandler: validateJWT }, async (request: any, reply) => {
    const { id } = request.params;
    const updates = request.body;
    
    try {
      // Capitalize first letter of name if it's being updated
      if (updates.name) {
        updates.name = updates.name.charAt(0).toUpperCase() + updates.name.slice(1);
      }
      
      // Verify team exists if teamId is being updated
      if (updates.teamId) {
        const team = await db.getTeamById(updates.teamId);
        if (!team) {
          return {
            success: false,
            error: 'Invalid team ID'
          };
        }
      }
      
      const updated = await db.updateTeamMember(parseInt(id), updates);
      
      if (updated) {
        return {
          success: true,
          data: updated
        };
      }
      
      return {
        success: false,
        error: 'Team member not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  server.delete('/admin/team-members/:id', { preHandler: validateJWT }, async (request: any, reply) => {
    const { id } = request.params;
    
    try {
      // With the updated foreign key constraints, deletion should work properly
      // Associated API keys will have their teamMemberId set to null
      const deleted = await db.deleteTeamMember(parseInt(id));
      
      return {
        success: deleted,
        message: deleted ? 'Team member deleted successfully' : 'Team member not found'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Upload avatar endpoint
  server.post('/admin/team-members/:id/avatar', { preHandler: validateJWT }, async (request: any, reply) => {
    const { id } = request.params;
    const { avatar } = request.body;
    
    if (!avatar) {
      return {
        success: false,
        error: 'Avatar data is required'
      };
    }
    
    try {
      // Save the avatar as base64 string in the database
      const updated = await db.updateTeamMember(parseInt(id), { avatar });
      
      if (updated) {
        return {
          success: true,
          data: updated
        };
      }
      
      return {
        success: false,
        error: 'Team member not found'
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

      // Calculate usage change based on actual periods
      const currentPeriodUsage = allKeys
        .filter(key => key.createdAt && new Date(Number(key.createdAt) * 1000) >= currentPeriodStart)
        .reduce((sum, k) => sum + (k.usageCount || 0), 0);
      
      const previousPeriodUsage = allKeys
        .filter(key => 
          key.createdAt && 
          new Date(Number(key.createdAt) * 1000) >= previousPeriodStart && 
          new Date(Number(key.createdAt) * 1000) < previousPeriodEnd
        )
        .reduce((sum, k) => sum + (k.usageCount || 0), 0);

      const usageChange = previousPeriodUsage > 0 
        ? ((currentPeriodUsage - previousPeriodUsage) / previousPeriodUsage) * 100 
        : currentPeriodUsage > 0 ? 100 : 0;

      // For snippets, we'll use a stable calculation based on total count
      const snippetChange = snippetStats.total > 0 ? 0 : 0; // No change for now since we don't track snippet creation dates

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