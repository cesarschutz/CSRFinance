import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';

import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { DonutChartComponent, DonutSegment } from '../../shared/components/donut-chart/donut-chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

export type ReportTab = 'category' | 'daily' | 'balance';

export interface CategoryReport {
  id: string;
  icon: string;
  name: string;
  color: string;
  value: number;
  percentage: number;
}

export interface DailyExpense {
  date: string;
  formattedDate: string;
  value: number;
}

export interface MonthlyBalance {
  label: string;
  income: number;
  expense: number;
  balance: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    BaseChartDirective,
    MonthPickerComponent,
    DonutChartComponent,
    EmptyStateComponent,
    CurrencyBrlPipe,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent {
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);

  activeTab = signal<ReportTab>('category');
  year = signal(new Date().getFullYear());
  month = signal(new Date().getMonth());

  onMonthChange(event: { year: number; month: number }): void {
    this.year.set(event.year);
    this.month.set(event.month);
  }

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
  }

  // ==============================
  // Tab 1 - Por Categoria
  // ==============================

  categoryData = computed<CategoryReport[]>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const expensesByCategory = this.transactionService.getExpensesByCategory(
      this.year(), this.month(), accountId,
    );

    const total = Array.from(expensesByCategory.values()).reduce((sum, v) => sum + v, 0);
    const items: CategoryReport[] = [];

    expensesByCategory.forEach((value, categoryId) => {
      const category = this.categoryService.getById(categoryId);
      if (category) {
        items.push({
          id: category.id,
          icon: category.icon,
          name: category.name,
          color: category.color,
          value,
          percentage: total > 0 ? (value / total) * 100 : 0,
        });
      }
    });

    return items.sort((a, b) => b.value - a.value);
  });

  donutSegments = computed<DonutSegment[]>(() => {
    return this.categoryData().map(item => ({
      label: `${item.icon} ${item.name}`,
      value: item.value,
      color: item.color,
    }));
  });

  totalExpenses = computed<number>(() => {
    return this.categoryData().reduce((sum, item) => sum + item.value, 0);
  });

  // ==============================
  // Tab 2 - Despesas Diarias
  // ==============================

  dailyExpenses = computed<DailyExpense[]>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const dailyMap = this.transactionService.getDailyExpenses(
      this.year(), this.month(), accountId,
    );

    const daysInMonth = new Date(this.year(), this.month() + 1, 0).getDate();
    const items: DailyExpense[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.year()}-${String(this.month() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const value = dailyMap.get(dateStr) ?? 0;

      if (value > 0) {
        items.push({
          date: dateStr,
          formattedDate: new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          }),
          value,
        });
      }
    }

    return items;
  });

  dailyChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const dailyMap = this.transactionService.getDailyExpenses(
      this.year(), this.month(), accountId,
    );

    const daysInMonth = new Date(this.year(), this.month() + 1, 0).getDate();
    const labels: string[] = [];
    const data: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.year()}-${String(this.month() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      labels.push(String(day));
      data.push(dailyMap.get(dateStr) ?? 0);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Despesas',
          data,
          borderColor: '#F43F5E',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#F43F5E',
          pointBorderColor: '#151B2E',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    };
  });

  dailyChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(21, 27, 46, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        callbacks: {
          title: (items) => `Dia ${items[0].label}`,
          label: (ctx) => {
            const value = ctx.parsed.y;
            const formatted = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value ?? 0);
            return formatted;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 11 },
          color: '#64748B',
          maxTicksLimit: 15,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
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

  totalDailyExpenses = computed<number>(() => {
    return this.dailyExpenses().reduce((sum, d) => sum + d.value, 0);
  });

  // ==============================
  // Tab 3 - Balanco Mensal
  // ==============================

  monthlyBalances = computed<MonthlyBalance[]>(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const totals = this.transactionService.getMonthlyTotals(6, accountId);

    return totals.map(t => ({
      label: t.label,
      income: t.income,
      expense: t.expense,
      balance: t.income - t.expense,
    }));
  });

  barChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const balances = this.monthlyBalances();

    return {
      labels: balances.map(b => b.label),
      datasets: [
        {
          label: 'Receitas',
          data: balances.map(b => b.income),
          backgroundColor: 'rgba(124, 58, 237, 0.85)',
          borderColor: '#7C3AED',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: '#7C3AED',
        },
        {
          label: 'Despesas',
          data: balances.map(b => b.expense),
          backgroundColor: 'rgba(56, 189, 248, 0.85)',
          borderColor: '#38BDF8',
          borderWidth: 1,
          borderRadius: 6,
          hoverBackgroundColor: '#38BDF8',
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
          font: { family: "'Outfit', sans-serif", size: 13, weight: 600 },
          color: '#475569',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(124, 58, 237, 0.1)',
        borderWidth: 1,
        titleColor: '#0F172A',
        bodyColor: '#334155',
        titleFont: { family: "'Outfit', sans-serif", size: 14, weight: 700 },
        bodyFont: { family: "'DM Sans', sans-serif", size: 13, weight: 500 },
        padding: 12,
        cornerRadius: 12,
        boxPadding: 6,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            const formatted = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value ?? 0);
            return `${ctx.dataset.label}: ${formatted}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Outfit', sans-serif", size: 12, weight: 600 },
          color: '#64748B',
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(15, 23, 42, 0.04)', drawTicks: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 12, weight: 500 },
          color: '#94A3B8',
          padding: 10,
          callback: (value) => {
            return new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(value as number);
          },
        },
        border: { display: false, dash: [4, 4] },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  hasMonthlyData = computed<boolean>(() => {
    return this.monthlyBalances().some(b => b.income > 0 || b.expense > 0);
  });
}
