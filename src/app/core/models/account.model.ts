export type AccountType = 'checking' | 'savings' | 'investment';

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
}
