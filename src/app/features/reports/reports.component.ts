import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';
import { ContextService } from '../../core/services/context.service';

import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { DonutChartComponent, DonutSegment } from '../../shared/components/donut-chart/donut-chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

export type ReportTab = 'category' | 'daily' | 'balance' | 'patrimony' | 'cashflow' | 'comparison' | 'insights' | 'annual-categories' | 'annual-fixed' | 'annual-heatmap' | 'investments';

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
  private contextService = inject(ContextService);

  activeTab = signal<ReportTab>('category');
  year = signal(new Date().getFullYear());
  month = signal(new Date().getMonth());

  // For comparison tab
  compareYear = signal(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
  compareMonth = signal(new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1);

  onMonthChange(event: { year: number; month: number }): void {
    this.year.set(event.year);
    this.month.set(event.month);
  }

  setTab(tab: ReportTab): void {
    this.activeTab.set(tab);
  }

  private accountsTabs: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'category', label: 'Categorias', icon: '🏷️' },
    { id: 'daily', label: 'Diário', icon: '📅' },
    { id: 'balance', label: 'Balanço', icon: '⚖️' },
    { id: 'patrimony', label: 'Patrimônio', icon: '🏦' },
    { id: 'cashflow', label: 'Fluxo de Caixa', icon: '💸' },
    { id: 'comparison', label: 'Comparativo', icon: '🔄' },
    { id: 'insights', label: 'Análises', icon: '🧠' },
    { id: 'annual-categories', label: 'Anual Categorias', icon: '📅' },
    { id: 'annual-fixed', label: 'Despesas Fixas', icon: '📌' },
    { id: 'annual-heatmap', label: 'Mês a Mês', icon: '🗓️' },
  ];

  private investmentsTabs: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'investments', label: 'Resumo', icon: '💰' },
    { id: 'patrimony', label: 'Evolução', icon: '📈' },
    { id: 'annual-heatmap', label: 'Mês a Mês', icon: '🗓️' },
  ];

  readonly tabs = computed(() => {
    return this.contextService.isAccounts()
      ? this.accountsTabs
      : this.investmentsTabs;
  });

  constructor() {
    // Reset active tab when context changes
    effect(() => {
      const isAccounts = this.contextService.isAccounts();
      this.activeTab.set(isAccounts ? 'category' : 'investments');
    });
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
          borderColor: '#E84393',
          backgroundColor: 'rgba(232, 67, 147, 0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#E84393',
          pointBorderColor: '#fff',
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
        backgroundColor: 'rgba(26, 29, 46, 0.95)',
        borderColor: 'rgba(108, 92, 231, 0.2)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          title: (items) => `Dia ${items[0].label}`,
          label: (ctx) => {
            const value = ctx.parsed.y;
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 11 },
          color: '#6B7194',
          maxTicksLimit: 15,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(108, 92, 231, 0.06)' },
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
          backgroundColor: 'rgba(0, 184, 148, 0.8)',
          borderColor: '#00B894',
          borderWidth: 1,
          borderRadius: 8,
          hoverBackgroundColor: '#00B894',
        },
        {
          label: 'Despesas',
          data: balances.map(b => b.expense),
          backgroundColor: 'rgba(232, 67, 147, 0.8)',
          borderColor: '#E84393',
          borderWidth: 1,
          borderRadius: 8,
          hoverBackgroundColor: '#E84393',
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
          font: { family: "'DM Sans', sans-serif", size: 13, weight: 600 },
          color: '#6B7194',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 29, 46, 0.95)',
        borderColor: 'rgba(108, 92, 231, 0.2)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed.y;
            return `${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', {
              style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
            }).format(value ?? 0)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 12, weight: 600 },
          color: '#6B7194',
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(108, 92, 231, 0.06)', drawTicks: false },
        ticks: {
          font: { family: "'Space Mono', monospace", size: 11 },
          color: '#6B7194',
          padding: 10,
          callback: (value) => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
          }).format(value as number),
        },
        border: { display: false, dash: [4, 4] },
      },
    },
    interaction: { mode: 'index', intersect: false },
  };

  hasMonthlyData = computed<boolean>(() => {
    return this.monthlyBalances().some(b => b.income > 0 || b.expense > 0);
  });

  // ==============================
  // Tab 4 - Evolucao Patrimonial
  // ==============================

  readonly netWorthHistory = computed(() => {
    this.transactionService.transactions();
    return this.transactionService.getNetWorthHistory(12);
  });

  readonly patrimonyChartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const history = this.netWorthHistory();

    return {
      labels: history.map(h => h.label),
      datasets: [
        {
          label: 'Patrimônio',
          data: history.map(h => h.netWorth),
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6C5CE7',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 3,
        },
      ],
    };
  });

  readonly patrimonyChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(26, 29, 46, 0.95)',
        borderColor: 'rgba(108, 92, 231, 0.3)',
        borderWidth: 1,
        titleColor: '#F1F5F9',
        bodyColor: '#94A3B8',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctx.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'DM Sans', sans-serif", size: 11 },
          color: '#6B7194',
        },
      },
      y: {
        grid: { color: 'rgba(108, 92, 231, 0.06)' },
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

  readonly patrimonyStats = computed(() => {
    const history = this.netWorthHistory();
    if (history.length < 2) return null;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const first = history[0];

    const monthChange = current.netWorth - previous.netWorth;
    const monthChangePercent = previous.netWorth !== 0
      ? (monthChange / Math.abs(previous.netWorth)) * 100 : 0;
    const totalChange = current.netWorth - first.netWorth;
    const totalChangePercent = first.netWorth !== 0
      ? (totalChange / Math.abs(first.netWorth)) * 100 : 0;

    return {
      currentNetWorth: current.netWorth,
      monthChange: Math.round(monthChange * 100) / 100,
      monthChangePercent: Math.round(monthChangePercent * 10) / 10,
      totalChange: Math.round(totalChange * 100) / 100,
      totalChangePercent: Math.round(totalChangePercent * 10) / 10,
      highestNetWorth: Math.max(...history.map(h => h.netWorth)),
      lowestNetWorth: Math.min(...history.map(h => h.netWorth)),
    };
  });

  hasPatrimonyData = computed(() => this.netWorthHistory().some(h => h.netWorth !== 0));

  // ==============================
  // Tab 5 - Fluxo de Caixa
  // ==============================

  readonly cashFlowData = computed(() => {
    this.transactionService.transactions();
    return this.transactionService.getCashFlow(6, 3);
  });

  readonly cashFlowChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const data = this.cashFlowData();
    const pastData = data.filter(d => !d.isProjection);
    const futureData = data.filter(d => d.isProjection);

    return {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Receitas',
          data: data.map(d => d.income),
          backgroundColor: data.map(d => d.isProjection ? 'rgba(0, 184, 148, 0.35)' : 'rgba(0, 184, 148, 0.8)'),
          borderColor: data.map(d => d.isProjection ? 'rgba(0, 184, 148, 0.5)' : '#00B894'),
          borderWidth: 1,
          borderRadius: 6,
          borderDash: [],
        },
        {
          label: 'Despesas',
          data: data.map(d => d.expense),
          backgroundColor: data.map(d => d.isProjection ? 'rgba(232, 67, 147, 0.35)' : 'rgba(232, 67, 147, 0.8)'),
          borderColor: data.map(d => d.isProjection ? 'rgba(232, 67, 147, 0.5)' : '#E84393'),
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  });

  readonly cashFlowLineData = computed<ChartConfiguration<'line'>['data']>(() => {
    const data = this.cashFlowData();

    return {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: 'Saldo Acumulado',
          data: data.map(d => d.cumulative),
          borderColor: '#6C5CE7',
          backgroundColor: 'rgba(108, 92, 231, 0.05)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: data.map(d => d.isProjection ? 'rgba(108, 92, 231, 0.5)' : '#6C5CE7'),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          borderWidth: 2,
          borderDash: [],
          segment: {
            borderDash: (ctx: any) => {
              const dataLen = data.filter(d => !d.isProjection).length;
              return ctx.p0DataIndex >= dataLen - 1 ? [6, 4] : [];
            },
          },
        },
      ],
    };
  });

  readonly cashFlowBarOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
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
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'DM Sans', sans-serif", size: 11 }, color: '#6B7194' },
      },
      y: {
        grid: { color: 'rgba(108, 92, 231, 0.06)' },
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

  readonly cashFlowLineOptions: ChartConfiguration<'line'>['options'] = {
    ...this.patrimonyChartOptions,
    plugins: {
      ...this.patrimonyChartOptions!.plugins,
      legend: { display: false },
    },
  };

  hasCashFlowData = computed(() => this.cashFlowData().some(d => d.income > 0 || d.expense > 0));

  // ==============================
  // Tab 6 - Comparativo Mensal
  // ==============================

  readonly comparisonData = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();

    // Compare current selected month with previous month
    const prevDate = new Date(this.year(), this.month() - 1, 1);

    const data = this.transactionService.getCategoryComparison(
      prevDate.getFullYear(), prevDate.getMonth(),
      this.year(), this.month(),
      accountId,
    );

    return data.map(item => {
      const category = this.categoryService.getById(item.categoryId);
      return {
        ...item,
        categoryName: category?.name ?? 'Desconhecida',
        categoryIcon: category?.icon ?? '❓',
        categoryColor: category?.color ?? '#6B7194',
      };
    });
  });

  readonly comparisonChartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const data = this.comparisonData().slice(0, 8);
    const prevDate = new Date(this.year(), this.month() - 1, 1);
    const prevLabel = prevDate.toLocaleDateString('pt-BR', { month: 'short' });
    const currLabel = new Date(this.year(), this.month(), 1).toLocaleDateString('pt-BR', { month: 'short' });

    return {
      labels: data.map(d => d.categoryIcon + ' ' + d.categoryName),
      datasets: [
        {
          label: prevLabel,
          data: data.map(d => d.month1Value),
          backgroundColor: 'rgba(108, 92, 231, 0.6)',
          borderColor: '#6C5CE7',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: currLabel,
          data: data.map(d => d.month2Value),
          backgroundColor: 'rgba(232, 67, 147, 0.6)',
          borderColor: '#E84393',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  });

  readonly comparisonChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 16,
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
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ctx.parsed.x ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(108, 92, 231, 0.06)' },
        ticks: {
          font: { family: "'Space Mono', monospace", size: 11 },
          color: '#6B7194',
          callback: (value) => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
          }).format(value as number),
        },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: "'DM Sans', sans-serif", size: 12 }, color: '#6B7194' },
      },
    },
  };

  readonly comparisonSummary = computed(() => {
    const data = this.comparisonData();
    const totalPrev = data.reduce((s, d) => s + d.month1Value, 0);
    const totalCurr = data.reduce((s, d) => s + d.month2Value, 0);
    const diff = totalCurr - totalPrev;
    const percentChange = totalPrev > 0 ? (diff / totalPrev) * 100 : 0;
    const increased = data.filter(d => d.month2Value > d.month1Value);
    const decreased = data.filter(d => d.month2Value < d.month1Value);

    return { totalPrev, totalCurr, diff, percentChange: Math.round(percentChange * 10) / 10, increased: increased.length, decreased: decreased.length };
  });

  hasComparisonData = computed(() => this.comparisonData().length > 0);

  readonly prevMonthLabel = computed(() => {
    const prevDate = new Date(this.year(), this.month() - 1, 1);
    return prevDate.toLocaleDateString('pt-BR', { month: 'long' });
  });

  readonly currMonthLabel = computed(() => {
    return new Date(this.year(), this.month(), 1).toLocaleDateString('pt-BR', { month: 'long' });
  });

  // ==============================
  // Tab 7 - Insights / Analises
  // ==============================

  readonly insights = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    return this.transactionService.getExpenseInsights(this.year(), this.month(), accountId);
  });

  readonly topExpenses = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const txns = this.transactionService.getTopExpenses(this.year(), this.month(), 10, accountId);

    return txns.map(t => {
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

  readonly monthComparison = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    return this.transactionService.getMonthOverMonthComparison(this.year(), this.month(), accountId);
  });

  readonly weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  readonly expenseByWeekday = computed(() => {
    const freq = this.insights().expenseFrequency;
    const maxVal = Math.max(...Array.from(freq.values()));
    return Array.from(freq.entries()).map(([day, amount]) => ({
      day,
      label: this.weekdayLabels[day],
      amount,
      percentage: maxVal > 0 ? (amount / maxVal) * 100 : 0,
    }));
  });

  readonly biggestCategoryName = computed(() => {
    const bc = this.insights().biggestCategory;
    if (!bc) return '';
    const cat = this.categoryService.getById(bc.categoryId);
    return cat ? `${cat.icon} ${cat.name}` : '';
  });

  hasInsightsData = computed(() => this.insights().transactionCount > 0);

  // ==============================
  // Tab 8 - Investimentos
  // ==============================

  readonly hasInvestmentAccounts = computed(() =>
    this.accountService.allInvestmentAccounts().length > 0
  );

  readonly investmentsSummary = computed(() => {
    this.transactionService.transactions();
    return this.transactionService.getAllInvestmentsSummary();
  });

  readonly investmentDonutSegments = computed<DonutSegment[]>(() => {
    const s = this.investmentsSummary();
    return s.accounts
      .filter(a => a.summary.currentBalance > 0)
      .map(a => ({
        label: a.account.name,
        value: a.summary.currentBalance,
        color: a.account.color,
      }));
  });

  // ==============================
  // Helper
  // ==============================

  readonly fmt = (v: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(v);

  // ==============================
  // Annual Reports
  // ==============================

  readonly selectedYear = computed(() => this.year());

  /** Annual totals by category */
  readonly annualCategoryTotals = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const year = this.year();

    const categoryTotals = new Map<string, { total: number; monthly: number[] }>();

    for (let m = 0; m < 12; m++) {
      const catMap = this.transactionService.getExpensesByCategory(year, m, accountId);
      catMap.forEach((amount, catId) => {
        if (!categoryTotals.has(catId)) {
          categoryTotals.set(catId, { total: 0, monthly: new Array(12).fill(0) });
        }
        const entry = categoryTotals.get(catId)!;
        entry.total += amount;
        entry.monthly[m] = amount;
      });
    }

    return Array.from(categoryTotals.entries())
      .map(([catId, data]) => {
        const cat = this.categoryService.getById(catId);
        return {
          categoryId: catId,
          categoryName: cat?.name ?? 'Desconhecida',
          categoryIcon: cat?.icon ?? '❓',
          categoryColor: cat?.color ?? '#6B7194',
          total: Math.round(data.total * 100) / 100,
          monthly: data.monthly.map(v => Math.round(v * 100) / 100),
          average: Math.round((data.total / 12) * 100) / 100,
        };
      })
      .sort((a, b) => b.total - a.total);
  });

  /** Annual fixed expenses */
  readonly annualFixedExpenses = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const year = this.year();

    // Group by description (fixed expenses tend to have same description)
    const fixedMap = new Map<string, { total: number; monthly: number[]; categoryId: string; count: number }>();

    for (let m = 0; m < 12; m++) {
      const txns = this.transactionService.getByMonth(year, m, accountId)
        .filter(t => t.type === 'expense' && (t.isFixed || t.recurringId));

      txns.forEach(t => {
        const key = t.description.toLowerCase().trim();
        if (!fixedMap.has(key)) {
          fixedMap.set(key, { total: 0, monthly: new Array(12).fill(0), categoryId: t.categoryId, count: 0 });
        }
        const entry = fixedMap.get(key)!;
        entry.total += t.amount;
        entry.monthly[m] = t.amount;
        entry.count++;
      });
    }

    return Array.from(fixedMap.entries())
      .map(([desc, data]) => {
        const cat = this.categoryService.getById(data.categoryId);
        return {
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          categoryName: cat?.name ?? '',
          categoryIcon: cat?.icon ?? '',
          total: Math.round(data.total * 100) / 100,
          monthly: data.monthly,
          monthsActive: data.count,
          average: data.count > 0 ? Math.round((data.total / data.count) * 100) / 100 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  });

  /** Month-by-month heatmap data */
  readonly monthlyHeatmap = computed(() => {
    const accountId = this.accountService.selectedAccountId();
    this.transactionService.transactions();
    const year = this.year();

    const months: string[] = [];
    const data: { month: string; income: number; expense: number; balance: number }[] = [];

    for (let m = 0; m < 12; m++) {
      const monthLabel = new Date(year, m, 1).toLocaleDateString('pt-BR', { month: 'short' });
      const summary = this.transactionService.getSummary(year, m, accountId);
      months.push(monthLabel);
      data.push({
        month: monthLabel,
        income: summary.income,
        expense: summary.expense,
        balance: summary.income - summary.expense,
      });
    }

    const totalIncome = data.reduce((s, d) => s + d.income, 0);
    const totalExpense = data.reduce((s, d) => s + d.expense, 0);

    return { months, data, totalIncome, totalExpense, totalBalance: totalIncome - totalExpense };
  });

  readonly monthLabelsShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  hasAnnualData = computed(() => this.annualCategoryTotals().length > 0);
}
