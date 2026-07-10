/**
 * Root route sync tests
 * Guards against resetting the root navigator based on the deepest focused
 * route (e.g. "SavedAddresses") instead of the root-level route ("Main"/"Auth").
 * Regression: saving an address replaced the auth user object, App.tsx compared
 * "SavedAddresses" !== "Main" and reset the stack, kicking the user to Home
 * behind the "Checking subscription..." gate overlay.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { syncRootRoute } from '../../navigation/rootNavigation';

type FakeNav = {
  getRootState: jest.Mock;
  reset: jest.Mock;
};

const makeNav = (rootRouteName: string | undefined): FakeNav => ({
  getRootState: jest.fn().mockReturnValue(
    rootRouteName === undefined
      ? undefined
      : {
          index: 0,
          routes: [{ name: rootRouteName }],
        }
  ),
  reset: jest.fn(),
});

describe('syncRootRoute', () => {
  let nav: FakeNav;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not reset when the root route already matches, even while a nested screen is focused', () => {
    // Root stack is on "Main"; the deepest focused route may be SavedAddresses,
    // but that must not matter.
    nav = makeNav('Main');

    syncRootRoute(nav as never, 'Main');

    expect(nav.reset).not.toHaveBeenCalled();
  });

  it('resets to Auth when the user logs out while on Main', () => {
    nav = makeNav('Main');

    syncRootRoute(nav as never, 'Auth');

    expect(nav.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  });

  it('resets to Main when a customer logs in from Auth', () => {
    nav = makeNav('Auth');

    syncRootRoute(nav as never, 'Main');

    expect(nav.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  });

  it('resets when the root state is not yet available', () => {
    nav = makeNav(undefined);

    syncRootRoute(nav as never, 'Main');

    expect(nav.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  });
});
