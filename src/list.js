import { createStore } from './store';

// "My list": items a visitor saves to bring up with the store.
const s = createStore('royal_my_list');
export const useList = s.useStore;
export const readList = s.read;
