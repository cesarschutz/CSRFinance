import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { Account } from '../../core/models/account.model';
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

  readonly presetColors = PRESET_COLORS;
  selectedColor = signal('#6C5CE7');

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    bank: ['', Validators.required],
    initialBalance: [0, Validators.required],
  });

  readonly accounts = computed(() => this.accountService.accounts());
  readonly balances = computed(() => this.transactionService.accountBalances());

  getBalance(accountId: string): number {
    return this.balances().get(accountId) ?? 0;
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
    this.form.reset({ name: '', bank: '', initialBalance: 0 });
    this.selectedColor.set('#6C5CE7');
    this.showModal.set(true);
  }

  openEditModal(account: Account): void {
    this.editingAccount.set(account);
    this.form.patchValue({
      name: account.name,
      bank: account.bank,
      initialBalance: account.initialBalance,
    });
    this.selectedColor.set(account.color);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingAccount.set(null);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  saveAccount(): void {
    if (this.form.invalid) return;

    const { name, bank, initialBalance } = this.form.value;
    const color = this.selectedColor();

    const editing = this.editingAccount();
    if (editing) {
      this.accountService.update(editing.id, { name, bank, initialBalance, color });
    } else {
      this.accountService.add({ name, bank, initialBalance, color });
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
}
