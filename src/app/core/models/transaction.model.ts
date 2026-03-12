export type TransactionType = 'income' | 'expense';
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
}
