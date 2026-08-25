import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMoneyPulse, getProjection } from '../components/rest/expenseTrackerApis';

/**
 * One shared read of the forward-looking money state (projection + pulse) for
 * the whole app, so the Financial Weather layer and any screen can show the
 * same climate without each refetching. Fetched once when the shell mounts,
 * refreshable after a mutation. Degrades silently: if the endpoints are absent
 * (e.g. before the projection backend is deployed), values stay null and the
 * weather layer simply doesn't render.
 */
const MoneyContext = createContext({ projection: null, pulse: null, loading: true, refresh: () => {} });

export function MoneyProvider({ children }) {
  const [projection, setProjection] = useState(null);
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [pr, pl] = await Promise.allSettled([getProjection(30), getMoneyPulse()]);
    if (pr.status === 'fulfilled') setProjection(pr.value);
    if (pl.status === 'fulfilled') setPulse(pl.value);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <MoneyContext.Provider value={{ projection, pulse, loading, refresh }}>
      {children}
    </MoneyContext.Provider>
  );
}

export function useMoney() { return useContext(MoneyContext); }
