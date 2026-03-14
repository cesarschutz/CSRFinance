export type TransactionType = 'income' | 'expense' | 'transfer' | 'yield';
export type TransactionStatus = 'settled' | 'pending';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: string;
  status: TransactionStatus;
  createdAt: string;
  transferId?: string;
  transferAccountId?: string;
  recurringId?: string;
  isFixed?: boolean;
  installmentCurrent?: number;
  installmentTotal?: number;
}
