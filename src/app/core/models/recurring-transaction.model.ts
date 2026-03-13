import { TransactionType, TransactionStatus } from './transaction.model';

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  status: TransactionStatus;
  lastGeneratedDate: string;
  active: boolean;
  createdAt: string;
}
