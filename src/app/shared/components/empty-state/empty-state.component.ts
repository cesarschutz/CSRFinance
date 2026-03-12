import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <span class="empty-icon">{{ icon }}</span>
      <h4>{{ title }}</h4>
      <p>{{ message }}</p>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    h4 {
      color: var(--text);
      margin-bottom: 8px;
      font-size: 1.125rem;
    }

    p {
      color: var(--text-muted);
      font-size: 0.875rem;
      max-width: 300px;
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon = '📭';
  @Input() title = 'Nada por aqui';
  @Input() message = 'Nenhum dado encontrado.';
}
