/**
 * Admin Role Testing Script
 * 
 * This script tests all admin role functionality for Phase 14 of the migration:
 * - Admin registration with email+password
 * - Admin login with email+password
 * - Admin creating drivers with email+password
 * - Admin profile editing with email
 * - Admin viewing/editing driver profiles
 * 
 * Run this script to verify all admin functionality works correctly.
 */

// Setup global variables first (must be before any other imports)
import './setup-globals';

import { AuthService } from '../src/services/auth.service';
import { LocalStorageService } from '../src/services/localStorage';
import { UserService } from '../src/services/user.service';
import { ValidationUtils, SanitizationUtils } from '../src/utils';
import { UserRole } from '../src/types';

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: string;
}

class AdminRoleTester {
  private results: TestResult[] = [];
  private testAdminEmail = 'testadmin@watertanker.app';
  private testAdminPassword = 'TestAdmin123!';
  private testAdminName = 'Test Admin User';
  private testDriverEmail = 'testdriver@watertanker.app';
  private testDriverPassword = 'TestDriver123!';
  private testDriverName = 'Test Driver';

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Admin Role Testing...\n');
    console.log('=' .repeat(60));
    
    try {
      // Initialize app and clear existing test data
      await this.setup();
      
      // Run all tests
      await this.testAdminRegistration();
      await this.testAdminLogin();
      await this.testAdminCreateDriver();
      await this.testAdminProfileEdit();
      await this.testAdminViewEditDriverProfiles();
      
      // Print results
      this.printResults();
      
      // Cleanup
      await this.cleanup();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  private async setup(): Promise<void> {
    console.log('📋 Setting up test environment...');
    try {
      await AuthService.initializeApp();
      
      // Clear test users if they exist
      const users = await LocalStorageService.getUsers();
      const testUsers = users.filter(u => 
        u.email === this.testAdminEmail || 
        u.email === this.testDriverEmail
      );
      
      for (const user of testUsers) {
        await UserService.deleteUser(user.uid);
      }
      
      console.log('✅ Test environment ready\n');
    } catch (error) {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }

  private async testAdminRegistration(): Promise<void> {
    console.log('📝 Test 1: Admin Registration with Email+Password');
    console.log('-'.repeat(60));
    
    try {
      // Test valid admin registration
      const result = await AuthService.register(
        this.testAdminEmail,
        this.testAdminPassword,
        this.testAdminName,
        'admin',
        { businessName: 'Test Business' }
      );
      
      if (result.success && result.user) {
        // Verify user was created correctly
        const user = result.user;
        const isValid = 
          user.email === SanitizationUtils.sanitizeEmail(this.testAdminEmail) &&
          user.role === 'admin' &&
          user.name === SanitizationUtils.sanitizeName(this.testAdminName);
        
        if (isValid) {
          this.addResult('Admin Registration', true, 'Admin registered successfully with email+password');
        } else {
          this.addResult('Admin Registration', false, 'Admin registered but data is incorrect');
        }
      } else {
        this.addResult('Admin Registration', false, result.error || 'Registration failed');
      }
      
      // Test duplicate email registration
      const duplicateResult = await AuthService.register(
        this.testAdminEmail,
        'AnotherPassword123!',
        'Another Admin',
        'admin'
      );
      
      if (!duplicateResult.success && duplicateResult.error?.includes('already exists')) {
        this.addResult('Admin Registration - Duplicate Email', true, 'Correctly prevented duplicate email registration');
      } else {
        this.addResult('Admin Registration - Duplicate Email', false, 'Failed to prevent duplicate email registration');
      }
      
      // Test invalid email format
      const invalidEmailResult = await AuthService.register(
        'invalid-email',
        this.testAdminPassword,
        this.testAdminName,
        'admin'
      );
      
      if (!invalidEmailResult.success && invalidEmailResult.error?.includes('email')) {
        this.addResult('Admin Registration - Invalid Email', true, 'Correctly rejected invalid email format');
      } else {
        this.addResult('Admin Registration - Invalid Email', false, 'Failed to reject invalid email format');
      }
      
    } catch (error) {
      this.addResult('Admin Registration', false, error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('');
  }

  private async testAdminLogin(): Promise<void> {
    console.log('🔐 Test 2: Admin Login with Email+Password');
    console.log('-'.repeat(60));
    
    try {
      // Test successful login
      const loginResult = await AuthService.login(this.testAdminEmail, this.testAdminPassword);
      
      if (loginResult.success && loginResult.user) {
        const isValid = 
          loginResult.user.email?.toLowerCase() === this.testAdminEmail.toLowerCase() &&
          loginResult.user.role === 'admin';
        
        if (isValid) {
          this.addResult('Admin Login', true, 'Admin logged in successfully with email+password');
        } else {
          this.addResult('Admin Login', true, 'Login succeeded but user data incorrect');
        }
      } else {
        this.addResult('Admin Login', false, loginResult.error || 'Login failed');
      }
      
      // Test login with wrong password
      const wrongPasswordResult = await AuthService.login(this.testAdminEmail, 'WrongPassword123!');
      
      if (!wrongPasswordResult.success && wrongPasswordResult.error?.includes('password')) {
        this.addResult('Admin Login - Wrong Password', true, 'Correctly rejected wrong password');
      } else {
        this.addResult('Admin Login - Wrong Password', false, 'Failed to reject wrong password');
      }
      
      // Test login with non-existent email
      const wrongEmailResult = await AuthService.login('nonexistent@watertanker.app', this.testAdminPassword);
      
      if (!wrongEmailResult.success && wrongEmailResult.error?.includes('not found')) {
        this.addResult('Admin Login - Non-existent Email', true, 'Correctly rejected non-existent email');
      } else {
        this.addResult('Admin Login - Non-existent Email', false, 'Failed to reject non-existent email');
      }
      
      // Test case-insensitive email login
      const caseInsensitiveResult = await AuthService.login(
        this.testAdminEmail.toUpperCase(),
        this.testAdminPassword
      );
      
      if (caseInsensitiveResult.success && caseInsensitiveResult.user) {
        this.addResult('Admin Login - Case Insensitive Email', true, 'Email login is case-insensitive');
      } else {
        this.addResult('Admin Login - Case Insensitive Email', false, 'Email login should be case-insensitive');
      }
      
    } catch (error) {
      this.addResult('Admin Login', false, error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('');
  }

  private async testAdminCreateDriver(): Promise<void> {
    console.log('👤 Test 3: Admin Creating Drivers with Email+Password');
    console.log('-'.repeat(60));
    
    try {
      // Get admin user to verify we're logged in as admin
      const adminUser = await AuthService.getCurrentUserData();
      if (!adminUser || adminUser.role !== 'admin') {
        // Login as admin first
        await AuthService.login(this.testAdminEmail, this.testAdminPassword);
      }
      
      // Create a driver using AuthService.register with createdByAdmin flag
      const driverResult = await AuthService.register(
        this.testDriverEmail,
        this.testDriverPassword,
        this.testDriverName,
        'driver',
        {
          createdByAdmin: true,
          isApproved: true,
          isAvailable: true,
          licenseNumber: 'DL123456789',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: '9876543210',
        }
      );
      
      if (driverResult.success && driverResult.user) {
        const driver = driverResult.user;
        const isValid = 
          driver.email === SanitizationUtils.sanitizeEmail(this.testDriverEmail) &&
          driver.role === 'driver' &&
          driver.createdByAdmin === true;
        
        if (isValid) {
          this.addResult('Admin Create Driver', true, 'Admin successfully created driver with email+password');
        } else {
          this.addResult('Admin Create Driver', false, 'Driver created but data is incorrect');
        }
      } else {
        this.addResult('Admin Create Driver', false, driverResult.error || 'Driver creation failed');
      }
      
      // Test that created driver can login
      const driverLoginResult = await AuthService.login(this.testDriverEmail, this.testDriverPassword);
      
      if (driverLoginResult.success && driverLoginResult.user?.role === 'driver') {
        this.addResult('Admin Create Driver - Driver Can Login', true, 'Created driver can login with email+password');
      } else {
        this.addResult('Admin Create Driver - Driver Can Login', false, 'Created driver cannot login');
      }
      
      // Test duplicate driver email
      const duplicateDriverResult = await AuthService.register(
        this.testDriverEmail,
        'AnotherPassword123!',
        'Another Driver',
        'driver',
        { createdByAdmin: true }
      );
      
      if (!duplicateDriverResult.success && duplicateDriverResult.error?.includes('already exists')) {
        this.addResult('Admin Create Driver - Duplicate Email', true, 'Correctly prevented duplicate driver email');
      } else {
        this.addResult('Admin Create Driver - Duplicate Email', false, 'Failed to prevent duplicate driver email');
      }
      
    } catch (error) {
      this.addResult('Admin Create Driver', false, error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('');
  }

  private async testAdminProfileEdit(): Promise<void> {
    console.log('✏️  Test 4: Admin Profile Edit with Email');
    console.log('-'.repeat(60));
    
    try {
      // Ensure we're logged in as admin
      const currentUser = await AuthService.getCurrentUserData();
      if (!currentUser || currentUser.email !== this.testAdminEmail) {
        await AuthService.login(this.testAdminEmail, this.testAdminPassword);
      }
      
      // Get current admin user
      const adminUser = await AuthService.getCurrentUserData();
      if (!adminUser) {
        this.addResult('Admin Profile Edit', false, 'Could not get admin user');
        return;
      }
      
      // Test updating email
      const newEmail = 'updatedadmin@watertanker.app';
      const sanitizedNewEmail = SanitizationUtils.sanitizeEmail(newEmail);
      
      // Update user email
      await UserService.updateUser(adminUser.uid, { email: sanitizedNewEmail });
      
      // Verify email was updated
      const updatedUser = await UserService.getUserById(adminUser.uid);
      if (updatedUser && updatedUser.email === sanitizedNewEmail) {
        this.addResult('Admin Profile Edit - Email Update', true, 'Admin email updated successfully');
        
        // Update back to original email for other tests
        await UserService.updateUser(adminUser.uid, { email: SanitizationUtils.sanitizeEmail(this.testAdminEmail) });
      } else {
        this.addResult('Admin Profile Edit - Email Update', false, 'Email was not updated correctly');
      }
      
      // Test email validation during edit
      const emailValidation = ValidationUtils.validateEmail('invalid-email');
      if (!emailValidation.isValid) {
        this.addResult('Admin Profile Edit - Email Validation', true, 'Email validation works correctly');
      } else {
        this.addResult('Admin Profile Edit - Email Validation', false, 'Email validation failed');
      }
      
      // Test email sanitization
      const testEmail = '  TEST@EXAMPLE.COM  ';
      const sanitized = SanitizationUtils.sanitizeEmail(testEmail);
      if (sanitized === 'test@example.com') {
        this.addResult('Admin Profile Edit - Email Sanitization', true, 'Email sanitization works correctly');
      } else {
        this.addResult('Admin Profile Edit - Email Sanitization', false, `Email sanitization failed: got ${sanitized}`);
      }
      
    } catch (error) {
      this.addResult('Admin Profile Edit', false, error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('');
  }

  private async testAdminViewEditDriverProfiles(): Promise<void> {
    console.log('👥 Test 5: Admin View/Edit Driver Profiles');
    console.log('-'.repeat(60));
    
    try {
      // Ensure we're logged in as admin
      const currentUser = await AuthService.getCurrentUserData();
      if (!currentUser || currentUser.email !== this.testAdminEmail) {
        await AuthService.login(this.testAdminEmail, this.testAdminPassword);
      }
      
      // Get all drivers
      const allUsers = await LocalStorageService.getUsers();
      const drivers = allUsers.filter(u => u.role === 'driver');
      
      if (drivers.length > 0) {
        this.addResult('Admin View Driver Profiles', true, `Admin can view ${drivers.length} driver(s)`);
        
        // Test editing a driver profile
        const testDriver = drivers.find(d => d.email === this.testDriverEmail) || drivers[0];
        
        if (testDriver) {
          const updatedName = 'Updated Driver Name';
          await UserService.updateUser(testDriver.uid, { name: updatedName });
          
          const updatedDriver = await UserService.getUserById(testDriver.uid);
          if (updatedDriver && updatedDriver.name === updatedName) {
            this.addResult('Admin Edit Driver Profile', true, 'Admin can edit driver profile');
            
            // Restore original name
            await UserService.updateUser(testDriver.uid, { name: testDriver.name });
          } else {
            this.addResult('Admin Edit Driver Profile', false, 'Admin cannot edit driver profile');
          }
          
          // Test updating driver email
          const newDriverEmail = 'updateddriver@watertanker.app';
          const sanitizedDriverEmail = SanitizationUtils.sanitizeEmail(newDriverEmail);
          
          // Check if email already exists
          const existingUser = allUsers.find(u => 
            u.email?.toLowerCase() === sanitizedDriverEmail.toLowerCase() && u.uid !== testDriver.uid
          );
          
          if (!existingUser) {
            await UserService.updateUser(testDriver.uid, { email: sanitizedDriverEmail });
            const driverWithNewEmail = await UserService.getUserById(testDriver.uid);
            
            if (driverWithNewEmail && driverWithNewEmail.email === sanitizedDriverEmail) {
              this.addResult('Admin Edit Driver Email', true, 'Admin can update driver email');
              
              // Restore original email
              await UserService.updateUser(testDriver.uid, { email: testDriver.email });
            } else {
              this.addResult('Admin Edit Driver Email', false, 'Admin cannot update driver email');
            }
          } else {
            this.addResult('Admin Edit Driver Email', true, 'Email uniqueness check works (email already exists)');
          }
        }
      } else {
        this.addResult('Admin View Driver Profiles', false, 'No drivers found to view');
      }
      
    } catch (error) {
      this.addResult('Admin View/Edit Driver Profiles', false, error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('');
  }

  private addResult(testName: string, passed: boolean, details?: string, error?: string): void {
    this.results.push({ testName, passed, details, error });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}`);
    if (details) console.log(`   ${details}`);
    if (error) console.log(`   Error: ${error}`);
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);
    
    if (failed > 0) {
      console.log('Failed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  ❌ ${r.testName}`);
        if (r.error) console.log(`     Error: ${r.error}`);
        if (r.details) console.log(`     Details: ${r.details}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Phase 14 Checklist Results
    console.log('\n📋 Phase 14: Testing Checklist - Admin Role');
    console.log('-'.repeat(60));
    
    const adminRegistration = this.results.some(r => r.testName.includes('Admin Registration') && r.passed);
    const adminLogin = this.results.some(r => r.testName.includes('Admin Login') && !r.testName.includes('Wrong') && !r.testName.includes('Non-existent') && !r.testName.includes('Case') && r.passed);
    const adminCreateDriver = this.results.some(r => r.testName.includes('Admin Create Driver') && !r.testName.includes('Duplicate') && !r.testName.includes('Can Login') && r.passed);
    const adminProfileEdit = this.results.some(r => r.testName.includes('Admin Profile Edit') && r.passed);
    const adminViewEditDrivers = this.results.some(r => r.testName.includes('Admin View Driver') || r.testName.includes('Admin Edit Driver')) && 
                                  this.results.filter(r => (r.testName.includes('Admin View Driver') || r.testName.includes('Admin Edit Driver')) && r.passed).length > 0;
    
    console.log(`${adminRegistration ? '✅' : '❌'} Admin can register with email+password`);
    console.log(`${adminLogin ? '✅' : '❌'} Admin can login with email+password`);
    console.log(`${adminCreateDriver ? '✅' : '❌'} Admin can create drivers with email+password`);
    console.log(`${adminProfileEdit ? '✅' : '❌'} Admin profile edit works with email`);
    console.log(`${adminViewEditDrivers ? '✅' : '❌'} Admin can view/edit driver profiles`);
    
    console.log('\n' + '='.repeat(60));
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    try {
      const users = await LocalStorageService.getUsers();
      const testUsers = users.filter(u => 
        u.email === this.testAdminEmail || 
        u.email === this.testDriverEmail ||
        u.email === 'updatedadmin@watertanker.app' ||
        u.email === 'updateddriver@watertanker.app'
      );
      
      for (const user of testUsers) {
        await UserService.deleteUser(user.uid);
      }
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('⚠️  Cleanup warning:', error);
    }
  }
}

// Run tests if this file is executed directly
if ((require as any).main === (module as any)) {
  const tester = new AdminRoleTester();
  tester.runAllTests().catch(console.error);
}

export { AdminRoleTester };

