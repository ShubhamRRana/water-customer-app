// src/services/bankAccount.service.ts

import { dataAccess } from '../lib/index';
import { BankAccount } from '../types/index';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';

/**
 * BankAccountService - Handles bank account management operations for admin users
 * 
 * Uses dataAccess layer for data persistence.
 * All operations are scoped to the specific admin user.
 */
export class BankAccountService {
  /**
   * Get all bank accounts for a specific admin user
   */
  static async getAllBankAccounts(adminId: string): Promise<BankAccount[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const accounts = await dataAccess.bankAccounts.getBankAccounts(adminId);
        return accounts;
      },
      {
        context: { operation: 'getAllBankAccounts', adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Get a single bank account by id (only if it belongs to the admin)
   */
  static async getBankAccountById(id: string, adminId: string): Promise<BankAccount | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const account = await dataAccess.bankAccounts.getBankAccountById(id, adminId);
        return account;
      },
      {
        context: { operation: 'getBankAccountById', id, adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Get the default bank account for a specific admin user
   */
  static async getDefaultBankAccount(adminId: string): Promise<BankAccount | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const account = await dataAccess.bankAccounts.getDefaultBankAccount(adminId);
        return account;
      },
      {
        context: { operation: 'getDefaultBankAccount', adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Create a new bank account for a specific admin user
   * If isDefault is true, this will automatically unset all other accounts for that admin as default
   */
  static async createBankAccount(accountData: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt' | 'adminId'>, adminId: string): Promise<BankAccount> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const id = dataAccess.generateId();
        const newAccount: BankAccount = {
          ...accountData,
          adminId,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // saveBankAccount handles unsetting other defaults if isDefault is true
        await dataAccess.bankAccounts.saveBankAccount(newAccount, adminId);
        return newAccount;
      },
      {
        context: { operation: 'createBankAccount', adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Update bank account by id (only if it belongs to the admin)
   */
  static async updateBankAccount(id: string, updates: Partial<BankAccount>, adminId: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.bankAccounts.updateBankAccount(id, updates, adminId);
      },
      {
        context: { operation: 'updateBankAccount', id, adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Delete bank account by id (only if it belongs to the admin)
   */
  static async deleteBankAccount(id: string, adminId: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.bankAccounts.deleteBankAccount(id, adminId);
      },
      {
        context: { operation: 'deleteBankAccount', id, adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Set a bank account as default for a specific admin
   * This will automatically unset all other accounts for that admin as default
   */
  static async setDefaultBankAccount(id: string, adminId: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.bankAccounts.updateBankAccount(id, { isDefault: true }, adminId);
      },
      {
        context: { operation: 'setDefaultBankAccount', id, adminId },
        userFacing: false,
      }
    );
  }
}

