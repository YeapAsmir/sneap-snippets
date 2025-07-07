// Misc
import cors                from '@fastify/cors';
import fastify             from 'fastify';
import path                from 'path';
import {
    AuthService
}                          from './auth';
import { DrizzleDatabase } from './db';
import { SnippetTrie }     from './trie';
import { adminRoutes }     from './routes/admin';
import 'dotenv/config';

const server = fastify({
  logger: true,
  bodyLimit: 10 * 1024 * 1024 // 10MB limit for image uploads
});

// Initialize services
const db = new DrizzleDatabase();
const snippetTrie = new SnippetTrie();

let isInitialized = false;

// Middleware for API key validation
async function validateApiKey(request: any, reply: any) {
  await initializeServer();
  
  const apiKey = request.headers['x-api-key'];
  
  if (!apiKey) {
    return reply.status(401).send({
      success: false,
      error: 'API key required'
    });
  }
  
  const validKey = await db.validateApiKey(apiKey);
  
  if (!validKey) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or inactive API key'
    });
  }
  
  // Attach user info to request
  request.user = {
    keyId: validKey.keyId,
    userName: validKey.userName,
    prefix: validKey.prefix
  };
}

async function initializeServer() {
  if (isInitialized) return;
  
  console.log('🔄 Initializing server...');
  
  // Initialize Drizzle database
  await db.initialize();
  
  // Load all snippets into Trie for ultra-fast prefix search
  const allSnippets = await db.searchSnippets('', undefined, 10000);
  console.log(`📚 Loading ${allSnippets.length} snippets into search Trie...`);
  
  allSnippets.forEach((snippet) => {
    // Parse JSON fields for Trie
    const snippetForTrie = {
      ...db.transformSnippetForClient(snippet),
      id: snippet.id!
    };
    snippetTrie.insert(snippetForTrie, snippet.id!);
  });
  
  console.log('🚀 Server initialization complete!');
  console.log('📊 Trie stats:', snippetTrie.getStats());
  
  isInitialized = true;
}

server.register(cors, {
  origin: true,
  credentials: true
});

// Authentication endpoints
server.post('/auth/login', async (request: any, reply) => {
  const { username, password, rememberMe } = request.body;
  
  if (!username || !password) {
    return reply.status(400).send({
      success: false,
      error: 'Username and password required'
    });
  }
  
  const isValid = await AuthService.validateCredentials(username, password);
  
  if (!isValid) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid credentials'
    });
  }
  
  const accessToken = AuthService.generateAccessToken(username);
  const response: any = {
    success: true,
    token: accessToken
  };
  
  if (rememberMe) {
    response.refreshToken = AuthService.generateRefreshToken(username);
  }
  
  return response;
});

server.post('/auth/refresh', async (request: any, reply) => {
  const { refreshToken } = request.body;
  
  if (!refreshToken) {
    return reply.status(400).send({
      success: false,
      error: 'Refresh token required'
    });
  }
  
  const payload = AuthService.verifyRefreshToken(refreshToken);
  
  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid refresh token'
    });
  }
  
  const newAccessToken = AuthService.generateAccessToken(payload.username);
  
  return {
    success: true,
    token: newAccessToken
  };
});

server.get('/', async (request, reply) => {
  return { 
    hello: 'Sneap API',
    version: '2.0.0',
    features: ['Drizzle ORM', 'SQLite', 'Trie Search', 'Usage Analytics', 'Personalization']
  };
});

server.get('/health', async (request, reply) => {
  await initializeServer();
  
  const snippetCount = await db.searchSnippets('').then(s => s.length);
  
  return { 
    status: 'ok',
    database: 'Drizzle ORM + SQLite',
    snippetCount,
    searchEngine: 'Trie',
    analytics: 'enabled'
  };
});

// Get snippets with intelligent personalization
server.get('/api/snippets', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const { language, limit = 50, userId } = request.query;
  
  let snippets;
  if (userId) {
    // Get personalized snippets based on user history
    snippets = await db.getPersonalizedSnippets(userId, language, parseInt(limit));
  } else {
    // Get globally popular snippets
    snippets = await db.getPopularSnippets(parseInt(limit), language);
  }
  
  // Transform JSON fields for client
  const transformedSnippets = db.transformSnippetsForClient(snippets);

  return {
    success: true,
    data: transformedSnippets,
    count: transformedSnippets.length,
    personalized: !!userId,
    source: 'Drizzle ORM'
  };
});

// Ultra-fast prefix search using Trie + SQLite
server.get('/api/snippets/prefix', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const { 
    prefix = '', 
    language = '',
    limit = 15,
    fuzzy = false
  } = request.query;

  if (!prefix || prefix.length < 1) {
    return {
      success: false,
      error: 'Prefix must be at least 1 character'
    };
  }

  const startTime = Date.now();
  
  let results;
  if (fuzzy === 'true') {
    results = snippetTrie.fuzzySearch(prefix, 2, parseInt(limit));
  } else {
    results = snippetTrie.search(prefix, parseInt(limit), language);
  }

  const searchTime = Date.now() - startTime;

  return {
    success: true,
    data: results,
    meta: {
      searchTime: `${searchTime}ms`,
      count: results.length,
      method: fuzzy === 'true' ? 'fuzzy' : 'trie',
      engine: 'Trie + Drizzle'
    }
  };
});

