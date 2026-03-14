import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { TransactionService, InvestmentSummary, MonthlyInvestmentData } from '../../core/services/transaction.service';
import { Account } from '../../core/models/account.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SummaryCardsComponent } from '../../shared/components/summary-cards/summary-cards.component';
import { DonutChartComponent } from '../../shared/components/donut-chart/donut-chart.component';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, ModalComponent, CurrencyInputComponent,
    CurrencyBrlPipe, EmptyStateComponent, SummaryCardsComponent, DonutChartComponent,
  ],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
})
export class InvestmentsComponent {
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);

  showBalanceModal = signal(false);
  balanceUpdateAccount = signal<Account | null>(null);
  balanceAmountControl = new FormControl(0);

  expandedAccountId = signal<string | null>(null);

  readonly investmentAccounts = computed(() => this.accountService.allInvestmentAccounts());

  readonly allSummary = computed(() => this.transactionService.getAllInvestmentsSummary());

  readonly summaryCards = computed(() => {
    const s = this.allSummary();
    return [
      { label: 'Total Investido', value: s.totalInvested, type: 'neutral' as const, icon: '💰' },
      { label: 'Valor Real', value: s.totalReal, type: 'balance' as const, icon: '📊' },
      { label: 'Rendimento', value: s.totalYield, type: 'income' as const, icon: '📈' },
      { label: '% Rendimento', value: s.yieldPercentage, type: 'neutral' as const, icon: '🎯',
        detail: `${s.yieldPercentage.toFixed(2)}%` },
    ];
  });

  readonly donutSegments = computed(() => {
    const s = this.allSummary();
    return s.accounts
      .filter(a => a.summary.currentBalance > 0)
      .map(a => ({
        label: a.account.name,
        value: a.summary.currentBalance,
        color: a.account.color,
      }));
  });

  getInvestmentSummary(accountId: string): InvestmentSummary {
    return this.transactionService.getInvestmentSummary(accountId);
  }

  getMonthlyData(accountId: string): MonthlyInvestmentData[] {
    return this.transactionService.getMonthlyInvestmentData(accountId);
  }

  getBalance(accountId: string): number {
    return this.transactionService.accountBalances().get(accountId) ?? 0;
  }

  getAccountTypeLabel(account: Account): string {
    return account.type === 'savings' ? 'Poupanca' : 'Investimento';
  }

  toggleExpand(accountId: string): void {
    this.expandedAccountId.set(
      this.expandedAccountId() === accountId ? null : accountId
    );
  }

  // Balance Update Modal
  openBalanceUpdate(account: Account, event: Event): void {
    event.stopPropagation();
    this.balanceUpdateAccount.set(account);
    this.balanceAmountControl.setValue(this.getBalance(account.id));
    this.showBalanceModal.set(true);
  }

  closeBalanceModal(): void {
    this.showBalanceModal.set(false);
    this.balanceUpdateAccount.set(null);
  }

  getTrackedBalance(): number {
    const acc = this.balanceUpdateAccount();
    if (!acc) return 0;
    return this.getBalance(acc.id);
  }

  getYieldDifference(): number {
    return (this.balanceAmountControl.value ?? 0) - this.getTrackedBalance();
  }

  saveBalanceUpdate(): void {
    const account = this.balanceUpdateAccount();
    if (!account) return;

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    this.transactionService.addYield({
      accountId: account.id,
      realBalance: this.balanceAmountControl.value ?? 0,
      date: `${y}-${m}-${d}`,
    });

    this.closeBalanceModal();
  }
}
