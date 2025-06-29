// Misc
import cors                from '@fastify/cors';
import fastify             from 'fastify';
import path                from 'path';
import { DrizzleDatabase } from './db';
import { SnippetTrie }     from './trie';
import 'dotenv/config';

const server = fastify({
  logger: true
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
      ...snippet,
      id: snippet.id!,
      body: JSON.parse(snippet.body),
      scope: snippet.scope ? JSON.parse(snippet.scope) : undefined
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

// Serve static files for admin panel (without authentication for plugin)
server.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/admin-static/'
});

// Admin authentication middleware
async function adminAuth(request: any, reply: any) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    reply.header('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return reply.status(401).send('Authentication required');
  }
  
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (username !== 'admin' || password !== adminPassword) {
    reply.header('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return reply.status(401).send('Invalid credentials');
  }
}

// Admin panel route with authentication
server.get('/admin', { preHandler: adminAuth }, async (request, reply) => {
  return reply.redirect('/admin/index.html');
});

// Protect direct access to index.html with custom handler
server.get('/admin/index.html', { preHandler: adminAuth }, async (request, reply) => {
  const fs = require('fs');
  const adminHtmlPath = path.join(__dirname, '../public/index.html');
  
  try {
    const htmlContent = fs.readFileSync(adminHtmlPath, 'utf8');
    reply.type('text/html').send(htmlContent);
  } catch (error) {
    reply.status(404).send('Admin panel not found');
  }
});

// Block direct access to admin-static files
server.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/admin-static/') && !request.url.includes('/admin-static/index.html')) {
    // Allow CSS, JS, images etc. but only if we're already authenticated
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return reply.status(403).send('Access denied');
    }
    
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username !== 'admin' || password !== adminPassword) {
      return reply.status(403).send('Access denied');
    }
  }
});


server.get('/', async (request, reply) => {
  return { 
    hello: 'Yeap Snippets API',
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
  const transformedSnippets = snippets.map(s => ({
    ...s,
    body: JSON.parse(s.body),
    scope: s.scope ? JSON.parse(s.scope) : undefined
  }));

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
  const transformedResults = results.map(s => ({
    ...s,
    body: JSON.parse(s.body),
    scope: s.scope ? JSON.parse(s.scope) : undefined
  }));
  
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

// Update index.html to use /admin-static/ for assets if needed

// Admin Panel API Routes
server.get('/admin/api-keys', { preHandler: adminAuth }, async (request: any, reply) => {
  await initializeServer();
  
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

server.post('/admin/api-keys', { preHandler: adminAuth }, async (request: any, reply) => {
  await initializeServer();
  
  const { userName, prefix, notes } = request.body;
  
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
      prefix,
      notes: notes || undefined
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

server.put('/admin/api-keys/:keyId', { preHandler: adminAuth }, async (request: any, reply) => {
  await initializeServer();
  
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

server.delete('/admin/api-keys/:keyId', { preHandler: adminAuth }, async (request: any, reply) => {
  await initializeServer();
  
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

// CRUD Operations
server.post('/api/snippets', async (request: any, reply) => {
  await initializeServer();
  
  const { name, prefix, body, description, scope, category } = request.body;
  
  if (!name || !prefix || !body || !description) {
    return {
      success: false,
      error: 'Missing required fields: name, prefix, body, description'
    };
  }

  try {
    const newSnippet = await db.createSnippet({
      name,
      prefix,
      body: JSON.stringify(body),
      description,
      scope: scope ? JSON.stringify(scope) : undefined,
      category: category || 'general'
    });

    // Add to Trie for immediate search availability
    const snippetForTrie = {
      ...newSnippet,
      body: JSON.parse(newSnippet.body),
      scope: newSnippet.scope ? JSON.parse(newSnippet.scope) : undefined
    };
    snippetTrie.insert(snippetForTrie, newSnippet.id!);

    return {
      success: true,
      data: snippetForTrie,
      message: 'Snippet created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create snippet'
    };
  }
});

server.put('/api/snippets/:id', async (request: any, reply) => {
  await initializeServer();
  
  const { id } = request.params;
  const updates = request.body;
  
  // Transform arrays to JSON strings for storage
  if (updates.body) updates.body = JSON.stringify(updates.body);
  if (updates.scope) updates.scope = JSON.stringify(updates.scope);
  
  try {
    const updated = await db.updateSnippet(parseInt(id), updates);
    
    if (updated) {
      // Transform for response
      const responseSnippet = {
        ...updated,
        body: JSON.parse(updated.body),
        scope: updated.scope ? JSON.parse(updated.scope) : undefined
      };
      
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

server.delete('/api/snippets/:id', async (request: any, reply) => {
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
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Yeap Snippets Server running on http://localhost:3000');
    console.log('💾 Database: Drizzle ORM + SQLite');
    console.log('🔍 Search: Trie + Full-text');
    console.log('📊 Analytics: Enabled');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();