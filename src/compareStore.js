import { createStore } from './store';

// Compare: up to three items shown side by side.
export const MAX_COMPARE = 3;
const s = createStore('royal_compare', MAX_COMPARE);
export const useCompare = s.useStore;
export const compareFullEvent = s.fullEvent;
