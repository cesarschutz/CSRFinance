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
  template: `
    <input
      #inputEl
      type="text"
      inputmode="numeric"
      [class]="cssClass"
      [placeholder]="placeholder"
      [value]="displayValue()"
      (keydown)="onKeyDown($event)"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
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
