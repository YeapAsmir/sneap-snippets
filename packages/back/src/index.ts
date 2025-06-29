import fastify from 'fastify';
import cors from '@fastify/cors';
import { snippets } from './snippets';
import { SnippetTrie } from './trie';

const server = fastify({
  logger: true
});

// Initialize Trie with all snippets
const snippetTrie = new SnippetTrie();
snippets.forEach((snippet, index) => {
  snippetTrie.insert(snippet, index);
});

console.log('Trie initialized:', snippetTrie.getStats());

server.register(cors, {
  origin: true,
  credentials: true
});

server.get('/', async (request, reply) => {
  return { hello: 'world' };
});

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Get all snippets (for initial load)
server.get('/api/snippets', async (request, reply) => {
  return {
    success: true,
    data: snippets,
    count: snippets.length
  };
});

// Fast prefix search using Trie
server.get('/api/snippets/prefix', async (request: any, reply) => {
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
      method: fuzzy === 'true' ? 'fuzzy' : 'exact'
    }
  };
});

// Search snippets with filters and pagination
server.get('/api/snippets/search', async (request: any, reply) => {
  const { 
    q = '', 
    language = '', 
    prefix = '', 
    page = 1, 
    limit = 50 
  } = request.query;

  let filteredSnippets = snippets;

  // Filter by search query (name, description, prefix)
  if (q) {
    const query = q.toLowerCase();
    filteredSnippets = filteredSnippets.filter(snippet => 
      snippet.name.toLowerCase().includes(query) ||
      snippet.description.toLowerCase().includes(query) ||
      snippet.prefix.toLowerCase().includes(query) ||
      snippet.body.some(line => line.toLowerCase().includes(query))
    );
  }

  // Filter by language/scope
  if (language) {
    filteredSnippets = filteredSnippets.filter(snippet => 
      !snippet.scope || snippet.scope.includes(language)
    );
  }

  // Filter by prefix match (for completion)
  if (prefix) {
    filteredSnippets = filteredSnippets.filter(snippet => 
      snippet.prefix.toLowerCase().startsWith(prefix.toLowerCase())
    );
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedSnippets = filteredSnippets.slice(startIndex, endIndex);

  return {
    success: true,
    data: paginatedSnippets,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredSnippets.length,
      totalPages: Math.ceil(filteredSnippets.length / limit),
      hasNext: endIndex < filteredSnippets.length,
      hasPrev: page > 1
    }
  };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();