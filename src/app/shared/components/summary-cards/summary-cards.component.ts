import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyBrlPipe } from '../../pipes/currency-brl.pipe';

export interface SummaryCard {
  label: string;
  value: number;
  type: 'balance' | 'income' | 'expense' | 'neutral';
  icon: string;
}

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [CommonModule, CurrencyBrlPipe],
  template: `
    <div class="summary-cards">
      @for (card of cards; track card.label) {
        <div class="summary-card" [class]="'card-' + card.type">
          <div class="card-icon">{{ card.icon }}</div>
          <div class="card-content">
            <span class="card-label">{{ card.label }}</span>
            <span class="card-value money" [class]="'value-' + card.type">
              {{ card.value | currencyBrl }}
            </span>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './summary-cards.component.scss',
})
export class SummaryCardsComponent {
  @Input() cards: SummaryCard[] = [];
}
