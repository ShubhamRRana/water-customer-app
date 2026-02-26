/**
 * Reset Rate Limits Utility Script
 * 
 * This script resets all login rate limits to unblock users who have exceeded rate limits.
 * Useful during development and testing.
 * 
 * Run with: npx ts-node scripts/reset-rate-limits.ts
 */

// Setup global variables first (must be before any other imports)
import './setup-globals';

import { AuthService } from '../src/services/auth.service';

async function resetRateLimits() {
  try {
    console.log('Resetting all login rate limits...');
    
    // Reset all login rate limits
    AuthService.resetLoginRateLimit();
    
    console.log('✅ Successfully reset all login rate limits!');
    console.log('You can now attempt to login again.');
  } catch (error) {
    console.error('❌ Error resetting rate limits:', error);
    process.exit(1);
  }
}

// Run the script
resetRateLimits();

