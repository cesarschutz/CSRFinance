import { Injectable, signal, computed, inject } from '@angular/core';
import { Budget, BudgetProgress } from '../models/budget.model';
import { StorageService } from './storage.service';
import { TransactionService } from './transaction.service';
import { CategoryService } from './category.service';
import { AccountService } from './account.service';
import { STORAGE_KEYS, BUDGET_WARNING_THRESHOLD, BUDGET_EXCEEDED_THRESHOLD } from '../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private storage = inject(StorageService);
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);

  private budgetsSignal = signal<Budget[]>(this.load());

  readonly budgets = this.budgetsSignal.asReadonly();

  private load(): Budget[] {
    return this.storage.get<Budget[]>(STORAGE_KEYS.BUDGETS) ?? [];
  }

  private save(): void {
    this.storage.set(STORAGE_KEYS.BUDGETS, this.budgetsSignal());
  }

  getByMonth(year: number, month: number): Budget[] {
    return this.budgetsSignal().filter(b => b.year === year && b.month === month);
  }

  getById(id: string): Budget | undefined {
    return this.budgetsSignal().find(b => b.id === id);
  }

  add(budget: Omit<Budget, 'id' | 'createdAt'>): Budget {
    const existing = this.budgetsSignal().find(
      b => b.categoryId === budget.categoryId && b.year === budget.year && b.month === budget.month
    );
    if (existing) {
      this.update(existing.id, { amount: budget.amount });
      return { ...existing, amount: budget.amount };
    }

    const newBudget: Budget = {
      ...budget,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.budgetsSignal.update(list => [...list, newBudget]);
    this.save();
    return newBudget;
  }

  update(id: string, changes: Partial<Budget>): void {
    this.budgetsSignal.update(list =>
      list.map(b => b.id === id ? { ...b, ...changes } : b)
    );
    this.save();
  }

  delete(id: string): void {
    this.budgetsSignal.update(list => list.filter(b => b.id !== id));
    this.save();
  }

  /** Copy budgets from one month to another */
  copyFromMonth(fromYear: number, fromMonth: number, toYear: number, toMonth: number): void {
    const source = this.getByMonth(fromYear, fromMonth);
    source.forEach(b => {
      this.add({
        categoryId: b.categoryId,
        amount: b.amount,
        year: toYear,
        month: toMonth,
      });
    });
  }

  /** Get budget progress for a given month */
  getProgress(year: number, month: number): BudgetProgress[] {
    const budgets = this.getByMonth(year, month);
    const accountId = this.accountService.selectedAccountId();

    // Trigger reactivity
    this.transactionService.transactions();

    return budgets.map(budget => {
      const category = this.categoryService.getById(budget.categoryId);
      const expenseMap = this.transactionService.getExpensesByCategory(year, month, accountId);
      const spent = expenseMap.get(budget.categoryId) ?? 0;
      const remaining = Math.max(0, budget.amount - spent);
      const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;

      let status: BudgetProgress['status'] = 'ok';
      if (percentage >= BUDGET_EXCEEDED_THRESHOLD) status = 'exceeded';
      else if (percentage >= BUDGET_WARNING_THRESHOLD) status = 'warning';

      return {
        budget,
        categoryName: category?.name ?? 'Desconhecida',
        categoryIcon: category?.icon ?? '❓',
        categoryColor: category?.color ?? '#818CF8',
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percentage,
        status,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  /** Get summary stats for budgets */
  getBudgetSummary(year: number, month: number): {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercentage: number;
    exceededCount: number;
    warningCount: number;
  } {
    const progress = this.getProgress(year, month);
    const totalBudgeted = progress.reduce((s, p) => s + p.budget.amount, 0);
    const totalSpent = progress.reduce((s, p) => s + p.spent, 0);
    const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
    const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallPercentage,
      exceededCount: progress.filter(p => p.status === 'exceeded').length,
      warningCount: progress.filter(p => p.status === 'warning').length,
    };
  }

  loadFromData(budgets: Budget[]): void {
    this.budgetsSignal.set(budgets);
    this.save();
  }
}
