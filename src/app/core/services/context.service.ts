import { Injectable, signal, computed } from '@angular/core';

export type AppContext = 'accounts' | 'investments';

@Injectable({ providedIn: 'root' })
export class ContextService {
  private contextSignal = signal<AppContext>('accounts');

  readonly context = this.contextSignal.asReadonly();
  readonly isAccounts = computed(() => this.contextSignal() === 'accounts');
  readonly isInvestments = computed(() => this.contextSignal() === 'investments');

  setContext(ctx: AppContext): void {
    this.contextSignal.set(ctx);
  }

  toggle(): void {
    this.contextSignal.update(c => c === 'accounts' ? 'investments' : 'accounts');
  }
}
