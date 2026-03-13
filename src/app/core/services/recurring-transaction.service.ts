import { Injectable, signal, computed } from '@angular/core';
import { RecurringTransaction, RecurrenceFrequency } from '../models/recurring-transaction.model';
import { Transaction } from '../models/transaction.model';
import { StorageService } from './storage.service';
import { TransactionService } from './transaction.service';

@Injectable({ providedIn: 'root' })
export class RecurringTransactionService {
  private readonly STORAGE_KEY = 'recurringTransactions';
  private recurringSignal = signal<RecurringTransaction[]>([]);

  readonly recurringTransactions = this.recurringSignal.asReadonly();

  readonly activeRecurrences = computed(() =>
    this.recurringSignal().filter(r => r.active)
  );

  constructor(
    private storage: StorageService,
    private transactionService: TransactionService,
  ) {
    this.load();
    this.generatePendingTransactions();
  }

  private load(): void {
    const stored = this.storage.get<RecurringTransaction[]>(this.STORAGE_KEY);
    this.recurringSignal.set(stored ?? []);
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.recurringSignal());
  }

  loadFromData(data: RecurringTransaction[]): void {
    this.recurringSignal.set(data);
    this.save();
  }

  getById(id: string): RecurringTransaction | undefined {
    return this.recurringSignal().find(r => r.id === id);
  }

  add(rec: Omit<RecurringTransaction, 'id' | 'createdAt' | 'lastGeneratedDate' | 'active'>): void {
    const newRec: RecurringTransaction = {
      ...rec,
      id: 'rec-' + Date.now(),
      lastGeneratedDate: this.getDateBefore(rec.startDate, rec.frequency),
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.recurringSignal.update(list => [...list, newRec]);
    this.save();
    this.generateForRecurrence(newRec);
  }

  update(id: string, changes: Partial<RecurringTransaction>): void {
    this.recurringSignal.update(list =>
      list.map(r => (r.id === id ? { ...r, ...changes } : r))
    );
    this.save();
  }

  delete(id: string): void {
    this.recurringSignal.update(list => list.filter(r => r.id !== id));
    this.save();
  }

  toggleActive(id: string): void {
    const rec = this.getById(id);
    if (!rec) return;
    this.update(id, { active: !rec.active });
    if (!rec.active) {
      this.generateForRecurrence({ ...rec, active: true });
    }
  }

  getNextDate(rec: RecurringTransaction): string | null {
    const next = this.calculateNextDate(rec.lastGeneratedDate, rec.frequency, rec.dayOfMonth, rec.dayOfWeek);
    if (rec.endDate && next > rec.endDate) return null;
    return next;
  }

  getFrequencyLabel(frequency: RecurrenceFrequency): string {
    const labels: Record<RecurrenceFrequency, string> = {
      weekly: 'Semanal',
      biweekly: 'Quinzenal',
      monthly: 'Mensal',
      yearly: 'Anual',
    };
    return labels[frequency];
  }

  // === Generation Logic ===

  generatePendingTransactions(): void {
    const today = this.todayStr();
    const active = this.recurringSignal().filter(r => r.active);
    for (const rec of active) {
      this.generateForRecurrence(rec, today);
    }
  }

  private generateForRecurrence(rec: RecurringTransaction, upToDate?: string): void {
    if (!rec.active) return;
    const limit = upToDate ?? this.todayStr();
    const existingTxns = this.transactionService.transactions();

    let nextDate = this.calculateNextDate(rec.lastGeneratedDate, rec.frequency, rec.dayOfMonth, rec.dayOfWeek);
    let lastGenerated = rec.lastGeneratedDate;
    let generated = false;

    while (nextDate <= limit) {
      if (rec.endDate && nextDate > rec.endDate) break;

      // Duplicate check
      const alreadyExists = existingTxns.some(
        t => t.recurringId === rec.id && t.date === nextDate
      );

      if (!alreadyExists) {
        this.transactionService.add({
          description: rec.description,
          amount: rec.amount,
          type: rec.type,
          categoryId: rec.categoryId,
          accountId: rec.accountId,
          date: nextDate,
          status: rec.status,
          recurringId: rec.id,
        });
        generated = true;
      }

      lastGenerated = nextDate;
      nextDate = this.calculateNextDate(nextDate, rec.frequency, rec.dayOfMonth, rec.dayOfWeek);
    }

    if (lastGenerated !== rec.lastGeneratedDate) {
      this.recurringSignal.update(list =>
        list.map(r => (r.id === rec.id ? { ...r, lastGeneratedDate: lastGenerated } : r))
      );
      this.save();
    }
  }

  // === Date Helpers ===

  private calculateNextDate(fromDate: string, frequency: RecurrenceFrequency, dayOfMonth?: number, dayOfWeek?: number): string {
    const d = new Date(fromDate + 'T00:00:00');

    switch (frequency) {
      case 'weekly':
        d.setDate(d.getDate() + 7);
        break;
      case 'biweekly':
        d.setDate(d.getDate() + 14);
        break;
      case 'monthly': {
        const targetDay = dayOfMonth ?? d.getDate();
        d.setMonth(d.getMonth() + 1);
        const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(targetDay, maxDay));
        break;
      }
      case 'yearly': {
        const targetDayY = dayOfMonth ?? d.getDate();
        d.setFullYear(d.getFullYear() + 1);
        const maxDayY = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(targetDayY, maxDayY));
        break;
      }
    }

    return this.formatDate(d);
  }

  private getDateBefore(startDate: string, frequency: RecurrenceFrequency): string {
    const d = new Date(startDate + 'T00:00:00');
    switch (frequency) {
      case 'weekly': d.setDate(d.getDate() - 7); break;
      case 'biweekly': d.setDate(d.getDate() - 14); break;
      case 'monthly': d.setMonth(d.getMonth() - 1); break;
      case 'yearly': d.setFullYear(d.getFullYear() - 1); break;
    }
    return this.formatDate(d);
  }

  private todayStr(): string {
    return this.formatDate(new Date());
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
