import { Injectable, signal, computed } from '@angular/core';
import { Category, CategoryType } from '../models/category.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly STORAGE_KEY = 'categories';
  private categoriesSignal = signal<Category[]>([]);

  readonly categories = this.categoriesSignal.asReadonly();
  readonly expenseCategories = computed(() =>
    this.categoriesSignal().filter(c => c.type === 'expense')
  );
  readonly incomeCategories = computed(() =>
    this.categoriesSignal().filter(c => c.type === 'income')
  );

  constructor(private storage: StorageService) {
    this.load();
  }

  private load(): void {
    const stored = this.storage.get<Category[]>(this.STORAGE_KEY);
    this.categoriesSignal.set(stored ?? []);
  }

  private save(): void {
    this.storage.set(this.STORAGE_KEY, this.categoriesSignal());
  }

  loadFromData(categories: Category[]): void {
    this.categoriesSignal.set(categories);
    this.save();
  }

  getById(id: string): Category | undefined {
    return this.categoriesSignal().find(c => c.id === id);
  }

  getByType(type: CategoryType): Category[] {
    return this.categoriesSignal().filter(c => c.type === type);
  }

  add(category: Omit<Category, 'id'>): Category {
    const newCat: Category = {
      ...category,
      id: 'cat-' + Date.now(),
    };
    this.categoriesSignal.update(cats => [...cats, newCat]);
    this.save();
    return newCat;
  }

  update(id: string, changes: Partial<Category>): void {
    this.categoriesSignal.update(cats =>
      cats.map(c => (c.id === id ? { ...c, ...changes } : c))
    );
    this.save();
  }

  delete(id: string): void {
    this.categoriesSignal.update(cats => cats.filter(c => c.id !== id));
    this.save();
  }
}
