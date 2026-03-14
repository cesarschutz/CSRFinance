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

  /**
   * Net worth evolution over the last N months.
   * For each month-end, calculates the total balance across all accounts.
   */
  getNetWorthHistory(months: number = 12): {
    label: string;
    month: string;
    netWorth: number;
    income: number;
    expense: number;
  }[] {
    const result: { label: string; month: string; netWorth: number; income: number; expense: number }[] = [];
    const accounts = this.accountService.accounts();
    const txns = this.transactionsSignal();
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const endDateStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

      // Calculate balance up to end of this month for all accounts
      let totalBalance = 0;
      const processedTransfers = new Set<string>();

      for (const acc of accounts) {
        let balance = acc.initialBalance;
        for (const t of txns) {
          if (t.date > endDateStr) continue;

          if (t.type === 'transfer') {
            if (t.transferId && !processedTransfers.has(t.transferId)) {
              processedTransfers.add(t.transferId);
              if (t.accountId === acc.id) balance -= t.amount;
              if (t.transferAccountId === acc.id) balance += t.amount;
            }
          } else if (t.accountId === acc.id) {
            if (t.type === 'income' || t.type === 'yield') balance += t.amount;
            else if (t.type === 'expense') balance -= t.amount;
          }
        }
        totalBalance += balance;
        processedTransfers.clear();
      }

      const summary = this.getSummary(d.getFullYear(), d.getMonth());
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      result.push({
        label,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        netWorth: Math.round(totalBalance * 100) / 100,
        income: summary.income,
        expense: summary.expense,
      });
    }

    return result;
  }

  /**
   * Cash flow: income vs expense per month with running cumulative balance.
   * Includes projection for future months based on recurring transactions.
   */
  getCashFlow(pastMonths: number = 6, futureMonths: number = 3): {
    label: string;
    month: string;
    income: number;
    expense: number;
    net: number;
    cumulative: number;
    isProjection: boolean;
  }[] {
    const result: { label: string; month: string; income: number; expense: number; net: number; cumulative: number; isProjection: boolean }[] = [];
    const now = new Date();
    let cumulative = 0;

    // Past months
    for (let i = pastMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const summary = this.getSummary(d.getFullYear(), d.getMonth());
      const net = summary.income - summary.expense;
      cumulative += net;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      result.push({
        label,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        income: summary.income,
        expense: summary.expense,
        net,
        cumulative: Math.round(cumulative * 100) / 100,
        isProjection: false,
      });
    }

    // Future months - project based on average of last 3 months
    const recentMonths = result.slice(-3);
    const avgIncome = recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.income, 0) / recentMonths.length
      : 0;
    const avgExpense = recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.expense, 0) / recentMonths.length
      : 0;

    for (let i = 1; i <= futureMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const net = avgIncome - avgExpense;
      cumulative += net;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      result.push({
        label,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        income: Math.round(avgIncome * 100) / 100,
        expense: Math.round(avgExpense * 100) / 100,
        net: Math.round(net * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
        isProjection: true,
      });
    }

    return result;
  }

  /**
   * Compare expenses by category between two months.
   */
  getCategoryComparison(
    year1: number, month1: number,
    year2: number, month2: number,
    accountId?: string | null
  ): {
    categoryId: string;
    month1Value: number;
    month2Value: number;
    difference: number;
    percentChange: number;
  }[] {
    const cat1 = this.getExpensesByCategory(year1, month1, accountId);
    const cat2 = this.getExpensesByCategory(year2, month2, accountId);

    const allCategories = new Set([...cat1.keys(), ...cat2.keys()]);
    const result: { categoryId: string; month1Value: number; month2Value: number; difference: number; percentChange: number }[] = [];

    allCategories.forEach(catId => {
      const v1 = cat1.get(catId) ?? 0;
      const v2 = cat2.get(catId) ?? 0;
      const difference = v2 - v1;
      const percentChange = v1 > 0 ? ((v2 - v1) / v1) * 100 : (v2 > 0 ? 100 : 0);

      result.push({ categoryId: catId, month1Value: v1, month2Value: v2, difference, percentChange });
    });

    return result.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  }

  /**
   * Top expenses for a given month - individual transactions ranked by amount.
   */
  getTopExpenses(year: number, month: number, limit: number = 10, accountId?: string | null): Transaction[] {
    return this.getByMonth(year, month, accountId)
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  }

  /**
   * Expense insights for a given month.
   */
  getExpenseInsights(year: number, month: number, accountId?: string | null): {
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
    averageExpense: number;
    dailyAverage: number;
    biggestExpenseDay: { date: string; amount: number } | null;
    biggestCategory: { categoryId: string; amount: number } | null;
    savingsRate: number;
    expenseFrequency: Map<number, number>; // day of week -> total
  } {
    const txns = this.getByMonth(year, month, accountId);
    const expenses = txns.filter(t => t.type === 'expense');
    const incomes = txns.filter(t => t.type === 'income');

    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
    const transactionCount = expenses.length;
    const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
    const dailyAverage = daysElapsed > 0 ? totalExpenses / daysElapsed : 0;

    // Biggest expense day
    const dailyMap = this.getDailyExpenses(year, month, accountId);
    let biggestExpenseDay: { date: string; amount: number } | null = null;
    dailyMap.forEach((amount, date) => {
      if (!biggestExpenseDay || amount > biggestExpenseDay.amount) {
        biggestExpenseDay = { date, amount };
      }
    });

    // Biggest category
    const catMap = this.getExpensesByCategory(year, month, accountId);
    let biggestCategory: { categoryId: string; amount: number } | null = null;
    catMap.forEach((amount, categoryId) => {
      if (!biggestCategory || amount > biggestCategory.amount) {
        biggestCategory = { categoryId, amount };
      }
    });

    // Savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Expense frequency by day of week
    const expenseFrequency = new Map<number, number>();
    for (let i = 0; i < 7; i++) expenseFrequency.set(i, 0);
    expenses.forEach(t => {
      const dayOfWeek = new Date(t.date + 'T00:00:00').getDay();
      expenseFrequency.set(dayOfWeek, (expenseFrequency.get(dayOfWeek) ?? 0) + t.amount);
    });

    return {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      transactionCount,
      averageExpense: Math.round(averageExpense * 100) / 100,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      biggestExpenseDay,
      biggestCategory,
      savingsRate: Math.round(savingsRate * 10) / 10,
      expenseFrequency,
    };
  }

  /**
   * Compare current month vs previous month summary.
   */
  getMonthOverMonthComparison(year: number, month: number, accountId?: string | null): {
    currentIncome: number;
    previousIncome: number;
    incomeChange: number;
    currentExpense: number;
    previousExpense: number;
    expenseChange: number;
    currentBalance: number;
    previousBalance: number;
    balanceChange: number;
  } {
    const prevDate = new Date(year, month - 1, 1);
    const current = this.getSummary(year, month, accountId);
    const previous = this.getSummary(prevDate.getFullYear(), prevDate.getMonth(), accountId);

    const incomeChange = previous.income > 0 ? ((current.income - previous.income) / previous.income) * 100 : 0;
    const expenseChange = previous.expense > 0 ? ((current.expense - previous.expense) / previous.expense) * 100 : 0;
    const currentBal = current.income - current.expense;
    const previousBal = previous.income - previous.expense;
    const balanceChange = previousBal !== 0 ? ((currentBal - previousBal) / Math.abs(previousBal)) * 100 : 0;

    return {
      currentIncome: current.income,
      previousIncome: previous.income,
      incomeChange: Math.round(incomeChange * 10) / 10,
      currentExpense: current.expense,
      previousExpense: previous.expense,
      expenseChange: Math.round(expenseChange * 10) / 10,
      currentBalance: currentBal,
      previousBalance: previousBal,
      balanceChange: Math.round(balanceChange * 10) / 10,
    };
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
