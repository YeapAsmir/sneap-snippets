export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  snippetIndices: Set<number> = new Set();
  isEndOfWord: boolean = false;
}

export class SnippetTrie {
  private root: TrieNode = new TrieNode();
  private snippets: Map<number, any> = new Map();

  constructor() {
    this.root = new TrieNode();
  }

  // Insert a snippet into the trie
  insert(snippet: any, index: number): void {
    this.snippets.set(index, snippet);
    
    // Index by prefix
    this.insertWord(snippet.prefix.toLowerCase(), index);
    
    // Also index by name words for better search
    const nameWords = snippet.name.toLowerCase().split(/\s+/);
    nameWords.forEach((word: string) => {
      if (word.length > 2) {
        this.insertWord(word, index);
      }
    });

    // Index by key terms in description
    const descWords = snippet.description.toLowerCase().split(/\s+/);
    descWords.forEach((word: string) => {
      if (word.length > 3 && !this.isCommonWord(word)) {
        this.insertWord(word, index);
      }
    });
  }

  private insertWord(word: string, snippetIndex: number): void {
    let node = this.root;
    
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      
      node = node.children.get(char)!;
      // Add snippet index to all nodes in the path for prefix search
      node.snippetIndices.add(snippetIndex);
    }
    
    node.isEndOfWord = true;
  }

  // Search snippets by prefix with ranking
  search(prefix: string, limit: number = 20, language?: string): any[] {
    const lowerPrefix = prefix.toLowerCase();
    let node = this.root;
    
    // Navigate to the prefix node
    for (const char of lowerPrefix) {
      if (!node.children.has(char)) {
        return []; // No matches
      }
      node = node.children.get(char)!;
    }
    
    // Collect all snippet indices from this node
    const snippetIndices = Array.from(node.snippetIndices);
    
    // Get snippets and apply ranking
    let results = snippetIndices
      .map(idx => this.snippets.get(idx))
      .filter(snippet => {
        if (!snippet) return false;
        // Filter by language if specified
        if (language && snippet.scope && !snippet.scope.includes(language)) {
          return false;
        }
        return true;
      });

    // Rank results
    results = this.rankResults(results, lowerPrefix);
    
    return results.slice(0, limit);
  }

  private rankResults(snippets: any[], query: string): any[] {
    return snippets.sort((a, b) => {
      // Priority 1: Exact prefix match
      const aExactPrefix = a.prefix.toLowerCase() === query;
      const bExactPrefix = b.prefix.toLowerCase() === query;
      if (aExactPrefix !== bExactPrefix) return aExactPrefix ? -1 : 1;
      
      // Priority 2: Prefix starts with query
      const aPrefixMatch = a.prefix.toLowerCase().startsWith(query);
      const bPrefixMatch = b.prefix.toLowerCase().startsWith(query);
      if (aPrefixMatch !== bPrefixMatch) return aPrefixMatch ? -1 : 1;
      
      // Priority 3: Shorter prefix (more specific)
      const lengthDiff = a.prefix.length - b.prefix.length;
      if (lengthDiff !== 0) return lengthDiff;
      
      // Priority 4: Name contains query
      const aNameMatch = a.name.toLowerCase().includes(query);
      const bNameMatch = b.name.toLowerCase().includes(query);
      if (aNameMatch !== bNameMatch) return aNameMatch ? -1 : 1;
      
      // Priority 5: Alphabetical
      return a.prefix.localeCompare(b.prefix);
    });
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'it', 'its', 'if', 'then', 'else', 'when', 'where', 'which'
    ]);
    return commonWords.has(word);
  }

  // Get statistics about the trie
  getStats(): { totalNodes: number; totalSnippets: number; avgDepth: number } {
    let totalNodes = 0;
    let totalDepth = 0;
    let leafCount = 0;

    const traverse = (node: TrieNode, depth: number) => {
      totalNodes++;
      if (node.isEndOfWord) {
        totalDepth += depth;
        leafCount++;
      }
      node.children.forEach(child => traverse(child, depth + 1));
    };

    traverse(this.root, 0);

    return {
      totalNodes,
      totalSnippets: this.snippets.size,
      avgDepth: leafCount > 0 ? totalDepth / leafCount : 0
    };
  }

  // Fuzzy search with Levenshtein distance
  fuzzySearch(query: string, maxDistance: number = 2, limit: number = 10): any[] {
    const results: Array<{ snippet: any; distance: number }> = [];
    const lowerQuery = query.toLowerCase();

    this.snippets.forEach(snippet => {
      const prefixDistance = this.levenshteinDistance(lowerQuery, snippet.prefix.toLowerCase());
      if (prefixDistance <= maxDistance) {
        results.push({ snippet, distance: prefixDistance });
      }
    });

    // Sort by distance, then by prefix length
    results.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.snippet.prefix.length - b.snippet.prefix.length;
    });

    return results.slice(0, limit).map(r => r.snippet);
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}