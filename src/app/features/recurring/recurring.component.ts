import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { RecurringTransactionService } from '../../core/services/recurring-transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';

import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { CurrencyBrlPipe } from '../../shared/pipes/currency-brl.pipe';

import { RecurringTransaction, RecurrenceFrequency } from '../../core/models/recurring-transaction.model';
import { TransactionType, TransactionStatus } from '../../core/models/transaction.model';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    EmptyStateComponent,
    CurrencyBrlPipe,
  ],
  templateUrl: './recurring.component.html',
  styleUrl: './recurring.component.scss',
})
export class RecurringComponent {
  private recurringService = inject(RecurringTransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);

  showModal = signal(false);
  editingRecurrence = signal<RecurringTransaction | null>(null);
  showDeleteConfirm = signal(false);
  deletingRecurrence = signal<RecurringTransaction | null>(null);
  filterType = signal<'all' | 'active' | 'paused'>('all');

  form = new FormGroup({
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<TransactionType>('expense', { nonNullable: true }),
    amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    accountId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    frequency: new FormControl<RecurrenceFrequency>('monthly', { nonNullable: true }),
    dayOfMonth: new FormControl<number | null>(null),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true }),
    status: new FormControl<TransactionStatus>('settled', { nonNullable: true }),
  });

  readonly recurrences = computed(() => {
    const all = this.recurringService.recurringTransactions();
    const filter = this.filterType();
    if (filter === 'active') return all.filter(r => r.active);
    if (filter === 'paused') return all.filter(r => !r.active);
    return all;
  });

  readonly categories = computed(() => this.categoryService.categories());
  readonly accounts = computed(() => this.accountService.accounts());

  readonly filteredCategories = computed(() => {
    const type = this.form.controls.type.value;
    return this.categoryService.getByType(type === 'transfer' ? 'expense' : type);
  });

  readonly modalTitle = computed(() =>
    this.editingRecurrence() ? 'Editar Recorrência' : 'Nova Recorrência'
  );

  readonly filterTabs: { label: string; value: 'all' | 'active' | 'paused' }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Ativas', value: 'active' },
    { label: 'Pausadas', value: 'paused' },
  ];

  readonly frequencyOptions: { label: string; value: RecurrenceFrequency }[] = [
    { label: 'Semanal', value: 'weekly' },
    { label: 'Quinzenal', value: 'biweekly' },
    { label: 'Mensal', value: 'monthly' },
    { label: 'Anual', value: 'yearly' },
  ];

  setFilter(type: 'all' | 'active' | 'paused'): void {
    this.filterType.set(type);
  }

  getCategoryName(categoryId: string): string {
    if (!categoryId) return '—';
    const cat = this.categoryService.getById(categoryId);
    return cat ? `${cat.icon} ${cat.name}` : '—';
  }

  getAccountName(accountId: string): string {
    const acc = this.accountService.getById(accountId);
    return acc?.name ?? '—';
  }

  getFrequencyLabel(frequency: RecurrenceFrequency): string {
    return this.recurringService.getFrequencyLabel(frequency);
  }

  getNextDate(rec: RecurringTransaction): string | null {
    return this.recurringService.getNextDate(rec);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  openNewModal(): void {
    this.editingRecurrence.set(null);
    this.form.reset({
      description: '',
      type: 'expense',
      amount: null,
      categoryId: '',
      accountId: this.accounts().length > 0 ? this.accounts()[0].id : '',
      frequency: 'monthly',
      dayOfMonth: null,
      startDate: '',
      endDate: '',
      status: 'settled',
    });
    this.showModal.set(true);
  }

  openEditModal(rec: RecurringTransaction): void {
    this.editingRecurrence.set(rec);
    this.form.setValue({
      description: rec.description,
      type: rec.type,
      amount: rec.amount,
      categoryId: rec.categoryId,
      accountId: rec.accountId,
      frequency: rec.frequency,
      dayOfMonth: rec.dayOfMonth ?? null,
      startDate: rec.startDate,
      endDate: rec.endDate ?? '',
      status: rec.status,
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRecurrence.set(null);
  }

  saveRecurrence(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const data = {
      description: v.description,
      type: v.type,
      amount: v.amount!,
      categoryId: v.categoryId,
      accountId: v.accountId,
      frequency: v.frequency,
      startDate: v.startDate,
      status: v.status,
      ...(v.endDate ? { endDate: v.endDate } : {}),
      ...(v.dayOfMonth ? { dayOfMonth: v.dayOfMonth } : {}),
    };

    const editing = this.editingRecurrence();
    if (editing) {
      this.recurringService.update(editing.id, data);
    } else {
      this.recurringService.add(data);
    }

    this.closeModal();
  }

  toggleActive(rec: RecurringTransaction): void {
    this.recurringService.toggleActive(rec.id);
  }

  confirmDelete(rec: RecurringTransaction): void {
    this.deletingRecurrence.set(rec);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingRecurrence.set(null);
  }

  executeDelete(): void {
    const rec = this.deletingRecurrence();
    if (rec) {
      this.recurringService.delete(rec.id);
    }
    this.cancelDelete();
  }
}
