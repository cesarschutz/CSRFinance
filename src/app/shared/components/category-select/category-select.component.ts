import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject, forwardRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Category } from '../../../core/models/category.model';

@Component({
  selector: 'app-category-select',
  standalone: true,
  imports: [CommonModule],
  host: { style: 'flex: 1; min-width: 0;' },
  templateUrl: './category-select.component.html',
  styleUrl: './category-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategorySelectComponent),
      multi: true
    }
  ]
})
export class CategorySelectComponent implements ControlValueAccessor {
  private elementRef = inject(ElementRef);
  
  @Input() categories: Category[] = [];
  @Input() placeholder = 'Selecione uma categoria';
  @Input() error = false;

  selectedId = signal<string>('');
  isOpen = signal(false);

  onChange = (value: string) => {};
  onTouched = () => {};

  selectedCategory = computed(() => {
    return this.categories.find(c => c.id === this.selectedId());
  });

  // Value Accessor
  writeValue(value: string): void {
    this.selectedId.set(value || '');
  }
  
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  toggleDropdown(): void {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.onTouched();
    }
  }

  selectCategory(id: string, ev: Event): void {
    ev.stopPropagation();
    this.selectedId.set(id);
    this.onChange(id);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
