import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// A single shared "open this fighter's profile" popup, mounted once at the
// app root (see App.js) so every screen can pop the same mini-profile
// modal on any fighter — your own roster, a rival's champion, a free
// agent, an amateur prospect — just by calling open(fighter) on a click,
// instead of every screen re-implementing its own modal state.
const FighterProfileContext = createContext(null);

export function FighterProfileProvider({ children }) {
  const [fighterId, setFighterId] = useState(null);

  const open = useCallback(fighterOrId => {
    setFighterId(typeof fighterOrId === 'string' ? fighterOrId : fighterOrId?.id || null);
  }, []);
  const close = useCallback(() => setFighterId(null), []);

  const value = useMemo(() => ({ fighterId, open, close }), [fighterId, open, close]);

  return <FighterProfileContext.Provider value={value}>{children}</FighterProfileContext.Provider>;
}

export function useFighterProfile() {
  const ctx = useContext(FighterProfileContext);
  if (!ctx) throw new Error('useFighterProfile must be used within FighterProfileProvider');
  return ctx;
}
