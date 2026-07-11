/// <reference types="jest" />

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileSubscriptionPanel from '../../../components/customer/ProfileSubscriptionPanel';
import { SubscriptionService } from '../../../services/subscription.service';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

jest.mock('../../../hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    accent: '#ffc300',
    surface: '#1a222c',
    surfaceLight: '#222',
    text: '#fff',
    textSecondary: '#8a9199',
    success: '#34d399',
    warning: '#f59e0b',
    error: '#ef4444',
    border: '#2a3544',
  }),
}));

jest.mock('../../../utils/subscriptionGating', () => ({
  isSubscriptionGatingEnabled: jest.fn(() => true),
}));

jest.mock('../../../services/subscription.service', () => ({
  SubscriptionService: {
    getUserSubscription: jest.fn(),
    getPlanById: jest.fn(),
  },
}));

describe('ProfileSubscriptionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { isSubscriptionGatingEnabled } = require('../../../utils/subscriptionGating');
    isSubscriptionGatingEnabled.mockReturnValue(true);
  });

  it('renders nothing when gating disabled', async () => {
    const { isSubscriptionGatingEnabled } = require('../../../utils/subscriptionGating');
    isSubscriptionGatingEnabled.mockReturnValue(false);
    const { queryByText } = render(<ProfileSubscriptionPanel userId="u1" />);
    await waitFor(() => {
      expect(queryByText(/Your plan/i)).toBeNull();
    });
  });

  it('shows active plan and navigates Details', async () => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    (SubscriptionService.getUserSubscription as jest.Mock).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      planId: 'p1',
      status: 'active',
      endDate: end,
    });
    (SubscriptionService.getPlanById as jest.Mock).mockResolvedValue({
      id: 'p1',
      name: 'Individual Monthly',
    });

    const { getByText } = render(<ProfileSubscriptionPanel userId="u1" />);
    await waitFor(() => expect(getByText('Individual Monthly')).toBeTruthy());
    expect(getByText('Active')).toBeTruthy();
    fireEvent.press(getByText('Details'));
    expect(mockNavigate).toHaveBeenCalledWith('SubscriptionStatus');
  });

  it('shows View plans when no subscription', async () => {
    (SubscriptionService.getUserSubscription as jest.Mock).mockResolvedValue(null);
    const { getByText } = render(<ProfileSubscriptionPanel userId="u1" />);
    await waitFor(() => expect(getByText(/No active plan/i)).toBeTruthy());
    fireEvent.press(getByText('View plans'));
    expect(mockNavigate).toHaveBeenCalledWith('SubscriptionPlans');
  });

  it('shows retry when load fails', async () => {
    (SubscriptionService.getUserSubscription as jest.Mock).mockRejectedValue(new Error('fail'));
    const { getByText } = render(<ProfileSubscriptionPanel userId="u1" />);
    await waitFor(() => expect(getByText(/Couldn't load plan/i)).toBeTruthy());
    expect(getByText('Retry')).toBeTruthy();
  });

  it('shows trial message, end date, and View plans', async () => {
    const trialEnd = new Date('2026-08-01T00:00:00Z');
    (SubscriptionService.getUserSubscription as jest.Mock).mockResolvedValue({
      id: 's1',
      userId: 'u1',
      planId: 'p1',
      status: 'active',
      isTrial: true,
      trialEndDate: trialEnd,
      endDate: trialEnd,
    });
    (SubscriptionService.getPlanById as jest.Mock).mockResolvedValue({
      id: 'p1',
      name: 'Free Trial',
    });

    const { getByText, queryByText } = render(<ProfileSubscriptionPanel userId="u1" />);
    await waitFor(() => expect(getByText(/trial subscription/i)).toBeTruthy());
    expect(getByText('Trial')).toBeTruthy();
    expect(getByText(/Trial ends on/i)).toBeTruthy();
    expect(getByText('View plans')).toBeTruthy();
    expect(queryByText('Renew')).toBeNull();
    fireEvent.press(getByText('View plans'));
    expect(mockNavigate).toHaveBeenCalledWith('SubscriptionPlans');
  });
});
