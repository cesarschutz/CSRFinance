import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionType } from '../models/transaction.model';
import { StorageService } from './storage.service';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly STORAGE_KEY = 'transactions';
  private transactionsSignal = signal<Transaction[]>([]);

  readonly transactions = this.transactionsSignal.asReadonly();

  /** Reactive balance per account. Recalculates when transactions or accounts change. */
  readonly accountBalances = computed(() => {
    const txns = this.transactionsSignal();
    const accounts = this.accountService.accounts();
    const balances = new Map<string, number>();

    for (const acc of accounts) {
      const accTxns = txns.filter(t => t.accountId === acc.id);
      const balance = accTxns.reduce((sum, t) => {
        if (t.type === 'transfer') {
          return t.transferAccountId === acc.id ? sum + t.amount : sum - t.amount;
        }
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, acc.initialBalance);
      balances.set(acc.id, balance);
    }
    return balances;
  });

  /** Reactive total balance across all accounts. */
  readonly totalBalance = computed(() => {
    const balances = this.accountBalances();
    let total = 0;
    balances.forEach(v => total += v);
    return total;
  });

  constructor(
    private storage: StorageService,
    private accountService: AccountService,
  ) {
    this.load();
  }

  private load(): void {
    const stored = this.storage.get<Transaction[]>(this.STORAGE_KEY);
    this.transactionsSignal.set(stored ?? []);
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.transactionsSignal());
  }

  loadFromData(transactions: Transaction[]): void {
    this.transactionsSignal.set(transactions);
    this.save();
  }

  getByMonth(year: number, month: number, accountId?: string | null): Transaction[] {
    return this.transactionsSignal().filter(t => {
      const d = new Date(t.date);
      const matchMonth = d.getFullYear() === year && d.getMonth() === month;
      const matchAccount = !accountId || t.accountId === accountId;
      return matchMonth && matchAccount;
    });
  }

  getByDateRange(startDate: string, endDate: string, accountId?: string | null): Transaction[] {
    return this.transactionsSignal().filter(t => {
      const matchDate = t.date >= startDate && t.date <= endDate;
      const matchAccount = !accountId || t.accountId === accountId;
      return matchDate && matchAccount;
    });
  }

  getByAccount(accountId: string): Transaction[] {
    return this.transactionsSignal().filter(t => t.accountId === accountId);
  }

  getSummary(year: number, month: number, accountId?: string | null): {
    income: number;
    expense: number;
    balance: number;
  } {
    const txns = this.getByMonth(year, month, accountId);
    const income = txns
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = txns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }

  getAccountBalance(accountId: string): number {
    return this.accountBalances().get(accountId) ?? 0;
  }

  getTotalBalance(): number {
    return this.totalBalance();
  }

  add(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTxn: Transaction = {
      ...transaction,
      id: 'txn-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.transactionsSignal.update(txns => [...txns, newTxn]);
    this.save();
    return newTxn;
  }

  addTransfer(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description: string;
  }): void {
    const transferId = 'trf-' + Date.now();
    const now = new Date().toISOString();

    const outgoing: Transaction = {
      id: 'txn-' + Date.now(),
      description: data.description,
      amount: data.amount,
      type: 'transfer',
      categoryId: '',
      accountId: data.fromAccountId,
      transferAccountId: data.toAccountId,
      transferId,
      date: data.date,
      status: 'settled',
      createdAt: now,
    };

    const incoming: Transaction = {
      id: 'txn-' + (Date.now() + 1),
      description: data.description,
      amount: data.amount,
      type: 'transfer',
      categoryId: '',
      accountId: data.toAccountId,
      transferAccountId: data.fromAccountId,
      transferId,
      date: data.date,
      status: 'settled',
      createdAt: now,
    };

    this.transactionsSignal.update(txns => [...txns, outgoing, incoming]);
    this.save();
  }

  deleteTransfer(transferId: string): void {
    this.transactionsSignal.update(txns =>
      txns.filter(t => t.transferId !== transferId)
    );
    this.save();
  }

  update(id: string, changes: Partial<Transaction>): void {
    this.transactionsSignal.update(txns =>
      txns.map(t => (t.id === id ? { ...t, ...changes } : t))
    );
    this.save();
  }

  delete(id: string): void {
    this.transactionsSignal.update(txns => txns.filter(t => t.id !== id));
    this.save();
  }

  getExpensesByCategory(year: number, month: number, accountId?: string | null): Map<string, number> {
    const txns = this.getByMonth(year, month, accountId).filter(t => t.type === 'expense');
    const map = new Map<string, number>();
    txns.forEach(t => {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    });
    return map;
  }

  getDailyExpenses(year: number, month: number, accountId?: string | null): Map<string, number> {
    const txns = this.getByMonth(year, month, accountId).filter(t => t.type === 'expense');
    const map = new Map<string, number>();
    txns.forEach(t => {
      map.set(t.date, (map.get(t.date) ?? 0) + t.amount);
    });
    return map;
  }

  getMonthlyTotals(months: number, accountId?: string | null): {
    label: string;
    income: number;
    expense: number;
  }[] {
    const result: { label: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const summary = this.getSummary(d.getFullYear(), d.getMonth(), accountId);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      result.push({ label, income: summary.income, expense: summary.expense });
    }
    return result;
  }
}
