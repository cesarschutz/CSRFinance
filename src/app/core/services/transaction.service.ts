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
      balances.set(acc.id, acc.initialBalance);
    }

    const processedTransfers = new Set<string>();

    for (const t of txns) {
      if (!balances.has(t.accountId)) continue;

      if (t.type === 'transfer') {
        // Each transfer pair: process once. The first encountered tx is always
        // the outgoing side (accountId = source, transferAccountId = dest).
        if (t.transferId && !processedTransfers.has(t.transferId)) {
          processedTransfers.add(t.transferId);
          balances.set(t.accountId, balances.get(t.accountId)! - t.amount);
          if (t.transferAccountId && balances.has(t.transferAccountId)) {
            balances.set(t.transferAccountId, balances.get(t.transferAccountId)! + t.amount);
          }
        }
      } else if (t.type === 'income') {
        balances.set(t.accountId, balances.get(t.accountId)! + t.amount);
      } else {
        balances.set(t.accountId, balances.get(t.accountId)! - t.amount);
      }
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
    transferIn: number;
    transferOut: number;
  } {
    const txns = this.getByMonth(year, month, accountId);
    const income = txns
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = txns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    let transferIn = 0;
    let transferOut = 0;

    if (accountId) {
      const allTxns = this.transactionsSignal();
      const processedTransfers = new Set<string>();

      for (const t of allTxns) {
        if (t.type !== 'transfer' || !t.transferId) continue;
        if (processedTransfers.has(t.transferId)) continue;

        const d = new Date(t.date);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (t.accountId !== accountId && t.transferAccountId !== accountId) continue;

        processedTransfers.add(t.transferId);
        // First record of a pair is always the outgoing side:
        // t.accountId = source, t.transferAccountId = destination
        if (t.accountId === accountId) {
          transferOut += t.amount;
        } else {
          transferIn += t.amount;
        }
      }
    }

    const balance = (income + transferIn) - (expense + transferOut);
    return { income, expense, balance, transferIn, transferOut };
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