// Full-text search using SQLite
server.get('/api/snippets/search', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const { 
    q = '', 
    language = '', 
    limit = 20 
  } = request.query;

  const startTime = Date.now();
  
  const results = await db.searchSnippets(q, language, parseInt(limit));
  
  // Transform for client
  const transformedResults = db.transformSnippetsForClient(results);
  
  const searchTime = Date.now() - startTime;

  return {
    success: true,
    data: transformedResults,
    meta: {
      searchTime: `${searchTime}ms`,
      count: transformedResults.length,
      method: 'full-text',
      engine: 'Drizzle ORM'
    }
  };
});

// Track snippet usage with detailed analytics
server.post('/api/snippets/usage', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const {
    snippetId,
    userId,
    language,
    fileExtension,
    searchTime,
    wasAccepted = true
  } = request.body;

  if (!snippetId || !userId || !language) {
    return {
      success: false,
      error: 'Missing required fields: snippetId, userId, language'
    };
  }

  await db.recordUsage({
    snippetId,
    userId,
    language,
    fileExtension,
    searchTime,
    wasAccepted
  });

  return { 
    success: true,
    message: 'Usage tracked successfully'
  };
});

// Get comprehensive user analytics
server.get('/api/users/:userId/stats', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const { userId } = request.params;
  const stats = await db.getUserStats(userId);
  
  return {
    success: true,
    data: stats,
    userId: userId.substring(0, 8) + '...' // Privacy
  };
});

// Get snippet with creator information
server.get('/api/snippets/:id', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const { id } = request.params;
  const snippet = await db.getSnippetWithCreator(parseInt(id));
  
  if (!snippet) {
    return {
      success: false,
      error: 'Snippet not found'
    };
  }
  
  return {
    success: true,
    data: snippet
  };
});

// Get snippet-specific analytics
server.get('/api/snippets/:id/analytics', { preHandler: validateApiKey }, async (request: any, reply) => {
  
  const { id } = request.params;
  const analytics = await db.getSnippetAnalytics(parseInt(id));
  
  return {
    success: true,
    data: analytics,
    snippetId: parseInt(id)
  };
});

// Register admin routes
server.register(async function (server) {
  server.addHook('preHandler', async (request, reply) => {
    await initializeServer();
  });
  
  await adminRoutes(server, db);
});

// Get unique categories from existing snippets
server.get('/api/categories', async (request: any, reply) => {
  await initializeServer();
  
  try {
    const categories = await db.getUniqueCategories();
    
    return {
      success: true,
      data: categories,
      count: categories.length
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch categories'
    };
  }
});

// CRUD Operations
server.post('/api/snippets', { preHandler: validateApiKey }, async (request: any, reply) => {
  await initializeServer();
  
  console.log('DEBUG - POST /api/snippets received:', {
    headers: request.headers,
    body: request.body,
    user: request.user
  });
  
  const { prefix, body, description, scope, category } = request.body;
  
  if (!prefix || !body || description === undefined || description === null) {
    return {
      success: false,
      error: 'Missing required fields: prefix, body, description'
    };
  }

  try {
    const preparedData = db.prepareSnippetForStorage({
      name: prefix,
      prefix,
      body,
      description,
      scope,
      category: category || 'general',
      createdBy: request.user.keyId // Use authenticated user's keyId
    });
    const newSnippet = await db.createSnippet(preparedData);

    // Add to Trie for immediate search availability
    const snippetForTrie = db.transformSnippetForClient(newSnippet);
    snippetTrie.insert(snippetForTrie, newSnippet.id!);

    return {
      success: true,
      data: snippetForTrie,
      message: 'Snippet created successfully'
    };
  } catch (error: any) {
    console.log('Error creating snippet:', error);
    return {
      success: false,
      error: error.message || 'Failed to create snippet'
    };
  }
});

server.put('/api/snippets/:id', { preHandler: validateApiKey }, async (request: any, reply) => {
  await initializeServer();
  
  const { id } = request.params;
  const updates = request.body;
  
  // Transform arrays to JSON strings for storage
  const preparedUpdates = db.prepareSnippetForStorage(updates);
  
  try {
    const updated = await db.updateSnippet(parseInt(id), preparedUpdates);
    
    if (updated) {
      // Transform for response
      const responseSnippet = db.transformSnippetForClient(updated);
      
      return {
        success: true,
        data: responseSnippet,
        message: 'Snippet updated successfully'
      };
    }
    
    return { 
      success: false, 
      error: 'Snippet not found' 
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update snippet'
    };
  }
});

server.delete('/api/snippets/:id', { preHandler: validateApiKey }, async (request: any, reply) => {
  await initializeServer();
  
  const { id } = request.params;
  
  try {
    const deleted = await db.deleteSnippet(parseInt(id));
    
    return { 
      success: deleted,
      message: deleted ? 'Snippet deleted successfully' : 'Snippet not found'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete snippet'
    };
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🚀 Sneap Server running on http://localhost:3001');
    console.log('💾 Database: Drizzle ORM + SQLite');
    console.log('🔍 Search: Trie + Full-text');
    console.log('📊 Analytics: Enabled');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();