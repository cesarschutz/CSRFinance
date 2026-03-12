import { Injectable, signal, computed } from '@angular/core';
import { Account } from '../models/account.model';
import { StorageService } from './storage.service';
import { SEED_ACCOUNTS } from '../seed-data';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly STORAGE_KEY = 'accounts';
  private accountsSignal = signal<Account[]>([]);
  private selectedAccountIdSignal = signal<string | null>(null);

  readonly accounts = this.accountsSignal.asReadonly();
  readonly selectedAccountId = this.selectedAccountIdSignal.asReadonly();

  readonly selectedAccount = computed(() => {
    const id = this.selectedAccountIdSignal();
    if (!id) return null;
    return this.accountsSignal().find(a => a.id === id) ?? null;
  });

  constructor(private storage: StorageService) {
    this.load();
  }

  private load(): void {
    const stored = this.storage.get<Account[]>(this.STORAGE_KEY);
    if (stored && stored.length > 0) {
      this.accountsSignal.set(stored);
    } else {
      this.accountsSignal.set(SEED_ACCOUNTS);
      this.save();
    }
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.accountsSignal());
  }

  selectAccount(id: string | null): void {
    this.selectedAccountIdSignal.set(id);
  }

  getById(id: string): Account | undefined {
    return this.accountsSignal().find(a => a.id === id);
  }

  add(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const newAcc: Account = {
      ...account,
      id: 'acc-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.accountsSignal.update(accs => [...accs, newAcc]);
    this.save();
    return newAcc;
  }

  update(id: string, changes: Partial<Account>): void {
    this.accountsSignal.update(accs =>
      accs.map(a => (a.id === id ? { ...a, ...changes } : a))
    );
    this.save();
  }

  delete(id: string): void {
    this.accountsSignal.update(accs => accs.filter(a => a.id !== id));
    if (this.selectedAccountIdSignal() === id) {
      this.selectedAccountIdSignal.set(null);
    }
    this.save();
  }
}
