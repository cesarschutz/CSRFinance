import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { TransactionService } from '../../core/services/transaction.service';
import { Category, CategoryType } from '../../core/models/category.model';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

type FilterType = 'all' | 'expense' | 'income';

const AVAILABLE_EMOJIS = [
  // Default categories
  '✂️', '🐶', '🏠', '🚬', '📚', '🖥️', '🎉', '🐱',
  '📌', '🍽️', '💊', '🔧', '🛒', '🚗', '👕', '💰',
  // Food & Drink
  '🍔', '☕', '🍕', '🍺', '🍰',
  // Transport
  '⛽', '🚌', '✈️', '🚲',
  // Tech & Home
  '📱', '💻', '💡', '🛋️', '🔑',
  // Entertainment & Sports
  '🎮', '🎬', '🎵', '🏋️', '⚽',
  // Finance & Work
  '💵', '📈', '💳', '🏦', '💼',
  // Shopping & Personal
  '🛍️', '💄', '🎁', '📦',
  // Health & Pets
  '🏥', '🐕', '🐾',
  // Other
  '📝', '🎓', '🌐', '⭐',
];

const PRESET_COLORS = [
  '#6C5CE7', '#E84393', '#00B894', '#FDCB6E', '#0984E3',
  '#E17055', '#00CEC9', '#6C5B7B', '#F8B500', '#2D3436',
  '#D63031', '#74B9FF', '#A29BFE', '#55EFC4', '#FF7675',
  '#636E72',
];

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, EmptyStateComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent {
  private categoryService = inject(CategoryService);
  private transactionService = inject(TransactionService);
  private fb = inject(FormBuilder);

  filterType = signal<FilterType>('all');
  showModal = signal(false);
  editingCategory = signal<Category | null>(null);

  readonly availableEmojis = AVAILABLE_EMOJIS;
  readonly presetColors = PRESET_COLORS;

  selectedEmoji = signal('🛒');
  selectedColor = signal('#6C5CE7');

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['expense' as CategoryType],
  });

  readonly filteredCategories = computed(() => {
    const filter = this.filterType();
    const categories = this.categoryService.categories();
    if (filter === 'all') return categories;
    return categories.filter(c => c.type === filter);
  });

  readonly filterTabs: { label: string; value: FilterType }[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Despesas', value: 'expense' },
    { label: 'Receitas', value: 'income' },
  ];

  setFilter(type: FilterType): void {
    this.filterType.set(type);
  }

  openNewModal(): void {
    this.editingCategory.set(null);
    this.form.reset({ name: '', type: 'expense' });
    this.selectedEmoji.set('🛒');
    this.selectedColor.set('#6C5CE7');
    this.showModal.set(true);
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.form.patchValue({ name: category.name, type: category.type });
    this.selectedEmoji.set(category.icon);
    this.selectedColor.set(category.color);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingCategory.set(null);
  }

  selectEmoji(emoji: string): void {
    this.selectedEmoji.set(emoji);
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
  }

  toggleType(): void {
    const current = this.form.get('type')?.value;
    this.form.patchValue({ type: current === 'expense' ? 'income' : 'expense' });
  }

  saveCategory(): void {
    if (this.form.invalid) return;

    const { name, type } = this.form.value;
    const icon = this.selectedEmoji();
    const color = this.selectedColor();

    const editing = this.editingCategory();
    if (editing) {
      this.categoryService.update(editing.id, { name, type, icon, color });
    } else {
      this.categoryService.add({ name, type, icon, color });
    }

    this.closeModal();
  }

  deleteCategory(category: Category): void {
    const txnCount = this.transactionService.transactions()
      .filter(t => t.categoryId === category.id).length;

    const message = txnCount > 0
      ? `A categoria "${category.name}" possui ${txnCount} transação(ões) vinculada(s). Deseja realmente excluir?`
      : `Tem certeza que deseja excluir a categoria "${category.name}"?`;

    if (confirm(message)) {
      this.categoryService.delete(category.id);
    }
  }
}
