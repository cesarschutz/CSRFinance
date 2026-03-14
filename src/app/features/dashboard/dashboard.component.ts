import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TransactionService } from '../../core/services/transaction.service';
import { AccountService } from '../../core/services/account.service';
import { CategoryService } from '../../core/services/category.service';

import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { SummaryCardsComponent, SummaryCard } from '../../shared/components/summary-cards/summary-cards.component';
import { DonutChartComponent, DonutSegment } from '../../shared/components/donut-chart/donut-chart.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

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

  year = signal(new Date().getFullYear());
  month = signal(new Date().getMonth());

  onMonthChange(event: { year: number; month: number }): void {
    this.year.set(event.year);
    this.month.set(event.month);
  }

  readonly isSavingsView = computed(() => {
    const acc = this.accountService.selectedAccount();
    if (!acc) return false;
    return acc.type === 'savings' || acc.type === 'investment';
  });

  readonly hasInvestmentAccounts = computed(() =>
    this.accountService.allInvestmentAccounts().length > 0
  );

  readonly investmentsSummary = computed(() => {
    this.transactionService.transactions();
    return this.transactionService.getAllInvestmentsSummary();
  });

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

    if (this.isSavingsView() && accountId) {
      const savingsTxns = this.transactionService.getSavingsTransactions(this.year(), this.month(), accountId);
      const deposits = savingsTxns.deposits.reduce((s, t) => s + t.amount, 0);
      const withdrawals = savingsTxns.withdrawals.reduce((s, t) => s + t.amount, 0);
      const yields = savingsTxns.yields.reduce((s, t) => s + t.amount, 0);

      return [
        { label: 'Saldo Atual', value: currentBalance, type: 'balance', icon: '💰' },
        { label: 'Depositos', value: deposits, type: 'income', icon: '📥' },
        { label: 'Saques', value: withdrawals, type: 'expense', icon: '📤' },
        { label: 'Rendimentos', value: yields, type: 'neutral', icon: '📈' },
      ];
    }

    const incomeTotal = summary.income + summary.transferIn;
    const expenseTotal = summary.expense + summary.transferOut;

    const incomeDetail = accountId && summary.transferIn > 0
      ? `${fmt(summary.income)} receitas + ${fmt(summary.transferIn)} transferências`
      : undefined;

    const expenseDetail = accountId && summary.transferOut > 0
      ? `${fmt(summary.expense)} despesas + ${fmt(summary.transferOut)} transferências`
      : undefined;

    const cards: SummaryCard[] = [
      { label: 'Saldo Atual', value: currentBalance, type: 'balance', icon: '💰' },
      { label: 'Receitas', value: accountId ? incomeTotal : summary.income, type: 'income', icon: '📈', detail: incomeDetail },
      { label: 'Despesas', value: accountId ? expenseTotal : summary.expense, type: 'expense', icon: '📉', detail: expenseDetail },
    ];

    if (summary.investment > 0) {
      cards.push({ label: 'Investimentos', value: summary.investment, type: 'neutral', icon: '💰' });
    } else {
      cards.push({ label: 'Balanço Mensal', value: summary.balance, type: 'neutral', icon: '📊' });
    }

    return cards;
  });

  // --- Month-over-month trend indicators ---
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

  // --- Donut chart (expenses by category) ---
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

  // --- Bar chart (last 6 months: income vs expenses) ---
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
          backgroundColor: 'rgba(0, 184, 148, 0.8)',
          borderColor: '#00B894',
          borderWidth: 1,
          borderRadius: 8,
        },
        {
          label: 'Despesas',
          data: monthlyTotals.map(m => m.expense),
          backgroundColor: 'rgba(232, 67, 147, 0.8)',
          borderColor: '#E84393',
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
          color: '#6B7194',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 29, 46, 0.95)',
        borderColor: 'rgba(108, 92, 231, 0.2)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
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
          color: '#6B7194',
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(108, 92, 231, 0.04)' },
        border: { dash: [4, 4] },
        ticks: {
          font: { family: "'Space Mono', monospace", size: 11 },
          color: '#6B7194',
          callback: (value) => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
          }).format(value as number),
        },
      },
    },
  };

  // --- Top 3 categories ---
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
        items.push({
          icon: cat.icon,
          name: cat.name,
          value,
          color: cat.color,
          percentage: total > 0 ? (value / total) * 100 : 0,
        });
      }
    });

    return items.sort((a, b) => b.value - a.value).slice(0, 3);
  });

  // --- Recent transactions ---
  recentTransactions = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    const transactions = this.transactionService
      .getByMonth(this.year(), this.month(), accountId)
      .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime())
      .slice(0, 5);

    return transactions.map(t => {
      const category = this.categoryService.getById(t.categoryId);
      return {
        ...t,
        categoryName: category?.name ?? 'Sem categoria',
        categoryIcon: category?.icon ?? '❓',
        formattedDate: new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      };
    });
  });
}
