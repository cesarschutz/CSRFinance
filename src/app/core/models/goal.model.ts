export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  accountId?: string;
  createdAt: string;
}

export interface GoalProgress {
  goal: Goal;
  percentage: number;
  remaining: number;
  monthlyNeeded: number;
  status: 'on_track' | 'behind' | 'completed';
}
