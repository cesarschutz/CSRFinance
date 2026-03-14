import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { TransactionService, InvestmentSummary } from '../../core/services/transaction.service';
import { Account, AccountType } from '../../core/models/account.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

const PRESET_COLORS = [
  '#6C5CE7', '#E84393', '#00B894', '#0984E3', '#FDCB6E',
  '#E17055', '#00CEC9', '#2D3436', '#D63031', '#6C5B7B',
  '#F8B500', '#636E72', '#A29BFE', '#74B9FF', '#55EFC4',
  '#FF7675',
];

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, EmptyStateComponent, CurrencyInputComponent, CurrencyBrlPipe],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent {
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private fb = inject(FormBuilder);

  showModal = signal(false);
  editingAccount = signal<Account | null>(null);
  showBalanceModal = signal(false);
  balanceUpdateAccount = signal<Account | null>(null);
  balanceAmountControl = new FormControl(0);

  readonly presetColors = PRESET_COLORS;
  selectedColor = signal('#6C5CE7');
  selectedType = signal<AccountType>('checking');

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    bank: ['', Validators.required],
    initialBalance: [0],
    parentAccountId: [''],
    investmentDate: [''],
    maturityDate: [''],
  });

  readonly checkingAccounts = computed(() => this.accountService.checkingAccounts());
  readonly investmentAccounts = computed(() => this.accountService.allInvestmentAccounts());
  readonly balances = computed(() => this.transactionService.accountBalances());

  getBalance(accountId: string): number {
    return this.balances().get(accountId) ?? 0;
  }

  getInvestmentSummary(accountId: string): InvestmentSummary {
    return this.transactionService.getInvestmentSummary(accountId);
  }

  getParentAccount(parentId: string | undefined): Account | undefined {
    if (!parentId) return undefined;
    return this.accountService.getById(parentId);
  }

  getAccountTypeLabel(type: AccountType): string {
    switch (type) {
      case 'checking': return 'Corrente';
      case 'savings': return 'Poupança';
      case 'credit_card': return 'Cartão de Crédito';
      case 'investment': return 'Investimento';
      default: return type;
    }
  }

  getGradient(color: string): string {
    return `linear-gradient(135deg, ${color} 0%, ${this.adjustColor(color, -30)} 100%)`;
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  openNewModal(): void {
    this.editingAccount.set(null);
    this.form.reset({ name: '', bank: '', initialBalance: 0, parentAccountId: '', investmentDate: '', maturityDate: '' });
    this.selectedColor.set('#6C5CE7');
    this.selectedType.set('checking');
    this.showModal.set(true);
  }

  openEditModal(account: Account): void {
    this.editingAccount.set(account);
    this.form.patchValue({
      name: account.name,
      bank: account.bank,
      initialBalance: account.initialBalance,
      parentAccountId: account.parentAccountId ?? '',
      investmentDate: account.investmentDate ?? '',
      maturityDate: account.maturityDate ?? '',
    });
    this.selectedColor.set(account.color);
    this.selectedType.set(account.type ?? 'checking');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingAccount.set(null);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  selectType(type: AccountType): void {
    this.selectedType.set(type);
  }

  saveAccount(): void {
    if (this.form.invalid) return;

    const { name, bank, initialBalance, parentAccountId, investmentDate, maturityDate } = this.form.value;
    const color = this.selectedColor();
    const type = this.selectedType();

    const accountData: Partial<Account> = {
      name, bank, initialBalance, color, type,
      ...(type !== 'checking' && parentAccountId ? { parentAccountId } : { parentAccountId: undefined }),
      ...(type === 'investment' && investmentDate ? { investmentDate } : { investmentDate: undefined }),
      ...(type === 'investment' && maturityDate ? { maturityDate } : { maturityDate: undefined }),
    };

    const editing = this.editingAccount();
    if (editing) {
      this.accountService.update(editing.id, accountData);
    } else {
      this.accountService.add(accountData as Omit<Account, 'id' | 'createdAt'>);
    }

    this.closeModal();
  }

  deleteAccount(account: Account): void {
    const txnCount = this.transactionService.transactions()
      .filter(t => t.accountId === account.id).length;

    const message = txnCount > 0
      ? `A conta "${account.name}" possui ${txnCount} transação(ões) vinculada(s). Excluir a conta não remove as transações. Deseja continuar?`
      : `Tem certeza que deseja excluir a conta "${account.name}"?`;

    if (confirm(message)) {
      this.accountService.delete(account.id);
    }
  }

  // Balance Update Modal
  openBalanceUpdate(account: Account): void {
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
