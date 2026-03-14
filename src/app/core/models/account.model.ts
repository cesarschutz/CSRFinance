export type AccountType = 'checking' | 'credit_card' | 'savings' | 'investment';

export interface Account {
  id: string;
  name: string;
  bank: string;
  type: AccountType;
  parentAccountId?: string;
  initialBalance: number;
  color: string;
  createdAt: string;
  investmentDate?: string;
  maturityDate?: string;
  // Credit card specific
  closingDay?: number;   // dia de fechamento da fatura
  dueDay?: number;       // dia de vencimento
  creditLimit?: number;
}
