import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'flip-airways-save-v1';

export async function saveGame(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export async function loadGame() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearSave() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    // ignore
  }
}
