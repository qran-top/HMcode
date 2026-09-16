// Trie and Dictionary Manager for fast O(L) Arabic word lookup
export class ArabicTrie {
  root: Record<string, any> = {};
  size: number = 0;

  insert(word: string) {
    if (!word) return;
    let node = this.root;
    for (const char of word) {
      if (!node[char]) {
        node[char] = {};
      }
      node = node[char];
    }
    if (!node.isEnd) {
      node.isEnd = true;
      this.size++;
    }
  }

  has(word: string): boolean {
    if (!word) return false;
    let node = this.root;
    for (const char of word) {
      if (!node[char]) return false;
      node = node[char];
    }
    return !!node.isEnd;
  }

  hasPrefix(prefix: string): boolean {
    if (!prefix) return true;
    let node = this.root;
    for (const char of prefix) {
      if (!node[char]) return false;
      node = node[char];
    }
    return true;
  }
}
