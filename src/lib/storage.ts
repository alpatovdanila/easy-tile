/**
 * Local storage utilities with type safety and error handling
 */

export function saveToStorage<T>(key: string, data: T): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded');
    } else {
      console.error('Failed to save to localStorage:', error);
    }
  }
}

export function loadFromStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

export function clearStorage(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

// Storage keys
export const STORAGE_KEYS = {
  ROOM: 'easy-tile:room',
  WALLS: 'easy-tile:walls',
  SCENE: 'easy-tile:scene',
  SELECTED_WALL: 'easy-tile:selected-wall',
} as const;

