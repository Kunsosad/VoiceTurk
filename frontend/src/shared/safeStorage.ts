// Safe localStorage wrapper with memory fallback to avoid SecurityError inside iframes

class SafeStorage {
  private memoryStore = new Map<string, string>();
  private isLocalStorageAvailable = false;

  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Test localStorage write/read
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        this.isLocalStorageAvailable = true;
      }
    } catch (e) {
      this.isLocalStorageAvailable = false;
      console.warn('localStorage is blocked or unavailable. Falling back to in-memory store.', e);
    }
  }

  getItem(key: string): string | null {
    if (this.isLocalStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        // Fallback if it starts throwing at runtime
        return this.memoryStore.get(key) || null;
      }
    }
    return this.memoryStore.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        // Fallback
      }
    }
    this.memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        // Fallback
      }
    }
    this.memoryStore.delete(key);
  }
}

export const safeStorage = new SafeStorage();
