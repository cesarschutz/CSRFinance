import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionType, TransactionStatus } from '../models/transaction.model';
import { Account } from '../models/account.model';
import { StorageService } from './storage.service';
import { AccountService } from './account.service';

export interface InvestmentSummary {
  totalDeposited: number;
  totalWithdrawn: number;
  totalYield: number;
  netInvested: number;
  currentBalance: number;
  yieldPercentage: number;
}

export interface MonthlyInvestmentData {
  month: string;
  label: string;
  cumulativeInvested: number;
  yieldThisMonth: number;
  yieldPercentage: number;
  balance: number;
}

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
        if (t.transferId && !processedTransfers.has(t.transferId)) {
          processedTransfers.add(t.transferId);
          balances.set(t.accountId, balances.get(t.accountId)! - t.amount);
          if (t.transferAccountId && balances.has(t.transferAccountId)) {
            balances.set(t.transferAccountId, balances.get(t.transferAccountId)! + t.amount);
          }
        }
      } else if (t.type === 'income' || t.type === 'yield') {
        balances.set(t.accountId, balances.get(t.accountId)! + t.amount);
      } else if (t.type === 'expense') {
        balances.set(t.accountId, balances.get(t.accountId)! - t.amount);
      }
    }

    // Round to avoid floating point errors
    balances.forEach((value, key) => {
      balances.set(key, Math.round(value * 100) / 100);
    });

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
      const d = new Date(t.date + 'T00:00:00');
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
    investment: number;
    yield: number;
  } {
    const txns = this.getByMonth(year, month, accountId);
    const income = txns
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = txns
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const yieldTotal = txns
      .filter(t => t.type === 'yield')
      .reduce((sum, t) => sum + t.amount, 0);

    let transferIn = 0;
    let transferOut = 0;
    let investment = 0;

    if (accountId) {
      const allTxns = this.transactionsSignal();
      const processedTransfers = new Set<string>();

      for (const t of allTxns) {
        if (t.type !== 'transfer' || !t.transferId) continue;
        if (processedTransfers.has(t.transferId)) continue;

        const d = new Date(t.date + 'T00:00:00');
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (t.accountId !== accountId && t.transferAccountId !== accountId) continue;

        processedTransfers.add(t.transferId);

        if (t.accountId === accountId) {
          // Outgoing from this account
          const destAccount = t.transferAccountId ? this.accountService.getById(t.transferAccountId) : null;
          if (destAccount && this.accountService.isSavingsOrInvestment(destAccount.id)) {
            investment += t.amount;
          } else {
            transferOut += t.amount;
          }
        } else {
          transferIn += t.amount;
        }
      }
    }

    const balance = (income + transferIn) - (expense + transferOut + investment);
    return { income, expense, balance, transferIn, transferOut, investment, yield: yieldTotal };
  }

  getAccountBalance(accountId: string): number {
    return this.accountBalances().get(accountId) ?? 0;
  }

  getTotalBalance(): number {
    return this.totalBalance();
  }

  // --- Yield (rendimento) ---

  addYield(data: { accountId: string; realBalance: number; date: string }): Transaction | null {
    const trackedBalance = this.accountBalances().get(data.accountId) ?? 0;
    const yieldAmount = Math.round((data.realBalance - trackedBalance) * 100) / 100;

    if (yieldAmount === 0) return null;

    const account = this.accountService.getById(data.accountId);
    const description = yieldAmount > 0 ? 'Rendimento' : 'Perda de rendimento';

    return this.add({
      description,
      amount: yieldAmount,
      type: 'yield',
      categoryId: '',
      accountId: data.accountId,
      date: data.date,
      status: 'settled',
    });
  }

  // --- Investment Summary ---

  getInvestmentSummary(accountId: string): InvestmentSummary {
    const allTxns = this.transactionsSignal();
    const processedTransfers = new Set<string>();
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let totalYield = 0;

    for (const t of allTxns) {
      if (t.type === 'yield' && t.accountId === accountId) {
        totalYield += t.amount;
        continue;
      }

      if (t.type === 'transfer' && t.transferId && !processedTransfers.has(t.transferId)) {
        processedTransfers.add(t.transferId);
        // Check if this transfer involves the target account
        if (t.transferAccountId === accountId) {
          // Incoming to savings (deposit)
          totalDeposited += t.amount;
        } else if (t.accountId === accountId) {
          // Outgoing from savings (withdrawal)
          totalWithdrawn += t.amount;
        }
      }
    }

    const netInvested = totalDeposited - totalWithdrawn;
    const currentBalance = this.accountBalances().get(accountId) ?? 0;
    const yieldPercentage = netInvested > 0 ? (totalYield / netInvested) * 100 : 0;

    return { totalDeposited, totalWithdrawn, totalYield, netInvested, currentBalance, yieldPercentage };
  }

  getMonthlyInvestmentData(accountId: string): MonthlyInvestmentData[] {
    const allTxns = this.transactionsSignal()
      .filter(t => t.accountId === accountId || t.transferAccountId === accountId)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Group by month
    const monthMap = new Map<string, { deposited: number; withdrawn: number; yield: number }>();
    const processedTransfers = new Set<string>();

    for (const t of allTxns) {
      const monthKey = t.date.substring(0, 7); // YYYY-MM

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { deposited: 0, withdrawn: 0, yield: 0 });
      }
      const entry = monthMap.get(monthKey)!;

      if (t.type === 'yield' && t.accountId === accountId) {
        entry.yield += t.amount;
      } else if (t.type === 'transfer' && t.transferId && !processedTransfers.has(t.transferId)) {
        processedTransfers.add(t.transferId);
        if (t.transferAccountId === accountId) {
          entry.deposited += t.amount;
        } else if (t.accountId === accountId) {
          entry.withdrawn += t.amount;
        }
      }
    }

    // Build cumulative data
    const result: MonthlyInvestmentData[] = [];
    let cumulativeInvested = 0;
    const account = this.accountService.getById(accountId);
    let runningBalance = account?.initialBalance ?? 0;

    const sortedMonths = Array.from(monthMap.keys()).sort();
    for (const monthKey of sortedMonths) {
      const data = monthMap.get(monthKey)!;
      cumulativeInvested += data.deposited - data.withdrawn;
      runningBalance += data.deposited - data.withdrawn + data.yield;

      const [y, m] = monthKey.split('-').map(Number);
      const date = new Date(y, m - 1, 1);
      const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      result.push({
        month: monthKey,
        label,
        cumulativeInvested,
        yieldThisMonth: data.yield,
        yieldPercentage: cumulativeInvested > 0 ? (data.yield / cumulativeInvested) * 100 : 0,
        balance: runningBalance,
      });
    }

    return result;
  }

  getSavingsTransactions(year: number, month: number, accountId: string): {
    deposits: Transaction[];
    withdrawals: Transaction[];
    yields: Transaction[];
  } {
    const txns = this.getByMonth(year, month, accountId);
    const allTxns = this.transactionsSignal();

    const yields = txns.filter(t => t.type === 'yield');

    // For transfers, we need to check direction
    const deposits: Transaction[] = [];
    const withdrawals: Transaction[] = [];
    const processedTransfers = new Set<string>();

    for (const t of allTxns) {
      if (t.type !== 'transfer' || !t.transferId) continue;
      if (processedTransfers.has(t.transferId)) continue;

      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      if (t.accountId !== accountId && t.transferAccountId !== accountId) continue;

      processedTransfers.add(t.transferId);

      if (t.transferAccountId === accountId) {
        // Incoming to savings = deposit
        deposits.push(t);
      } else if (t.accountId === accountId) {
        // Outgoing from savings = withdrawal
        withdrawals.push(t);
      }
    }

    return { deposits, withdrawals, yields };
  }

  getAllInvestmentsSummary(): {
    totalInvested: number;
    totalReal: number;
    totalYield: number;
    yieldPercentage: number;
    accounts: { account: Account; summary: InvestmentSummary }[];
  } {
    const investmentAccounts = this.accountService.allInvestmentAccounts();
    const accounts: { account: Account; summary: InvestmentSummary }[] = [];
    let totalInvested = 0;
    let totalReal = 0;
    let totalYield = 0;

    for (const account of investmentAccounts) {
      const summary = this.getInvestmentSummary(account.id);
      accounts.push({ account, summary });
      totalInvested += summary.netInvested;
      totalReal += summary.currentBalance;
      totalYield += summary.totalYield;
    }

    const yieldPercentage = totalInvested > 0 ? (totalYield / totalInvested) * 100 : 0;

    return { totalInvested, totalReal, totalYield, yieldPercentage, accounts };
  }

  // --- CRUD ---

  add(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
    const newTxn: Transaction = {
      ...transaction,
      id: 'txn-' + crypto.randomUUID(),
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
    const transferId = 'trf-' + crypto.randomUUID();
    const now = new Date().toISOString();

    const outgoing: Transaction = {
      id: 'txn-' + crypto.randomUUID(),
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
      id: 'txn-' + crypto.randomUUID(),
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

  // --- Advanced Recurring Logic ---

  private generateDates(startDate: string, frequency: 'weekly' | 'monthly' | 'semiannual' | 'annual', count: number): string[] {
    const dates: string[] = [];
    const [y, m, d] = startDate.split('-').map(Number);
    let current = new Date(y, m - 1, d);

    for (let i = 0; i < count; i++) {
        const strY = current.getFullYear();
        const strM = String(current.getMonth() + 1).padStart(2, '0');
        const strD = String(current.getDate()).padStart(2, '0');
        dates.push(`${strY}-${strM}-${strD}`);

        if (frequency === 'weekly') current.setDate(current.getDate() + 7);
        else if (frequency === 'monthly') current.setMonth(current.getMonth() + 1);
        else if (frequency === 'semiannual') current.setMonth(current.getMonth() + 6);
        else if (frequency === 'annual') current.setFullYear(current.getFullYear() + 1);
    }
    return dates;
  }

  addAdvanced(data: Omit<Transaction, 'id' | 'createdAt'> & {
    isRepeated?: boolean;
    repeatCount?: number;
    repeatFrequency?: 'weekly' | 'monthly' | 'semiannual' | 'annual';
  }): void {
    const isFixed = data.isFixed;
    const isRepeated = data.isRepeated;

    if (!isFixed && !isRepeated) {
      this.add(data);
      return;
    }

    const recurringId = 'rec-' + crypto.randomUUID();
    const count = isFixed ? 60 : (data.repeatCount || 2);
    const frequency = data.repeatFrequency || 'monthly';
    const dates = this.generateDates(data.date, frequency, count);
    const nowStr = new Date().toISOString();

    const newTxns: Transaction[] = dates.map((dateStr, index) => {
      const isFuture = new Date(dateStr) > new Date();
      const status: TransactionStatus = (index === 0) ? data.status : (isFuture ? 'pending' : data.status);

      return {
        ...data,
        id: 'txn-' + crypto.randomUUID(),
        createdAt: nowStr,
        date: dateStr,
        status,
        recurringId,
        isFixed,
        installmentCurrent: index + 1,
        installmentTotal: isFixed ? undefined : count
      };
    });

    this.transactionsSignal.update(txns => [...txns, ...newTxns]);
    this.save();
  }

  updateAdvanced(id: string, changes: Partial<Transaction>, scope: 'single' | 'future' | 'all'): void {
      const txns = this.transactionsSignal();
      const target = txns.find(t => t.id === id);
      if (!target) return;

      if (!target.recurringId || scope === 'single') {
         this.update(id, changes);
         return;
      }

      this.transactionsSignal.update(arr => arr.map(t => {
          if (t.id === id) {
             return { ...t, ...changes };
          }
          if (t.recurringId === target.recurringId) {
             if (scope === 'all' || (scope === 'future' && t.date > target.date)) {
                 return { ...t, ...changes, date: t.date, status: t.status };
             }
          }
          return t;
      }));
      this.save();
  }

  deleteAdvanced(id: string, scope: 'single' | 'future' | 'all'): void {
    const txns = this.transactionsSignal();
    const target = txns.find(t => t.id === id);
    if (!target) return;

    if (!target.recurringId || scope === 'single') {
       this.delete(id);
       return;
    }

    if (scope === 'all') {
       this.transactionsSignal.update(arr => arr.filter(t => t.recurringId !== target.recurringId));
    } else if (scope === 'future') {
       this.transactionsSignal.update(arr => arr.filter(t => !(t.recurringId === target.recurringId && t.date >= target.date)));
    }
    this.save();
  }

  // --- Analytics ---

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
    investment: number;
  }[] {
    const result: { label: string; income: number; expense: number; investment: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const summary = this.getSummary(d.getFullYear(), d.getMonth(), accountId);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      result.push({ label, income: summary.income, expense: summary.expense, investment: summary.investment });
    }
    return result;
  }
}
