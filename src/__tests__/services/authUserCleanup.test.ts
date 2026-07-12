/**
 * Auth user cleanup after account deletion — ensures Auth is removed and failures surface.
 */
import { AuthService } from '../../services/auth.service';
import { deleteAuthUserAfterAccountDeletion } from '../../services/authUserCleanup';
import { dataAccess } from '../../lib/index';
import { supabase } from '../../lib/supabaseClient';

const mockInvoke = jest.fn();
const mockGetSession = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => mockGetSession(...a),
      signOut: (...a: unknown[]) => mockSignOut(...a),
    },
    functions: {
      invoke: (...a: unknown[]) => mockInvoke(...a),
    },
    from: jest.fn(),
  },
}));

jest.mock('../../lib/index', () => ({
  dataAccess: {
    users: {
      deleteCustomerAccount: jest.fn(),
      deleteAdminAccount: jest.fn(),
      getUserById: jest.fn(),
    },
  },
}));

describe('deleteAuthUserAfterAccountDeletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes the delete-auth-user edge function', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    await deleteAuthUserAfterAccountDeletion('user-1');

    expect(mockInvoke).toHaveBeenCalledWith('delete-auth-user-on-account-deletion', {
      body: { user_id: 'user-1' },
    });
  });

  it('throws when the edge function returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Auth cleanup failed' } });

    await expect(deleteAuthUserAfterAccountDeletion('user-1')).rejects.toThrow(
      'Auth cleanup failed',
    );
  });
});

describe('AuthService.deleteCustomerAccount auth cleanup', () => {
  const customerId = 'cust-1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: customerId } } },
      error: null,
    });
    (dataAccess.users.deleteCustomerAccount as jest.Mock).mockResolvedValue(undefined);
    // fetchUserWithRole path uses from() — stub via getUserById if AuthService uses dataAccess
  });

  it('returns failure when Auth cleanup fails after profile delete', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: customerId,
                  email: 'c@test.com',
                  name: 'C',
                  phone: null,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ role: 'customer', user_id: customerId }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { saved_addresses: [], account_kind: 'individual' },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: jest.fn() };
    });

    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Auth cleanup failed' } });

    const result = await AuthService.deleteCustomerAccount(customerId);

    expect(dataAccess.users.deleteCustomerAccount).toHaveBeenCalledWith(customerId);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Auth cleanup failed|Failed to remove authentication/i);
  });
});
