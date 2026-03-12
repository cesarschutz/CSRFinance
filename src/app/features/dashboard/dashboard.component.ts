import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // --- Summary cards ---
  summaryCards = computed<SummaryCard[]>(() => {
    const accountId = this.accountService.selectedAccountId();
    // Explicitly depend on transactions signal for reactivity
    this.transactionService.transactions();
    const summary = this.transactionService.getSummary(this.year(), this.month(), accountId);

    const currentBalance = accountId
      ? this.transactionService.getAccountBalance(accountId)
      : this.transactionService.totalBalance();

    return [
      { label: 'Saldo Atual', value: currentBalance, type: 'balance', icon: '💰' },
      { label: 'Receitas', value: summary.income, type: 'income', icon: '📈' },
      { label: 'Despesas', value: summary.expense, type: 'expense', icon: '📉' },
      { label: 'Balanço Mensal', value: summary.balance, type: 'neutral', icon: '📊' },
    ];
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
          backgroundColor: '#00B894',
          borderRadius: 6,
        },
        {
          label: 'Despesas',
          data: monthlyTotals.map(m => m.expense),
          backgroundColor: '#E84393',
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
          font: { family: "'DM Sans', sans-serif", size: 12 },
        },
      },
      tooltip: {
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
          font: { family: "'DM Sans', sans-serif", size: 12 },
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          font: { family: "'Space Mono', monospace", size: 11 },
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
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
