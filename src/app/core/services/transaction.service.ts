import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionType } from '../models/transaction.model';
import { StorageService } from './storage.service';
import { AccountService } from './account.service';
import { SEED_TRANSACTIONS } from '../seed-data';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly STORAGE_KEY = 'transactions';
  private transactionsSignal = signal<Transaction[]>([]);

  readonly transactions = this.transactionsSignal.asReadonly();

  constructor(
    private storage: StorageService,
    private accountService: AccountService,
  ) {
    this.load();
  }

  private load(): void {
    const stored = this.storage.get<Transaction[]>(this.STORAGE_KEY);
    if (stored && stored.length > 0) {
      this.transactionsSignal.set(stored);
    } else {
      this.transactionsSignal.set(SEED_TRANSACTIONS);
      this.save();
    }
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.transactionsSignal());
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
    const account = this.accountService.getById(accountId);
    if (!account) return 0;
    const txns = this.getByAccount(accountId);
    const balance = txns.reduce((sum, t) => {
      return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, account.initialBalance);
    return balance;
  }

  getTotalBalance(): number {
    const accounts = this.accountService.accounts();
    return accounts.reduce((total, acc) => total + this.getAccountBalance(acc.id), 0);
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
