import { DrizzleDatabase } from './db';
import { snippets } from './snippets';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  
  const db = new DrizzleDatabase();
  
  try {
    // Initialize database (create tables if needed)
    await db.initialize();
    
    // The system API key is already created by initialize()
    console.log('✅ System API key ready');
    
    // Force seed all snippets (skip existing check)
    console.log(`📚 Force seeding ${snippets.length} snippets...`);
    
    for (const snippet of snippets) {
      try {
        const preparedSnippet = db.prepareSnippetForStorage({
          name: snippet.name,
          prefix: snippet.prefix,
          body: snippet.body,
          description: snippet.description,
          scope: snippet.scope,
          category: categorizeSnippet(snippet.name),
          createdBy: 'system' // Reference to system API key
        });
        
        await db.createSnippet(preparedSnippet);
        console.log(`✅ Created snippet: ${snippet.prefix} - ${snippet.name}`);
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          console.log(`⚠️  Snippet already exists: ${snippet.prefix} - ${snippet.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Database seeding completed successfully!');
    
    // Show summary
    const totalSnippets = await db.searchSnippets('', undefined, 100);
    const totalApiKeys = await db.getAllApiKeys();
    
    console.log(`📊 Summary:`);
    console.log(`   - Snippets: ${totalSnippets.length}`);
    console.log(`   - API Keys: ${totalApiKeys.length}`);
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

function categorizeSnippet(name: string): string {
  const nameL = name.toLowerCase();
  if (nameL.includes('react') || nameL.includes('component') || nameL.includes('hook')) return 'react';
  if (nameL.includes('async') || nameL.includes('api') || nameL.includes('fetch')) return 'async';
  if (nameL.includes('test') || nameL.includes('spec')) return 'testing';
  if (nameL.includes('style') || nameL.includes('css')) return 'styling';
  if (nameL.includes('redux') || nameL.includes('store') || nameL.includes('slice')) return 'state';
  return 'general';
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };