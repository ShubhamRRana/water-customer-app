// src/services/expense.service.ts

import { dataAccess } from '../lib/index';
import { Expense } from '../types/index';
import { handleAsyncOperationWithRethrow } from '../utils/errorHandler';

/**
 * ExpenseService - Handles expense management operations for admin users
 * 
 * Uses dataAccess layer for data persistence.
 * All operations are scoped to the specific admin user.
 */
export class ExpenseService {
  /**
   * Get all expenses for a specific admin user
   */
  static async getAllExpenses(adminId: string): Promise<Expense[]> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const expenses = await dataAccess.expenses.getExpenses(adminId);
        return expenses;
      },
      {
        context: { operation: 'getAllExpenses', adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Get a single expense by id (only if it belongs to the admin)
   */
  static async getExpenseById(id: string, adminId: string): Promise<Expense | null> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const expense = await dataAccess.expenses.getExpenseById(id, adminId);
        return expense;
      },
      {
        context: { operation: 'getExpenseById', id, adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Create a new expense for a specific admin user
   */
  static async createExpense(expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'adminId'>, adminId: string): Promise<Expense> {
    return handleAsyncOperationWithRethrow(
      async () => {
        const id = dataAccess.generateId();
        const newExpense: Expense = {
          ...expenseData,
          adminId,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await dataAccess.expenses.saveExpense(newExpense, adminId);
        return newExpense;
      },
      {
        context: { operation: 'createExpense', adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Update expense by id (only if it belongs to the admin)
   */
  static async updateExpense(id: string, updates: Partial<Expense>, adminId: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.expenses.updateExpense(id, updates, adminId);
      },
      {
        context: { operation: 'updateExpense', id, adminId },
        userFacing: false,
      }
    );
  }

  /**
   * Delete expense by id (only if it belongs to the admin)
   */
  static async deleteExpense(id: string, adminId: string): Promise<void> {
    return handleAsyncOperationWithRethrow(
      async () => {
        await dataAccess.expenses.deleteExpense(id, adminId);
      },
      {
        context: { operation: 'deleteExpense', id, adminId },
        userFacing: false,
      }
    );
  }
}
