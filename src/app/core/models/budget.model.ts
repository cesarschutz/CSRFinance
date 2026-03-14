export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  year: number;
  month: number;
  createdAt: string;
}

export interface BudgetProgress {
  budget: Budget;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}
