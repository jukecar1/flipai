import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { gameReducer, newCareerState } from '../game/gameReducer';
import { saveToSlot } from '../game/storage';

const GameStateContext = createContext(null);
const GameDispatchContext = createContext(null);

const BOOT_STATE = { ui: { screen: 'start' } };

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, BOOT_STATE);

  return (
    <GameStateContext.Provider value={state}>
      <GameDispatchContext.Provider value={dispatch}>{children}</GameDispatchContext.Provider>
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameProvider');
  return ctx;
}

export function useGameDispatch() {
  const ctx = useContext(GameDispatchContext);
  if (!ctx) throw new Error('useGameDispatch must be used within GameProvider');
  return ctx;
}

export function useGameActions() {
  const dispatch = useGameDispatch();

  const startNewCareer = useCallback(
    (slot, { managerName, promotionName, hq, selectedFighters }) => {
      const state = newCareerState({ managerName, promotionName, hq, selectedFighters });
      state.slot = slot;
      dispatch({ type: 'LOAD_STATE', state });
    },
    [dispatch]
  );

  const loadCareer = useCallback(
    (slot, state) => {
      dispatch({ type: 'LOAD_STATE', state: { ...state, slot } });
    },
    [dispatch]
  );

  const goTo = useCallback((screen, params) => dispatch({ type: 'SET_SCREEN', screen, params }), [dispatch]);

  const backToStart = useCallback(() => dispatch({ type: 'LOAD_STATE', state: BOOT_STATE }), [dispatch]);

  return { startNewCareer, loadCareer, goTo, backToStart };
}

export function persistCurrentState(state) {
  if (typeof state.slot === 'number') {
    saveToSlot(state.slot, state);
  }
}
