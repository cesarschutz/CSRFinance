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

  // Is the selected account a savings/investment account?
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

    // Savings/Investment view
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

    // Regular checking view
    const incomeTotal = summary.income + summary.transferIn;
    const expenseTotal = summary.expense + summary.transferOut;

    const incomeDetail = accountId && summary.transferIn > 0
      ? `${fmt(summary.income)} receitas + ${fmt(summary.transferIn)} transferencias`
      : undefined;

    const expenseDetail = accountId && summary.transferOut > 0
      ? `${fmt(summary.expense)} despesas + ${fmt(summary.transferOut)} transferencias`
      : undefined;

    const cards: SummaryCard[] = [
      { label: 'Saldo Atual', value: currentBalance, type: 'balance', icon: '💰' },
      { label: 'Receitas', value: accountId ? incomeTotal : summary.income, type: 'income', icon: '📈', detail: incomeDetail },
      { label: 'Despesas', value: accountId ? expenseTotal : summary.expense, type: 'expense', icon: '📉', detail: expenseDetail },
    ];

    if (summary.investment > 0) {
      cards.push({ label: 'Investimentos', value: summary.investment, type: 'neutral', icon: '💰' });
    } else {
      cards.push({ label: 'Balanco Mensal', value: summary.balance, type: 'neutral', icon: '📊' });
    }

    return cards;
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
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Despesas',
          data: monthlyTotals.map(m => m.expense),
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          borderRadius: 6,
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
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(15, 23, 42, 0.05)',
        borderWidth: 1,
        titleColor: '#0F172A',
        bodyColor: '#475569',
        boxPadding: 4,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y ?? 0;
            const formatted = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value);
            return `${ctx.dataset.label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 12, weight: 500 },
          color: '#64748B',
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(15, 23, 42, 0.03)' },
        border: { dash: [4, 4] },
        ticks: {
          font: { family: "'Space Mono', monospace", size: 11 },
          color: '#64748B',
          callback: (value) => {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value as number);
          },
        },
      },
    },
  };

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
