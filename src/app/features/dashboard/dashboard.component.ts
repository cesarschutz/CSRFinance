import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TransactionService } from '../../core/services/transaction.service';
import { AccountService } from '../../core/services/account.service';
import { CategoryService } from '../../core/services/category.service';
import { ContextService } from '../../core/services/context.service';
import { BudgetService } from '../../core/services/budget.service';
import { GoalService } from '../../core/services/goal.service';
import { BudgetProgress } from '../../core/models/budget.model';
import { GoalProgress } from '../../core/models/goal.model';

import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { SummaryCardsComponent, SummaryCard } from '../../shared/components/summary-cards/summary-cards.component';
import { DonutChartComponent, DonutSegment } from '../../shared/components/donut-chart/donut-chart.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

type AccountFilter = 'all' | 'checking' | 'credit_card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BaseChartDirective,
    MonthPickerComponent,
    SummaryCardsComponent,
    DonutChartComponent,
    CurrencyBrlPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  contextService = inject(ContextService);
  private budgetService = inject(BudgetService);
  private goalService = inject(GoalService);

  year = signal(new Date().getFullYear());
  month = signal(new Date().getMonth());
  accountFilter = signal<AccountFilter>('all');

  onMonthChange(event: { year: number; month: number }): void {
    this.year.set(event.year);
    this.month.set(event.month);
  }

  setAccountFilter(filter: AccountFilter): void {
    this.accountFilter.set(filter);
    // Clear account selection when switching filter
    this.accountService.selectAccount(null);
  }

  // --- Summary cards ---
  summaryCards = computed<SummaryCard[]>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const summary = this.transactionService.getSummary(this.year(), this.month(), accountId);

    const currentBalance = accountId
      ? this.transactionService.getAccountBalance(accountId)
      : this.transactionService.totalBalance();

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL',
    }).format(v);

    const incomeTotal = summary.income + summary.transferIn;
    const expenseTotal = summary.expense + summary.transferOut;

    const incomeDetail = accountId && summary.transferIn > 0
      ? `${fmt(summary.income)} receitas + ${fmt(summary.transferIn)} transferências`
      : undefined;

    const expenseDetail = accountId && summary.transferOut > 0
      ? `${fmt(summary.expense)} despesas + ${fmt(summary.transferOut)} transferências`
      : undefined;

    return [
      { label: 'Saldo', value: currentBalance, type: 'balance', icon: '💰' },
      { label: 'Receitas', value: accountId ? incomeTotal : summary.income, type: 'income', icon: '📈', detail: incomeDetail },
      { label: 'Despesas', value: accountId ? expenseTotal : summary.expense, type: 'expense', icon: '📉', detail: expenseDetail },
      { label: 'Balanço', value: summary.balance, type: 'neutral', icon: '📊' },
    ];
  });

  // --- Month-over-month trends ---
  readonly monthTrends = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    return this.transactionService.getMonthOverMonthComparison(this.year(), this.month(), accountId);
  });

  // --- Expense insights ---
  readonly insights = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    return this.transactionService.getExpenseInsights(this.year(), this.month(), accountId);
  });

  // --- Bills (pending vs settled) ---
  readonly bills = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    const txns = this.transactionService.getByMonth(this.year(), this.month(), accountId);
    const expenses = txns.filter(t => t.type === 'expense');

    const pending = expenses.filter(t => t.status === 'pending');
    const settled = expenses.filter(t => t.status === 'settled');

    const totalPending = pending.reduce((s, t) => s + t.amount, 0);
    const totalSettled = settled.reduce((s, t) => s + t.amount, 0);

    return {
      pending: pending.map(t => {
        const cat = this.categoryService.getById(t.categoryId);
        return {
          ...t,
          categoryName: cat?.name ?? 'Sem categoria',
          categoryIcon: cat?.icon ?? '❓',
          formattedDate: new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        };
      }).sort((a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime()),
      settled: settled.map(t => {
        const cat = this.categoryService.getById(t.categoryId);
        return {
          ...t,
          categoryName: cat?.name ?? 'Sem categoria',
          categoryIcon: cat?.icon ?? '❓',
          formattedDate: new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        };
      }),
      totalPending,
      totalSettled,
      totalExpenses: totalPending + totalSettled,
      pendingCount: pending.length,
      settledCount: settled.length,
    };
  });

  // --- Donut chart ---
  donutSegments = computed<DonutSegment[]>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const expensesByCategory = this.transactionService.getExpensesByCategory(
      this.year(), this.month(), accountId,
    );

    const segments: DonutSegment[] = [];
    expensesByCategory.forEach((value, categoryId) => {
      const category = this.categoryService.getById(categoryId);
      if (category) {
        segments.push({
          label: `${category.icon} ${category.name}`,
          value,
          color: category.color,
        });
      }
    });
    return segments.sort((a, b) => b.value - a.value);
  });

  // --- Bar chart ---
  barChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const monthlyTotals = this.transactionService.getMonthlyTotals(6, accountId);

    return {
      labels: monthlyTotals.map(m => m.label),
      datasets: [
        {
          label: 'Receitas',
          data: monthlyTotals.map(m => m.income),
          backgroundColor: 'rgba(52, 211, 153, 0.7)',
          borderColor: '#34D399',
          borderWidth: 1,
          borderRadius: 8,
        },
        {
          label: 'Despesas',
          data: monthlyTotals.map(m => m.expense),
          backgroundColor: 'rgba(251, 113, 133, 0.7)',
          borderColor: '#FB7185',
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    };
  });

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: "'DM Sans', sans-serif", size: 12, weight: 600 },
          color: '#9394A5',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(18, 18, 30, 0.95)',
        borderColor: 'rgba(129, 140, 248, 0.2)',
        borderWidth: 1,
        titleColor: '#EEEEF4',
        bodyColor: '#9394A5',
        boxPadding: 4,
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y ?? 0;
            return `${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', {
              style: 'currency', currency: 'BRL',
            }).format(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 12, weight: 500 },
          color: '#5C5D72',
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: {
          font: { family: "'DM Sans', monospace", size: 11 },
          color: '#5C5D72',
          callback: (value) => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
          }).format(value as number),
        },
      },
    },
  };

  // --- Top categories ---
  readonly topCategories = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const expensesByCategory = this.transactionService.getExpensesByCategory(
      this.year(), this.month(), accountId,
    );

    const total = Array.from(expensesByCategory.values()).reduce((s, v) => s + v, 0);
    const items: { icon: string; name: string; value: number; color: string; percentage: number }[] = [];

    expensesByCategory.forEach((value, categoryId) => {
      const cat = this.categoryService.getById(categoryId);
      if (cat) {
        items.push({ icon: cat.icon, name: cat.name, value, color: cat.color, percentage: total > 0 ? (value / total) * 100 : 0 });
      }
    });

    return items.sort((a, b) => b.value - a.value).slice(0, 5);
  });

  // --- Recent transactions ---
  recentTransactions = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    const transactions = this.transactionService
      .getByMonth(this.year(), this.month(), accountId)
      .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime())
      .slice(0, 8);

    return transactions.map(t => {
      const category = this.categoryService.getById(t.categoryId);
      return {
        ...t,
        categoryName: category?.name ?? 'Sem categoria',
        categoryIcon: category?.icon ?? '❓',
        formattedDate: new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit',
        }),
      };
    });
  });

  // --- Credit card summary ---
  readonly creditCards = computed(() => {
    return this.accountService.creditCardAccounts().map(card => {
      const balance = this.transactionService.getAccountBalance(card.id);
      const txns = this.transactionService.getByMonth(this.year(), this.month(), card.id);
      const expenses = txns.filter(t => t.type === 'expense');
      const totalMonth = expenses.reduce((s, t) => s + t.amount, 0);
      const pendingMonth = expenses.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
      const paidMonth = expenses.filter(t => t.status === 'settled').reduce((s, t) => s + t.amount, 0);

      return {
        ...card,
        balance: Math.abs(balance),
        totalMonth,
        pendingMonth,
        paidMonth,
        usagePercent: card.creditLimit ? (totalMonth / card.creditLimit) * 100 : 0,
      };
    });
  });

  readonly hasCreditCards = computed(() => this.accountService.creditCardAccounts().length > 0);

  // --- Budget progress ---
  readonly budgetProgress = computed<BudgetProgress[]>(() => {
    this.transactionService.transactions();
    return this.budgetService.getProgress(this.year(), this.month());
  });

  readonly budgetSummary = computed(() => {
    this.transactionService.transactions();
    return this.budgetService.getBudgetSummary(this.year(), this.month());
  });

  readonly hasBudgets = computed(() => this.budgetService.getByMonth(this.year(), this.month()).length > 0);

  // --- Goals ---
  readonly goalsProgress = computed<GoalProgress[]>(() => {
    return this.goalService.getAllProgress();
  });

  readonly hasGoals = computed(() => this.goalService.goals().length > 0);
}
