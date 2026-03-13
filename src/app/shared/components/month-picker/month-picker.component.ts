import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-month-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="month-picker">
      <button class="month-nav" (click)="prev()" aria-label="Mês anterior">
        ‹
      </button>
      <span class="month-label">{{ monthLabel }}</span>
      <button class="month-nav" (click)="next()" aria-label="Próximo mês">
        ›
      </button>
    </div>
  `,
  styles: [`
    .month-picker {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .month-nav {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      color: var(--text-secondary);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--glass-border);

      &:hover {
        background: var(--accent-bg);
        color: var(--accent);
        border-color: var(--accent);
        box-shadow: 0 0 12px rgba(124, 58, 237, 0.2);
      }
    }

    .month-label {
      font-weight: 600;
      font-size: 1rem;
      color: var(--text);
      min-width: 140px;
      text-align: center;
      text-transform: capitalize;
    }
  `],
})
export class MonthPickerComponent {
  @Input() year = new Date().getFullYear();
  @Input() month = new Date().getMonth();
  @Output() monthChange = new EventEmitter<{ year: number; month: number }>();

  get monthLabel(): string {
    const date = new Date(this.year, this.month);
    const month = date.toLocaleDateString('pt-BR', { month: 'long' });
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${this.year}`;
  }

  prev(): void {
    let m = this.month - 1;
    let y = this.year;
    if (m < 0) { m = 11; y--; }
    this.month = m;
    this.year = y;
    this.monthChange.emit({ year: y, month: m });
  }

  next(): void {
    let m = this.month + 1;
    let y = this.year;
    if (m > 11) { m = 0; y++; }
    this.month = m;
    this.year = y;
    this.monthChange.emit({ year: y, month: m });
  }
}
