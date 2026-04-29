import { useCallback, useEffect, useRef, useState } from 'react';

type RefetchFn = () => Promise<unknown>;

/**
 * Shared `refreshing` + `onRefresh` for {@link RefreshControl} with list/detail refetches.
 */
export function useRefreshControl(
  refetch: RefetchFn,
  options?: { onError?: (error: unknown) => void },
): { refreshing: boolean; onRefresh: () => Promise<void> } {
  const [refreshing, setRefreshing] = useState(false);
  const onErrorRef = useRef(options?.onError);
  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      onErrorRef.current?.(error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
