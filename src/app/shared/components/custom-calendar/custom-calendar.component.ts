import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-custom-calendar',
  standalone: true,
  imports: [CommonModule],
  host: { style: 'flex: 1; min-width: 0;' },
  templateUrl: './custom-calendar.component.html',
  styleUrl: './custom-calendar.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomCalendarComponent),
      multi: true
    }
  ]
})
export class CustomCalendarComponent implements ControlValueAccessor {
  private elementRef = inject(ElementRef);
  
  // Date state
  selectedDate = signal<Date | null>(new Date());
  
  // Quick selections
  activePill = signal<'today' | 'yesterday' | 'other' | null>('today');
  showPopover = signal(false);

  // Calendar render state
  currentMonth = signal(new Date());

  onChange = (value: string) => {};
  onTouched = () => {};

  // Formating utilities
  isToday(d: Date): boolean {
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  }

  isYesterday(d: Date): boolean {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    return d.getDate() === yest.getDate() &&
      d.getMonth() === yest.getMonth() &&
      d.getFullYear() === yest.getFullYear();
  }

  formatDateForInput(d: Date | null): string {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Value Accessor
  writeValue(value: string): void {
    if (value) {
      // Must parse YYYY-MM-DD correctly without timezone shifts
      const [y, m, d] = value.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      this.selectedDate.set(date);
      this.currentMonth.set(date);

      if (this.isToday(date)) this.activePill.set('today');
      else if (this.isYesterday(date)) this.activePill.set('yesterday');
      else this.activePill.set('other');
    } else {
      this.selectedDate.set(null);
      this.activePill.set(null);
    }
  }
  
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // Interactions
  selectToday(): void {
    const today = new Date();
    this.selectedDate.set(today);
    this.activePill.set('today');
    this.showPopover.set(false);
    this.currentMonth.set(today);
    this.onChange(this.formatDateForInput(today));
    this.onTouched();
  }

  selectYesterday(): void {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    this.selectedDate.set(yest);
    this.activePill.set('yesterday');
    this.showPopover.set(false);
    this.currentMonth.set(yest);
    this.onChange(this.formatDateForInput(yest));
    this.onTouched();
  }

  openPopover(): void {
    this.showPopover.set(true);
    // If we open it, we default to showing the calendar
    this.activePill.set('other');
  }

  closePopover(): void {
    this.showPopover.set(false);
    this.onTouched();
  }

  togglePopover(ev: Event): void {
    ev.stopPropagation();
    if (this.showPopover()) {
      this.closePopover();
    } else {
      this.openPopover();
    }
  }

  // Calendar logic
  monthLabel = computed(() => {
    return this.currentMonth().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  });

  headerLabel = computed(() => {
    const d = this.selectedDate() || this.currentMonth();
    const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `${d.getFullYear()}\n${weekday}, ${month} ${d.getDate()}`;
  });

  prevMonth(ev: Event): void {
    ev.stopPropagation();
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
  }

  nextMonth(ev: Event): void {
    ev.stopPropagation();
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
  }

  selectDate(day: number): void {
    const newDate = new Date(this.currentMonth().getFullYear(), this.currentMonth().getMonth(), day);
    this.selectedDate.set(newDate);
    
    if (this.isToday(newDate)) this.activePill.set('today');
    else if (this.isYesterday(newDate)) this.activePill.set('yesterday');
    else this.activePill.set('other');

    this.onChange(this.formatDateForInput(newDate));
  }

  confirmSelection(): void {
    this.showPopover.set(false);
    this.onTouched();
  }

  // Grid computation
  calendarDays = computed(() => {
    const monthDate = this.currentMonth();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // JS dates have 0=Sunday, 1=Monday...
    const startOffset = firstDay.getDay(); // Sunday based
    
    const days: (number | null)[] = [];
    
    // Empty slots before 1st day
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    
    // Actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(i);
    }
    
    return days;
  });

  isSelected(day: number | null): boolean {
    if (!day) return false;
    const s = this.selectedDate();
    if (!s) return false;
    
    return s.getDate() === day &&
      s.getMonth() === this.currentMonth().getMonth() &&
      s.getFullYear() === this.currentMonth().getFullYear();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.showPopover() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closePopover();
    }
  }
}
