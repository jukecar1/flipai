import { createStore } from './store';
import { getProduct } from './products';

// "My list": items a visitor saves to bring up with the store.
const s = createStore('royal_my_list', Infinity, (id) => !!getProduct(id));
export const useList = s.useStore;
export const readList = s.read;
