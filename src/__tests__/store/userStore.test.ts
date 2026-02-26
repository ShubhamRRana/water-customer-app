/**
 * User Store Tests
 */

import { useUserStore } from '../../store/userStore';
import { UserService } from '../../services/user.service';
import { User, UserRole } from '../../types';

// Mock the UserService
jest.mock('../../services/user.service');

describe('useUserStore', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed',
    name: 'Test User',
    role: 'customer',
    createdAt: new Date(),
  };

  const mockDriver: User = {
    id: 'driver-1',
    email: 'driver@example.com',
    password: 'hashed',
    name: 'Test Driver',
    role: 'driver',
    licenseNumber: 'DL123456',
    vehicleNumber: 'ABC123',
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Reset store state before each test
    useUserStore.setState({
      users: [],
      selectedUser: null,
      isLoading: false,
      error: null,
      unsubscribeAllUsers: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useUserStore.getState();

      expect(state.users).toEqual([]);
      expect(state.selectedUser).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.unsubscribeAllUsers).toBeNull();
    });
  });

  describe('fetchAllUsers', () => {
    it('should fetch all users successfully', async () => {
      const users = [mockUser, mockDriver];
      (UserService.getAllUsers as jest.Mock).mockResolvedValue(users);

      await useUserStore.getState().fetchAllUsers();

      const state = useUserStore.getState();
      expect(state.users).toEqual(users);
      expect(state.isLoading).toBe(false);
      expect(UserService.getAllUsers).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      (UserService.getAllUsers as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(useUserStore.getState().fetchAllUsers()).rejects.toThrow('Fetch error');

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('fetchUsersByRole', () => {
    it('should fetch users by role successfully', async () => {
      const drivers = [mockDriver];
      (UserService.getUsersByRole as jest.Mock).mockResolvedValue(drivers);

      await useUserStore.getState().fetchUsersByRole('driver');

      const state = useUserStore.getState();
      expect(state.users).toEqual(drivers);
      expect(state.isLoading).toBe(false);
      expect(UserService.getUsersByRole).toHaveBeenCalledWith('driver');
    });

    it('should handle fetch errors', async () => {
      (UserService.getUsersByRole as jest.Mock).mockRejectedValue(new Error('Fetch error'));

      await expect(
        useUserStore.getState().fetchUsersByRole('driver')
      ).rejects.toThrow('Fetch error');

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Fetch error');
    });
  });

  describe('addUser', () => {
    it('should add user successfully', async () => {
      const newUser = { ...mockUser };
      (UserService.createUser as jest.Mock).mockResolvedValue(newUser);

      await useUserStore.getState().addUser({
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'customer',
      });

      const state = useUserStore.getState();
      expect(state.users).toHaveLength(1);
      expect(state.users[0]).toEqual(newUser);
      expect(state.isLoading).toBe(false);
      expect(UserService.createUser).toHaveBeenCalled();
    });

    it('should handle add user errors', async () => {
      (UserService.createUser as jest.Mock).mockRejectedValue(new Error('Create error'));

      await expect(
        useUserStore.getState().addUser({
          email: 'test@example.com',
          password: 'hashed',
          name: 'Test User',
          role: 'customer',
        })
      ).rejects.toThrow('Create error');

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Create error');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      useUserStore.setState({ users: [mockUser] });
      (UserService.updateUser as jest.Mock).mockResolvedValue(undefined);

      await useUserStore.getState().updateUser('user-1', { name: 'Updated Name' });

      const state = useUserStore.getState();
      expect(state.users[0].name).toBe('Updated Name');
      expect(state.isLoading).toBe(false);
      expect(UserService.updateUser).toHaveBeenCalledWith('user-1', { name: 'Updated Name' });
    });

    it('should handle update errors', async () => {
      useUserStore.setState({ users: [mockUser] });
      (UserService.updateUser as jest.Mock).mockRejectedValue(new Error('Update error'));

      await expect(
        useUserStore.getState().updateUser('user-1', { name: 'Updated Name' })
      ).rejects.toThrow('Update error');

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Update error');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      useUserStore.setState({ users: [mockUser], selectedUser: mockUser });
      (UserService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await useUserStore.getState().deleteUser('user-1');

      const state = useUserStore.getState();
      expect(state.users).toHaveLength(0);
      expect(state.selectedUser).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(UserService.deleteUser).toHaveBeenCalledWith('user-1');
    });

    it('should not clear selectedUser if it is different user', async () => {
      const otherUser: User = {
        id: 'user-2',
        email: 'other@example.com',
        password: 'hashed',
        name: 'Other User',
        role: 'customer',
        createdAt: new Date(),
      };
      useUserStore.setState({ users: [mockUser, otherUser], selectedUser: otherUser });
      (UserService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await useUserStore.getState().deleteUser('user-1');

      const state = useUserStore.getState();
      expect(state.users).toHaveLength(1);
      expect(state.selectedUser).toEqual(otherUser);
    });

    it('should handle delete errors', async () => {
      useUserStore.setState({ users: [mockUser] });
      (UserService.deleteUser as jest.Mock).mockRejectedValue(new Error('Delete error'));

      await expect(
        useUserStore.getState().deleteUser('user-1')
      ).rejects.toThrow('Delete error');

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Delete error');
    });
  });

  describe('subscribeToAllUsers', () => {
    it('should subscribe to all users updates', () => {
      const mockUnsubscribe = jest.fn();
      (UserService.subscribeToAllUsersUpdates as jest.Mock).mockReturnValue(mockUnsubscribe);

      useUserStore.getState().subscribeToAllUsers();

      const state = useUserStore.getState();
      expect(state.unsubscribeAllUsers).toBe(mockUnsubscribe);
      expect(UserService.subscribeToAllUsersUpdates).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should clean up existing subscription before creating new one', () => {
      const oldUnsubscribe = jest.fn();
      useUserStore.setState({ unsubscribeAllUsers: oldUnsubscribe });

      const newUnsubscribe = jest.fn();
      (UserService.subscribeToAllUsersUpdates as jest.Mock).mockReturnValue(newUnsubscribe);

      useUserStore.getState().subscribeToAllUsers();

      expect(oldUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useUserStore.getState().unsubscribeAllUsers).toBe(newUnsubscribe);
    });

    it('should update users when subscription callback is called', () => {
      let callback: ((users: User[]) => void) | undefined;
      (UserService.subscribeToAllUsersUpdates as jest.Mock).mockImplementation((cb) => {
        callback = cb;
        return jest.fn();
      });

      useUserStore.getState().subscribeToAllUsers();

      const updatedUsers = [mockUser, mockDriver];
      callback?.(updatedUsers);

      expect(useUserStore.getState().users).toEqual(updatedUsers);
    });
  });

  describe('unsubscribeFromAllUsers', () => {
    it('should unsubscribe and clear subscription', () => {
      const mockUnsubscribe = jest.fn();
      useUserStore.setState({ unsubscribeAllUsers: mockUnsubscribe });

      useUserStore.getState().unsubscribeFromAllUsers();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(useUserStore.getState().unsubscribeAllUsers).toBeNull();
    });

    it('should handle when no subscription exists', () => {
      useUserStore.setState({ unsubscribeAllUsers: null });

      expect(() => {
        useUserStore.getState().unsubscribeFromAllUsers();
      }).not.toThrow();
    });
  });

  describe('setSelectedUser', () => {
    it('should set selected user', () => {
      useUserStore.getState().setSelectedUser(mockUser);
      expect(useUserStore.getState().selectedUser).toEqual(mockUser);
    });

    it('should set selected user to null', () => {
      useUserStore.getState().setSelectedUser(null);
      expect(useUserStore.getState().selectedUser).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useUserStore.getState().setLoading(true);
      expect(useUserStore.getState().isLoading).toBe(true);

      useUserStore.getState().setLoading(false);
      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      useUserStore.getState().setError('Test error');
      expect(useUserStore.getState().error).toBe('Test error');
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useUserStore.setState({ error: 'Test error' });
      useUserStore.getState().clearError();
      expect(useUserStore.getState().error).toBeNull();
    });
  });
});

