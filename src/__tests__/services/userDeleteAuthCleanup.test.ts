/**
 * UserService.deleteUser must remove Auth after deleting app profile data.
 */
import { UserService } from '../../services/user.service';
import { deleteAuthUserAfterAccountDeletion } from '../../services/authUserCleanup';
import { dataAccess } from '../../lib/index';

jest.mock('../../services/authUserCleanup', () => ({
  deleteAuthUserAfterAccountDeletion: jest.fn(),
}));

jest.mock('../../lib/index', () => ({
  dataAccess: {
    users: {
      getUserById: jest.fn(),
      deleteCustomerAccount: jest.fn(),
      deleteDriverAccount: jest.fn(),
      deleteAdminAccount: jest.fn(),
    },
  },
}));

const mockCleanup = deleteAuthUserAfterAccountDeletion as jest.Mock;

describe('UserService.deleteUser auth cleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCleanup.mockResolvedValue(undefined);
  });

  it('deletes customer profile then removes Auth user', async () => {
    (dataAccess.users.getUserById as jest.Mock).mockResolvedValue({
      id: 'c1',
      email: 'c@test.com',
      name: 'C',
      role: 'customer',
      phone: '1',
      createdAt: new Date(),
      savedAddresses: [],
    });
    (dataAccess.users.deleteCustomerAccount as jest.Mock).mockResolvedValue(undefined);

    await UserService.deleteUser('c1');

    expect(dataAccess.users.deleteCustomerAccount).toHaveBeenCalledWith('c1');
    expect(mockCleanup).toHaveBeenCalledWith('c1');
  });

  it('throws when Auth cleanup fails', async () => {
    (dataAccess.users.getUserById as jest.Mock).mockResolvedValue({
      id: 'c1',
      email: 'c@test.com',
      name: 'C',
      role: 'customer',
      phone: '1',
      createdAt: new Date(),
      savedAddresses: [],
    });
    (dataAccess.users.deleteCustomerAccount as jest.Mock).mockResolvedValue(undefined);
    mockCleanup.mockRejectedValue(new Error('Auth cleanup failed'));

    await expect(UserService.deleteUser('c1')).rejects.toThrow('Auth cleanup failed');
  });

  it('does not call Auth cleanup when user is not found', async () => {
    (dataAccess.users.getUserById as jest.Mock).mockResolvedValue(null);

    await expect(UserService.deleteUser('missing')).rejects.toThrow('User not found');
    expect(mockCleanup).not.toHaveBeenCalled();
  });
});
