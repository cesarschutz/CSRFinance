import { Injectable, signal, inject } from '@angular/core';
import { Goal, GoalProgress } from '../models/goal.model';
import { StorageService } from './storage.service';
import { STORAGE_KEYS } from '../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private storage = inject(StorageService);

  private goalsSignal = signal<Goal[]>(this.load());

  readonly goals = this.goalsSignal.asReadonly();

  private load(): Goal[] {
    return this.storage.get<Goal[]>(STORAGE_KEYS.GOALS) ?? [];
  }

  private save(): void {
    this.storage.set(STORAGE_KEYS.GOALS, this.goalsSignal());
  }

  getById(id: string): Goal | undefined {
    return this.goalsSignal().find(g => g.id === id);
  }

  add(goal: Omit<Goal, 'id' | 'createdAt'>): Goal {
    const newGoal: Goal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.goalsSignal.update(list => [...list, newGoal]);
    this.save();
    return newGoal;
  }

  update(id: string, changes: Partial<Goal>): void {
    this.goalsSignal.update(list =>
      list.map(g => g.id === id ? { ...g, ...changes } : g)
    );
    this.save();
  }

  updateProgress(id: string, currentAmount: number): void {
    this.update(id, { currentAmount });
  }

  delete(id: string): void {
    this.goalsSignal.update(list => list.filter(g => g.id !== id));
    this.save();
  }

  getProgress(goal: Goal): GoalProgress {
    const percentage = goal.targetAmount > 0
      ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
      : 0;
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

    let monthlyNeeded = 0;
    if (goal.deadline && remaining > 0) {
      const now = new Date();
      const deadline = new Date(goal.deadline + 'T00:00:00');
      const monthsLeft = Math.max(1,
        (deadline.getFullYear() - now.getFullYear()) * 12 +
        (deadline.getMonth() - now.getMonth())
      );
      monthlyNeeded = Math.round((remaining / monthsLeft) * 100) / 100;
    }

    let status: GoalProgress['status'] = 'on_track';
    if (percentage >= 100) {
      status = 'completed';
    } else if (goal.deadline) {
      const now = new Date();
      const deadline = new Date(goal.deadline + 'T00:00:00');
      const totalMonths = Math.max(1,
        (deadline.getFullYear() - new Date(goal.createdAt).getFullYear()) * 12 +
        (deadline.getMonth() - new Date(goal.createdAt).getMonth())
      );
      const elapsedMonths = Math.max(0,
        (now.getFullYear() - new Date(goal.createdAt).getFullYear()) * 12 +
        (now.getMonth() - new Date(goal.createdAt).getMonth())
      );
      const expectedPercentage = totalMonths > 0 ? (elapsedMonths / totalMonths) * 100 : 0;
      if (percentage < expectedPercentage - 10) {
        status = 'behind';
      }
    }

    return { goal, percentage, remaining, monthlyNeeded, status };
  }

  getAllProgress(): GoalProgress[] {
    return this.goalsSignal().map(g => this.getProgress(g));
  }

  loadFromData(goals: Goal[]): void {
    this.goalsSignal.set(goals);
    this.save();
  }
}
