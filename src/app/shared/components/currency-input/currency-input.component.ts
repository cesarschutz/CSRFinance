import {
  Component,
  Input,
  forwardRef,
  signal,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-currency-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true,
    },
  ],
  host: { style: 'display: contents; flex: 1; min-width: 0;' },
  template: `
    <input
      #inputEl
      type="text"
      inputmode="numeric"
      autocomplete="off"
      [class]="cssClass"
      [placeholder]="placeholder"
      [value]="displayValue()"
      (keydown)="onKeyDown($event)"
      (input)="onInput($event)"
      (focus)="onFocus()"
      (blur)="onTouched()"
    />
  `,
  styles: [`
    :host input {
      border: none;
      background: transparent;
      font-size: 1.5rem;
      font-weight: 700;
      color: inherit;
      width: 100%;
      outline: none;
      font-family: 'DM Sans', sans-serif;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.3px;
      padding: 0;

      &::placeholder {
        color: var(--text-muted);
        font-weight: 500;
      }
    }
  `],
})
export class CurrencyInputComponent implements ControlValueAccessor {
  @Input() cssClass = '';
  @Input() placeholder = '0,00';
  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  /** Internal value in cents (integer) */
  private cents = 0;

  /** Formatted display string */
  displayValue = signal('');

  onChange: (value: number | null) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    if (value == null || value === 0) {
      this.cents = 0;
      this.displayValue.set('');
      return;
    }
    this.cents = Math.round(value * 100);
    this.displayValue.set(this.formatCents(this.cents));
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onFocus(): void {
    // Move cursor to end on focus
    const el = this.inputEl?.nativeElement;
    if (el) {
      setTimeout(() => el.setSelectionRange(el.value.length, el.value.length));
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;

    // Allow navigation keys
    if (['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
      return;
    }

    // Prevent default for everything else - we handle input manually
    event.preventDefault();

    if (key === 'Backspace' || key === 'Delete') {
      // Remove last digit
      this.cents = Math.floor(this.cents / 10);
      this.updateValue();
      return;
    }

    // Only accept digits
    if (key >= '0' && key <= '9') {
      const digit = parseInt(key, 10);
      const newCents = this.cents * 10 + digit;

      // Limit to reasonable amount (999.999.999,99 = ~1 billion)
      if (newCents > 99999999999) return;

      this.cents = newCents;
      this.updateValue();
    }
  }

  onInput(event: Event): void {
    // Prevent any direct input (e.g. paste, autocomplete)
    // Restore the display value
    const input = event.target as HTMLInputElement;
    input.value = this.displayValue();
  }

  private updateValue(): void {
    if (this.cents === 0) {
      this.displayValue.set('');
      this.onChange(null);
    } else {
      this.displayValue.set(this.formatCents(this.cents));
      this.onChange(this.cents / 100);
    }
  }

  private formatCents(cents: number): string {
    const reais = cents / 100;
    // Format without the R$ prefix — just the number
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(reais);
  }
}
