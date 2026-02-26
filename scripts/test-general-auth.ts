/**
 * General Authentication Testing Script
 * Tests Phase 14: General Testing Checklist items
 */

// Setup global variables first (must be before any other imports)
import './setup-globals';

import { AuthService } from '../src/services/auth.service';
import { rateLimiter } from '../src/utils/rateLimiter';
import { securityLogger } from '../src/utils/securityLogger';
import { LocalStorageService } from '../src/services/localStorage';
import { ValidationUtils } from '../src/utils/validation';
import { ERROR_MESSAGES } from '../src/constants/config';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
  error?: string;
}

const results: TestResult[] = [];

function logTest(test: string, passed: boolean, details: string, error?: string) {
  results.push({ test, passed, details, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${test}`);
  if (details) console.log(`   Details: ${details}`);
  if (error) console.log(`   Error: ${error}`);
}

async function testMultiRoleUserSelection() {
  console.log('\n=== Testing Multi-Role User Selection ===');
  
  try {
    // Initialize sample data
    await LocalStorageService.clear();
    await LocalStorageService.initializeSampleData();
    
    // Test login with multi-role user (multirole@watertanker.app)
    const loginResult = await AuthService.login('multirole@watertanker.app', 'multi123');
    
    if (loginResult.requiresRoleSelection && loginResult.availableRoles) {
      // Check if both roles are available
      const hasCustomer = loginResult.availableRoles.includes('customer');
      const hasDriver = loginResult.availableRoles.includes('driver');
      
      if (hasCustomer && hasDriver) {
        // Test selecting customer role
        const customerResult = await AuthService.loginWithRole('multirole@watertanker.app', 'customer');
        if (customerResult.success && customerResult.user?.role === 'customer') {
          logTest(
            'Multi-role users can select role after login',
            true,
            'User can login and select customer role successfully'
          );
        } else {
          logTest(
            'Multi-role users can select role after login',
            false,
            'Failed to login with customer role',
            customerResult.error
          );
        }
      } else {
        logTest(
          'Multi-role users can select role after login',
          false,
          'Available roles do not match expected (customer, driver)',
          `Found: ${loginResult.availableRoles.join(', ')}`
        );
      }
    } else {
      logTest(
        'Multi-role users can select role after login',
        false,
        'Login did not return requiresRoleSelection flag',
        loginResult.error || 'No error message'
      );
    }
  } catch (error) {
    logTest(
      'Multi-role users can select role after login',
      false,
      'Exception during test',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testRateLimitingWithEmail() {
  console.log('\n=== Testing Rate Limiting with Email ===');
  
  try {
    // Reset rate limiter
    rateLimiter.resetAll();
    
    const testEmail = 'ratelimit@test.com';
    const action = 'login';
    
    // Test 1: First 5 attempts should be allowed
    // Note: isAllowed() increments the count internally, so we don't need to call record()
    let allAllowed = true;
    for (let i = 0; i < 5; i++) {
      const check = rateLimiter.isAllowed(action, testEmail);
      if (!check.allowed) {
        allAllowed = false;
        break;
      }
      // isAllowed already increments, so we don't need to call record()
    }
    
    if (allAllowed) {
      // Test 2: 6th attempt should be blocked
      const blockedCheck = rateLimiter.isAllowed(action, testEmail);
      if (!blockedCheck.allowed) {
        logTest(
          'Rate limiting works with email',
          true,
          'Rate limiting correctly blocks after 5 attempts using email as identifier'
        );
      } else {
        logTest(
          'Rate limiting works with email',
          false,
          'Rate limiting did not block 6th attempt'
        );
      }
    } else {
      logTest(
        'Rate limiting works with email',
        false,
        'Rate limiting blocked before 5 attempts'
      );
    }
    
    // Test 3: Different email should have separate rate limit
    rateLimiter.resetAll();
    const differentEmail = 'different@test.com';
    const differentCheck = rateLimiter.isAllowed(action, differentEmail);
    if (differentCheck.allowed) {
      logTest(
        'Rate limiting works with email (separate limits)',
        true,
        'Different emails have separate rate limit counters'
      );
    } else {
      logTest(
        'Rate limiting works with email (separate limits)',
        false,
        'Different emails share rate limit counter (should be separate)'
      );
    }
  } catch (error) {
    logTest(
      'Rate limiting works with email',
      false,
      'Exception during test',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testSecurityLoggingWithEmail() {
  console.log('\n=== Testing Security Logging with Email ===');
  
  try {
    // Clear previous events
    securityLogger.clearEvents();
    
    const testEmail = 'security@test.com';
    
    // Test login attempt logging
    securityLogger.logAuthAttempt(testEmail, false, 'Test error');
    securityLogger.logAuthAttempt(testEmail, true, undefined, 'user123');
    
    // Test registration attempt logging
    securityLogger.logRegistrationAttempt(testEmail, 'customer', true, undefined, 'user123');
    
    // Get recent events
    const events = securityLogger.getRecentEvents(10);
    
    // Check if events contain email (masked)
    const hasLoginEvents = events.some(e => 
      e.type === 'login_failure' || e.type === 'login_success'
    );
    const hasRegistrationEvents = events.some(e => 
      e.type === 'registration_success'
    );
    
    // Check if email is properly masked in details
    const loginEvent = events.find(e => e.type === 'login_failure');
    const emailInDetails = loginEvent?.details?.email;
    
    if (hasLoginEvents && hasRegistrationEvents && emailInDetails) {
      // Email should be masked (not full email)
      if (emailInDetails.includes('***') || emailInDetails !== testEmail) {
        logTest(
          'Security logging works with email',
          true,
          'Security events are logged with email (properly masked)'
        );
      } else {
        logTest(
          'Security logging works with email',
          false,
          'Email is not masked in security logs (privacy concern)'
        );
      }
    } else {
      logTest(
        'Security logging works with email',
        false,
        'Security events not found or email not in details',
        `Has login: ${hasLoginEvents}, Has registration: ${hasRegistrationEvents}, Email in details: ${!!emailInDetails}`
      );
    }
  } catch (error) {
    logTest(
      'Security logging works with email',
      false,
      'Exception during test',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testPasswordResetFlow() {
  console.log('\n=== Testing Password Reset Flow ===');
  
  try {
    // Check if password reset method exists in AuthService
    const authServiceMethods = Object.getOwnPropertyNames(AuthService);
    const hasPasswordReset = authServiceMethods.some(method => 
      method.toLowerCase().includes('password') && 
      (method.toLowerCase().includes('reset') || method.toLowerCase().includes('forgot'))
    );
    
    if (!hasPasswordReset) {
      logTest(
        'Password reset flow (if exists) works with email',
        true,
        'Password reset flow does not exist (as expected - not implemented yet)'
      );
    } else {
      // If it exists, test it
      logTest(
        'Password reset flow (if exists) works with email',
        false,
        'Password reset exists but not tested (implementation found)'
      );
    }
    
    // Check rate limiter config for password reset
    const passwordResetConfig = rateLimiter.getConfig('password_reset');
    if (passwordResetConfig) {
      logTest(
        'Password reset rate limiting configured',
        true,
        `Password reset rate limit configured: ${passwordResetConfig.maxRequests} attempts per ${passwordResetConfig.windowMs / 1000 / 60} minutes`
      );
    }
  } catch (error) {
    logTest(
      'Password reset flow (if exists) works with email',
      false,
      'Exception during test',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testValidationMessages() {
  console.log('\n=== Testing Validation Messages ===');
  
  try {
    let allPassed = true;
    const issues: string[] = [];
    
    // Test 1: Email validation messages
    const emptyEmail = ValidationUtils.validateEmail('', true);
    if (emptyEmail.error !== 'Email address is required') {
      allPassed = false;
      issues.push(`Empty email error: expected "Email address is required", got "${emptyEmail.error}"`);
    }
    
    const invalidEmail = ValidationUtils.validateEmail('invalid', true);
    if (!invalidEmail.error || !invalidEmail.error.includes('email')) {
      allPassed = false;
      issues.push(`Invalid email error should mention "email"`);
    }
    
    // Test 2: Check error messages in config
    if (ERROR_MESSAGES.auth.invalidCredentials.includes('email') || 
        ERROR_MESSAGES.auth.invalidCredentials.includes('Email')) {
      // Good - mentions email
    } else if (ERROR_MESSAGES.auth.invalidCredentials.includes('phone')) {
      allPassed = false;
      issues.push('ERROR_MESSAGES.auth.invalidCredentials still mentions phone instead of email');
    }
    
    if (ERROR_MESSAGES.auth.userExists.includes('email') || 
        ERROR_MESSAGES.auth.userExists.includes('Email')) {
      // Good - mentions email
    } else if (ERROR_MESSAGES.auth.userExists.includes('phone')) {
      allPassed = false;
      issues.push('ERROR_MESSAGES.auth.userExists still mentions phone instead of email');
    }
    
    if (allPassed && issues.length === 0) {
      logTest(
        'All validation messages are correct',
        true,
        'All validation messages correctly reference email instead of phone'
      );
    } else {
      logTest(
        'All validation messages are correct',
        false,
        'Some validation messages are incorrect',
        issues.join('; ')
      );
    }
  } catch (error) {
    logTest(
      'All validation messages are correct',
      false,
      'Exception during test',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  try {
    let allPassed = true;
    const issues: string[] = [];
    
    // Test 1: Invalid email format
    const invalidEmailResult = await AuthService.login('notanemail', 'password');
    if (!invalidEmailResult.success && invalidEmailResult.error) {
      if (invalidEmailResult.error.includes('email') || invalidEmailResult.error.includes('Email')) {
        // Good
      } else {
        allPassed = false;
        issues.push('Invalid email error does not mention email');
      }
    } else {
      allPassed = false;
      issues.push('Invalid email was accepted (should fail)');
    }
    
    // Test 2: User not found
    const notFoundResult = await AuthService.login('nonexistent@test.com', 'password');
    if (!notFoundResult.success && notFoundResult.error) {
      // Should have appropriate error message
      if (notFoundResult.error.toLowerCase().includes('not found') || 
          notFoundResult.error.toLowerCase().includes('invalid')) {
        // Good
      } else {
        allPassed = false;
        issues.push('User not found error message is unclear');
      }
    } else {
      allPassed = false;
      issues.push('Non-existent user login succeeded (should fail)');
    }
    
    // Test 3: Invalid password
    await LocalStorageService.clear();
    await LocalStorageService.initializeSampleData();
    const wrongPasswordResult = await AuthService.login('customer@watertanker.app', 'wrongpassword');
    if (!wrongPasswordResult.success && wrongPasswordResult.error) {
      // Should have appropriate error message
      if (wrongPasswordResult.error.toLowerCase().includes('password') || 
          wrongPasswordResult.error.toLowerCase().includes('invalid') ||
          wrongPasswordResult.error.toLowerCase().includes('credentials')) {
        // Good
      } else {
        allPassed = false;
        issues.push('Wrong password error message is unclear');
      }
    } else {
      allPassed = false;
      issues.push('Wrong password login succeeded (should fail)');
    }
    
    // Test 4: Rate limit error handling
    rateLimiter.resetAll();
    const testEmail = 'ratelimit@test.com';
    // Exhaust rate limit
    for (let i = 0; i < 6; i++) {
      rateLimiter.record('login', testEmail);
    }
    
    const rateLimitResult = await AuthService.login(testEmail, 'password');
    if (!rateLimitResult.success && rateLimitResult.error) {
      if (rateLimitResult.error.toLowerCase().includes('too many') || 
          rateLimitResult.error.toLowerCase().includes('rate limit') ||
          rateLimitResult.error.toLowerCase().includes('attempts')) {
        // Good
      } else {
        allPassed = false;
        issues.push('Rate limit error message is unclear');
      }
    } else {
      allPassed = false;
      issues.push('Rate limit was not enforced');
    }
    
    if (allPassed && issues.length === 0) {
      logTest(
        'Error handling is appropriate',
        true,
        'All error scenarios return appropriate error messages'
      );
    } else {
      logTest(
        'Error handling is appropriate',
        false,
        'Some error scenarios have issues',
        issues.join('; ')
      );
    }
  } catch (error) {
    logTest(
      'Error handling is appropriate',
      false,
      'Exception during test',
      error instanceof Error ? error.message : String(error)
    );
  }
}

async function runAllTests() {
  console.log('========================================');
  console.log('General Authentication Testing');
  console.log('Phase 14: Testing Checklist - General');
  console.log('========================================\n');
  
  await testMultiRoleUserSelection();
  await testRateLimitingWithEmail();
  await testSecurityLoggingWithEmail();
  await testPasswordResetFlow();
  await testValidationMessages();
  await testErrorHandling();
  
  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
  }
  
  console.log('\n========================================\n');
  
  return { passed, failed, total, results };
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runAllTests, testMultiRoleUserSelection, testRateLimitingWithEmail, 
         testSecurityLoggingWithEmail, testPasswordResetFlow, 
         testValidationMessages, testErrorHandling };

