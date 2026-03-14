import { Injectable, signal, computed } from '@angular/core';
import { Account, AccountType } from '../models/account.model';
import { StorageService } from './storage.service';

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

  readonly checkingAccounts = computed(() =>
    this.accountsSignal().filter(a => (a.type ?? 'checking') === 'checking')
  );

  readonly savingsAccounts = computed(() =>
    this.accountsSignal().filter(a => (a.type ?? 'checking') === 'savings')
  );

  readonly investmentAccounts = computed(() =>
    this.accountsSignal().filter(a => (a.type ?? 'checking') === 'investment')
  );

  readonly allInvestmentAccounts = computed(() =>
    this.accountsSignal().filter(a => {
      const type = a.type ?? 'checking';
      return type === 'savings' || type === 'investment';
    })
  );

  constructor(private storage: StorageService) {
    this.load();
  }

  private load(): void {
    const stored = this.storage.get<Account[]>(this.STORAGE_KEY);
    if (stored) {
      // Backward compat: ensure all accounts have a type
      const migrated = stored.map(a => ({ ...a, type: a.type ?? 'checking' as AccountType }));
      this.accountsSignal.set(migrated);
    } else {
      this.accountsSignal.set([]);
    }
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.accountsSignal());
  }

  loadFromData(accounts: Account[]): void {
    // Backward compat: ensure all accounts have a type
    const migrated = accounts.map(a => ({ ...a, type: a.type ?? 'checking' as AccountType }));
    this.accountsSignal.set(migrated);
    this.save();
  }

  selectAccount(id: string | null): void {
    this.selectedAccountIdSignal.set(id);
  }

  getById(id: string): Account | undefined {
    return this.accountsSignal().find(a => a.id === id);
  }

  getChildAccounts(parentId: string): Account[] {
    return this.accountsSignal().filter(a => a.parentAccountId === parentId);
  }

  isSavingsOrInvestment(accountId: string): boolean {
    const account = this.getById(accountId);
    if (!account) return false;
    const type = account.type ?? 'checking';
    return type === 'savings' || type === 'investment';
  }

  add(account: Omit<Account, 'id' | 'createdAt'>): Account {
    const newAcc: Account = {
      ...account,
      type: account.type ?? 'checking',
      id: 'acc-' + crypto.randomUUID(),
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
    // Also delete child accounts (savings/investments linked to this account)
    const children = this.getChildAccounts(id);
    const idsToDelete = [id, ...children.map(c => c.id)];
    this.accountsSignal.update(accs => accs.filter(a => !idsToDelete.includes(a.id)));
    if (idsToDelete.includes(this.selectedAccountIdSignal() ?? '')) {
      this.selectedAccountIdSignal.set(null);
    }
    this.save();
  }
}
