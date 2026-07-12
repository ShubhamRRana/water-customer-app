/**
 * Customer individual vs society login enforcement (AuthService.login 4th argument).
 */
import { AuthService } from '../../services/auth.service';
import { ERROR_MESSAGES } from '../../constants/config';
import { dataAccess } from '../../lib/index';

const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockFrom = jest.fn();

jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...a: unknown[]) => mockSignIn(...a),
      signOut: (...a: unknown[]) => mockSignOut(...a),
      getSession: (...a: unknown[]) => mockGetSession(...a),
    },
    from: (...a: unknown[]) => mockFrom(...a),
  },
}));

jest.mock('../../lib/index', () => ({
  dataAccess: {
    subscriptions: {
      hasActiveSubscription: jest.fn().mockResolvedValue(false),
      getUserSubscription: jest.fn().mockResolvedValue(null),
    },
  },
}));

describe('AuthService customer account kind', () => {
  const userId = 'u1';
  const email = 'c@test.com';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    jest.spyOn(dataAccess.subscriptions, 'hasActiveSubscription').mockResolvedValue(false);
    jest.spyOn(dataAccess.subscriptions, 'getUserSubscription').mockResolvedValue(null);
  });

  function setupSupabaseMocks(accountKind: 'individual' | 'society') {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: userId, email },
        session: { user: { id: userId, user_metadata: {} } },
      },
      error: null,
    });

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: userId, user_metadata: {} },
        },
      },
      error: null,
    });

    const userRolesQb = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ role: 'customer' }],
          error: null,
        }),
      }),
    };

    const userRow = {
      id: userId,
      email,
      name: 'T',
      phone: '1234567890',
      created_at: new Date().toISOString(),
    };
    const usersQb = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: userRow,
            error: null,
          }),
        }),
      }),
    };

    const customerRow = {
      user_id: userId,
      saved_addresses: [],
      account_kind: accountKind,
    };

    const customersQb = {
      select: jest.fn().mockImplementation((cols: string) => {
        if (cols === 'account_kind') {
          return {
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { account_kind: accountKind },
                error: null,
              }),
            }),
          };
        }
        return {
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: customerRow,
              error: null,
            }),
          }),
        };
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_roles') return userRolesQb;
      if (table === 'users') return usersQb;
      if (table === 'customers') return customersQb;
      return usersQb;
    });
  }

  it('allows login when expected kind matches DB (individual)', async () => {
    setupSupabaseMocks('individual');
    const result = await AuthService.login(email, 'pw', 'customer', 'individual');
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe('customer');
  });

  it('allows login when expected kind matches DB (society)', async () => {
    setupSupabaseMocks('society');
    const result = await AuthService.login(email, 'pw', 'customer', 'society');
    expect(result.success).toBe(true);
  });

  it('rejects login when DB is individual but society screen expected', async () => {
    setupSupabaseMocks('individual');
    const result = await AuthService.login(email, 'pw', 'customer', 'society');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.auth.roleMismatch);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('rejects login when DB is society but individual screen expected', async () => {
    setupSupabaseMocks('society');
    const result = await AuthService.login(email, 'pw', 'customer', 'individual');
    expect(result.success).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.auth.roleMismatch);
  });

  it('getCustomerAccountKind returns resolved kind', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: userId, user_metadata: {} } } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { account_kind: 'society' },
            error: null,
          }),
        }),
      }),
    });
    await expect(AuthService.getCustomerAccountKind(userId)).resolves.toBe('society');
  });

  it('heals DB from auth metadata when society signup was stored as individual', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        user: { id: userId, email },
        session: {
          user: {
            id: userId,
            user_metadata: { customer_account_kind: 'society' },
          },
        },
      },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: userId,
            user_metadata: { customer_account_kind: 'society' },
          },
        },
      },
      error: null,
    });

    const userRolesQb = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ role: 'customer' }],
          error: null,
        }),
      }),
    };
    const userRow = {
      id: userId,
      email,
      name: 'T',
      phone: '1234567890',
      created_at: new Date().toISOString(),
    };
    const usersQb = {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: userRow,
            error: null,
          }),
        }),
      }),
    };

    const updateEq = jest.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = jest.fn().mockReturnValue({ eq: updateEq });
    let accountKindReads = 0;
    const customersQb = {
      select: jest.fn().mockImplementation((cols: string) => {
        if (cols === 'account_kind') {
          return {
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockImplementation(async () => {
                accountKindReads += 1;
                // First read is pre-heal (wrong individual); after update, treat as society
                if (accountKindReads === 1) {
                  return { data: { account_kind: 'individual' }, error: null };
                }
                return { data: { account_kind: 'society' }, error: null };
              }),
            }),
          };
        }
        return {
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: userId,
                saved_addresses: [],
                account_kind: 'individual',
              },
              error: null,
            }),
          }),
        };
      }),
      update: updateFn,
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_roles') return userRolesQb;
      if (table === 'users') return usersQb;
      if (table === 'customers') return customersQb;
      return usersQb;
    });

    const result = await AuthService.login(email, 'pw', 'customer', 'society');
    expect(result.success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith({ account_kind: 'society' });
    expect(updateEq).toHaveBeenCalledWith('user_id', userId);
  });
});
