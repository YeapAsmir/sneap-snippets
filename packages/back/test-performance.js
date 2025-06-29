const iterations = 100;
const prefixes = ['y', 'ya', 'yap', 'yapi', 'ytest', 'yfetch', 'yerr', 'yslice'];

async function benchmark() {
  console.log('🚀 Starting performance benchmark...\n');
  
  // Test 1: Prefix search (Trie)
  console.log('📊 Test 1: Prefix Search Performance');
  console.log('=====================================');
  
  for (const prefix of prefixes) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      try {
        const response = await fetch(`http://localhost:3000/api/snippets/prefix?prefix=${prefix}&limit=10`);
        const data = await response.json();
        
        const time = Date.now() - start;
        times.push(time);
        
        if (i === 0) {
          console.log(`  ${prefix}: Found ${data.data.length} snippets`);
        }
      } catch (error) {
        console.error(`Error testing ${prefix}:`, error.message);
        break;
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`  └─ Avg: ${avgTime.toFixed(2)}ms | Min: ${minTime}ms | Max: ${maxTime}ms`);
    }
  }
  
  // Test 2: Full text search
  console.log('\n📊 Test 2: Full Text Search Performance');
  console.log('========================================');
  
  const searchTerms = ['react', 'hook', 'async', 'component'];
  
  for (const term of searchTerms) {
    const start = Date.now();
    
    try {
      const response = await fetch(`http://localhost:3000/api/snippets/search?q=${term}&limit=10`);
      const data = await response.json();
      const time = Date.now() - start;
      
      console.log(`  "${term}": ${data.data.length} results in ${time}ms`);
    } catch (error) {
      console.error(`Error searching ${term}:`, error.message);
    }
  }
  
  // Test 3: Fuzzy search
  console.log('\n📊 Test 3: Fuzzy Search Performance');
  console.log('====================================');
  
  const fuzzyTerms = [
    { input: 'yaip', expected: 'yapi' },
    { input: 'ytest', expected: 'ytest' },
    { input: 'yeror', expected: 'yerr' }
  ];
  
  for (const { input, expected } of fuzzyTerms) {
    const start = Date.now();
    
    try {
      const response = await fetch(`http://localhost:3000/api/snippets/prefix?prefix=${input}&fuzzy=true&limit=5`);
      const data = await response.json();
      const time = Date.now() - start;
      
      const foundExpected = data.data.some(s => s.prefix === expected);
      console.log(`  "${input}" → "${expected}": ${foundExpected ? '✓' : '✗'} (${time}ms)`);
    } catch (error) {
      console.error(`Error fuzzy searching ${input}:`, error.message);
    }
  }
  
  // Test 4: Concurrent requests
  console.log('\n📊 Test 4: Concurrent Load Test');
  console.log('================================');
  
  const concurrentCount = 50;
  const concurrentStart = Date.now();
  
  try {
    const promises = Array(concurrentCount).fill(null).map((_, i) => 
      fetch(`http://localhost:3000/api/snippets/prefix?prefix=y&limit=5`)
    );
    
    await Promise.all(promises);
    const totalTime = Date.now() - concurrentStart;
    
    console.log(`  ${concurrentCount} concurrent requests: ${totalTime}ms total`);
    console.log(`  Average per request: ${(totalTime / concurrentCount).toFixed(2)}ms`);
  } catch (error) {
    console.error('Error in concurrent test:', error.message);
  }
  
  console.log('\n✅ Benchmark complete!');
}

// Run benchmark
benchmark().catch(console.error);