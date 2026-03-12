import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';

import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { SummaryCardsComponent, SummaryCard } from '../../shared/components/summary-cards/summary-cards.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

import { Transaction, TransactionType, TransactionStatus } from '../../core/models/transaction.model';
import { Category } from '../../core/models/category.model';
import { Account } from '../../core/models/account.model';

type FilterType = 'all' | 'expense' | 'income';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MonthPickerComponent,
    SummaryCardsComponent,
    ModalComponent,
    EmptyStateComponent,
    CurrencyBrlPipe,
  ],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss',
})
export class TransactionsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);

  // State signals
  year = signal(new Date().getFullYear());
  month = signal(new Date().getMonth());
  filterType = signal<FilterType>('all');
  searchTerm = signal('');
  editingTransaction = signal<Transaction | null>(null);
  showModal = signal(false);
  showDeleteConfirm = signal(false);
  deletingTransactionId = signal<string | null>(null);

  // Form
  transactionForm = new FormGroup({
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
    type: new FormControl<TransactionType>('expense', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    accountId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    status: new FormControl<TransactionStatus>('settled', { nonNullable: true }),
  });

  // Computed
  selectedAccountId = computed(() => this.accountService.selectedAccountId());

  summary = computed(() => {
    return this.transactionService.getSummary(
      this.year(),
      this.month(),
      this.selectedAccountId(),
    );
  });

  summaryCards = computed<SummaryCard[]>(() => {
    const s = this.summary();
    return [
      { label: 'Receitas', value: s.income, type: 'income', icon: '📈' },
      { label: 'Despesas', value: s.expense, type: 'expense', icon: '📉' },
      { label: 'Balanço', value: s.balance, type: 'balance', icon: '💰' },
    ];
  });

  transactions = computed(() => {
    const all = this.transactionService.getByMonth(
      this.year(),
      this.month(),
      this.selectedAccountId(),
    );

    let filtered = all;

    // Filter by type
    const type = this.filterType();
    if (type === 'income') {
      filtered = filtered.filter(t => t.type === 'income');
    } else if (type === 'expense') {
      filtered = filtered.filter(t => t.type === 'expense');
    }

    // Filter by search term
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(term)
      );
    }

    // Sort by date descending
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  });

  categories = computed(() => this.categoryService.categories());
  accounts = computed(() => this.accountService.accounts());

  filteredCategories = computed(() => {
    const type = this.transactionForm.controls.type.value;
    return this.categoryService.getByType(type);
  });

  modalTitle = computed(() => {
    const editing = this.editingTransaction();
    if (editing) return 'Editar Transação';
    const type = this.transactionForm.controls.type.value;
    return type === 'income' ? 'Nova Receita' : 'Nova Despesa';
  });

  ngOnInit(): void {
    // Listen to type changes to reset categoryId when type switches
    this.transactionForm.controls.type.valueChanges.subscribe(() => {
      this.transactionForm.controls.categoryId.setValue('');
    });
  }

  onMonthChange(event: { year: number; month: number }): void {
    this.year.set(event.year);
    this.month.set(event.month);
  }

  setFilter(type: FilterType): void {
    this.filterType.set(type);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  getCategoryName(categoryId: string): string {
    const cat = this.categoryService.getById(categoryId);
    return cat ? `${cat.icon} ${cat.name}` : '—';
  }

  getCategoryIcon(categoryId: string): string {
    const cat = this.categoryService.getById(categoryId);
    return cat?.icon ?? '';
  }

  getAccountName(accountId: string): string {
    const acc = this.accountService.getById(accountId);
    return acc?.name ?? '—';
  }

  formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Modal actions
  openNewTransaction(type: TransactionType): void {
    this.editingTransaction.set(null);
    this.transactionForm.reset({
      description: '',
      date: '',
      amount: null,
      type,
      categoryId: '',
      accountId: this.accounts().length > 0 ? this.accounts()[0].id : '',
      status: 'settled',
    });
    this.showModal.set(true);
  }

  openEditTransaction(transaction: Transaction): void {
    this.editingTransaction.set(transaction);
    this.transactionForm.setValue({
      description: transaction.description,
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      status: transaction.status,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingTransaction.set(null);
  }

  saveTransaction(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    const formValue = this.transactionForm.getRawValue();
    const data = {
      description: formValue.description,
      date: formValue.date,
      amount: formValue.amount!,
      type: formValue.type,
      categoryId: formValue.categoryId,
      accountId: formValue.accountId,
      status: formValue.status,
    };

    const editing = this.editingTransaction();
    if (editing) {
      this.transactionService.update(editing.id, data);
    } else {
      this.transactionService.add(data);
    }

    this.closeModal();
  }

  // Delete actions
  confirmDelete(transactionId: string): void {
    this.deletingTransactionId.set(transactionId);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingTransactionId.set(null);
  }

  executeDelete(): void {
    const id = this.deletingTransactionId();
    if (id) {
      this.transactionService.delete(id);
    }
    this.cancelDelete();
  }
}
