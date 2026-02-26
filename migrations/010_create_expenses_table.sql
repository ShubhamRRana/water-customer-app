-- Migration: Create expenses table for admin expense tracking
-- Purpose: Enable admins to track diesel and maintenance expenses
-- Date: 2025

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admins(user_id) ON DELETE CASCADE,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('diesel', 'maintenance')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  expense_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on admin_id for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_admin_id ON expenses(admin_id);

-- Create index on expense_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- Create index on expense_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type ON expenses(expense_type);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read their own expenses
CREATE POLICY "Admins can read their own expenses"
ON expenses
FOR SELECT
TO authenticated
USING (
  has_role('admin')
  AND admin_id = auth.uid()
);

-- Policy: Admins can insert their own expenses
CREATE POLICY "Admins can insert their own expenses"
ON expenses
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('admin')
  AND admin_id = auth.uid()
);

-- Policy: Admins can update their own expenses
CREATE POLICY "Admins can update their own expenses"
ON expenses
FOR UPDATE
TO authenticated
USING (
  has_role('admin')
  AND admin_id = auth.uid()
)
WITH CHECK (
  has_role('admin')
  AND admin_id = auth.uid()
);

-- Policy: Admins can delete their own expenses
CREATE POLICY "Admins can delete their own expenses"
ON expenses
FOR DELETE
TO authenticated
USING (
  has_role('admin')
  AND admin_id = auth.uid()
);

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Tracks diesel and maintenance expenses for admin users';
COMMENT ON COLUMN expenses.expense_type IS 'Type of expense: diesel or maintenance';
COMMENT ON COLUMN expenses.amount IS 'Expense amount in rupees, must be greater than 0';
COMMENT ON COLUMN expenses.expense_date IS 'Date when the expense occurred';
