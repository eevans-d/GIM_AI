/**
 * MOCK: bcrypt
 * Mock completo para password hashing en tests de seguridad
 */

// Simulated hash storage for testing
const hashedPasswords = new Map();

// Mock bcrypt hash
const hash = jest.fn(async (plaintext, saltRounds = 10) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Create deterministic hash for testing
  const mockHash = `$2b$${saltRounds}$mock-hash-${Buffer.from(plaintext).toString('base64').substring(0, 30)}`;
  
  // Store for comparison
  hashedPasswords.set(mockHash, plaintext);
  
  console.log(`[MOCK bcrypt] Password hashed (rounds: ${saltRounds})`);
  return mockHash;
});

// Sync version of hash
const hashSync = jest.fn((plaintext, saltRounds = 10) => {
  const mockHash = `$2b$${saltRounds}$mock-hash-${Buffer.from(plaintext).toString('base64').substring(0, 30)}`;
  hashedPasswords.set(mockHash, plaintext);
  console.log(`[MOCK bcrypt] Password hashed synchronously (rounds: ${saltRounds})`);
  return mockHash;
});

// Mock bcrypt compare
const compare = jest.fn(async (plaintext, hash) => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Check if hash exists and matches
  const storedPlaintext = hashedPasswords.get(hash);
  const matches = storedPlaintext === plaintext;
  
  console.log(`[MOCK bcrypt] Password comparison: ${matches ? 'MATCH' : 'NO MATCH'}`);
  return matches;
});

// Sync version of compare
const compareSync = jest.fn((plaintext, hash) => {
  const storedPlaintext = hashedPasswords.get(hash);
  const matches = storedPlaintext === plaintext;
  console.log(`[MOCK bcrypt] Password comparison (sync): ${matches ? 'MATCH' : 'NO MATCH'}`);
  return matches;
});

// Mock salt generation
const genSalt = jest.fn(async (rounds = 10) => {
  await new Promise(resolve => setTimeout(resolve, 5));
  const salt = `$2b$${rounds}$mock-salt-${Math.random().toString(36).substring(7)}`;
  console.log(`[MOCK bcrypt] Salt generated (rounds: ${rounds})`);
  return salt;
});

// Sync version of genSalt
const genSaltSync = jest.fn((rounds = 10) => {
  const salt = `$2b$${rounds}$mock-salt-${Math.random().toString(36).substring(7)}`;
  console.log(`[MOCK bcrypt] Salt generated synchronously (rounds: ${rounds})`);
  return salt;
});

// Get number of rounds from hash
const getRounds = jest.fn((hash) => {
  const matches = hash.match(/^\$2[aby]\$(\d+)\$/);
  return matches ? parseInt(matches[1]) : 10;
});

// Helper functions for tests
const mockHelpers = {
  // Pre-hash a password for use in tests
  prehash: async (plaintext, rounds = 10) => {
    return await hash(plaintext, rounds);
  },
  
  // Create a known hash-password pair for testing
  createKnownPair: (plaintext, rounds = 10) => {
    const hashedValue = hashSync(plaintext, rounds);
    return { plaintext, hash: hashedValue };
  },
  
  // Clear all stored hashes
  clearHashes: () => {
    hashedPasswords.clear();
    console.log(`[MOCK bcrypt] All hashes cleared`);
  },
  
  // Get all stored hashes (for debugging)
  getStoredHashes: () => {
    return Array.from(hashedPasswords.entries());
  },
  
  // Manually add a hash-plaintext pair
  addHashPair: (hash, plaintext) => {
    hashedPasswords.set(hash, plaintext);
    console.log(`[MOCK bcrypt] Manual hash pair added`);
  }
};

module.exports = {
  hash,
  hashSync,
  compare,
  compareSync,
  genSalt,
  genSaltSync,
  getRounds,
  // Export helpers for tests
  __mockHelpers: mockHelpers
};
