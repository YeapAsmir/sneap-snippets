# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing a VS Code extension with snippet provider functionality backed by a Fastify API server. The system provides intelligent code snippets with usage analytics, personalization, and high-performance search capabilities.

**Architecture Components:**

- `packages/back`: Fastify server with Drizzle ORM + SQLite database
- `packages/front`: VS Code extension with dynamic snippet completion

## Development Commands

### Root Level (yarn workspaces)

```bash
yarn run build           # Build all packages
yarn run dev            # Start development servers for all packages
yarn run typecheck      # Type check all packages
yarn run test           # Run tests across all packages
```

### Backend (`packages/back`)

```bash
yarn run dev            # Start Fastify server with hot reload (tsx watch)
yarn run build          # Compile TypeScript to dist/
yarn run start          # Run production server from dist/
yarn run studio         # Open Drizzle Studio for database management
```

### VS Code Extension (`packages/front`)

```bash
yarn run compile        # Compile TypeScript extension
yarn run watch          # Watch mode compilation
yarn run lint           # ESLint TypeScript files
```

## Architecture Details

### Database Layer (Drizzle ORM)

- **Schema**: Defined in `packages/back/src/db/schema.ts` with three tables:
    - `snippets`: Main snippet storage with usage tracking
    - `usageMetrics`: Detailed usage analytics per user/snippet
    - `userPreferences`: User personalization data
- **Configuration**: `drizzle.config.ts` uses SQLite dialect
- **Migrations**: Auto-generated in `drizzle/` directory, run automatically on server init

### Search Performance Architecture

The system uses a dual-search approach for optimal performance:

1. **Trie Data Structure** (`packages/back/src/trie.ts`):
    - O(1) prefix search for snippet completion
    - Loaded into memory on server startup
    - Supports fuzzy search with Levenshtein distance

2. **SQLite Full-text Search** (`packages/back/src/db/index.ts`):
    - Database queries for complex filtering
    - Personalized snippet ranking based on user history

### Extension Integration

- **Completion Provider**: Implements VS Code `CompletionItemProvider`
- **Multi-level Caching**: Memory cache + VS Code GlobalState persistence
- **Usage Tracking**: Automatic analytics when snippets are accepted
- **API Endpoints**:
    - `GET /api/snippets` - Personalized snippet recommendations
    - `GET /api/snippets/prefix` - Ultra-fast Trie prefix search
    - `POST /api/snippets/usage` - Track usage metrics

### Key Technical Patterns

**Database Connection**: Uses `DrizzleDatabase` class in `packages/back/src/db/index.ts` with automatic migration execution and connection pooling.

**Extension State Management**: The VS Code extension uses a centralized cache system (`packages/front/src/cache.ts`) with LRU eviction and persistent storage.

**API Response Format**: All endpoints return consistent JSON structure:

```typescript
{
  success: boolean,
  data: any,
  meta?: { searchTime, count, method, engine }
}
```

**Snippet Data Format**: Snippets store `body` and `scope` as JSON strings in database, parsed to arrays for API responses and Trie operations.

## Server Configuration

The Fastify server runs on `http://localhost:3000` and includes:

- CORS enabled for development
- Automatic database initialization with seeding
- Graceful shutdown handling
- Request logging and error handling

## Extension Development

To debug the VS Code extension:

1. Ensure `"composite": true` is set in `packages/front/tsconfig.json`
2. Use F5 in VS Code to launch Extension Development Host
3. Extension activates on JavaScript/TypeScript file types
4. Backend server must be running for snippet fetching
