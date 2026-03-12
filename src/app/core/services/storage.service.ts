import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

@Injectable({ providedIn: 'root' })
export class StorageService implements StorageAdapter {
  private readonly prefix = 'fincontrol_';
  private readonly VERSION_KEY = 'fincontrol_version';
  private readonly CURRENT_VERSION = '2';

  /** Emits the unprefixed key whenever data is written or removed. */
  readonly onChange$ = new Subject<string>();

  constructor() {
    // Clear old seed data on version upgrade
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    if (storedVersion !== this.CURRENT_VERSION) {
      this.clear();
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
    }
  }

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(value));
    this.onChange$.next(key);
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
    this.onChange$.next(key);
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}
