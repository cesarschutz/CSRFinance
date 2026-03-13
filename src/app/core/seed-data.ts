import { Category } from './models/category.model';

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense categories
  { id: 'cat-1', name: 'Beleza', type: 'expense', icon: '✂️', color: '#E84393' },
  { id: 'cat-2', name: 'Breu', type: 'expense', icon: '🐶', color: '#D63031' },
  { id: 'cat-3', name: 'Casa', type: 'expense', icon: '🏠', color: '#6C5CE7' },
  { id: 'cat-4', name: 'Cigarro', type: 'expense', icon: '🚬', color: '#636E72' },
  { id: 'cat-5', name: 'Educação', type: 'expense', icon: '📚', color: '#00CEC9' },
  { id: 'cat-6', name: 'Eletrônicos', type: 'expense', icon: '🖥️', color: '#0984E3' },
  { id: 'cat-7', name: 'Lazer', type: 'expense', icon: '🎉', color: '#FDCB6E' },
  { id: 'cat-8', name: 'Marley', type: 'expense', icon: '🐱', color: '#E17055' },
  { id: 'cat-9', name: 'Outros', type: 'expense', icon: '📌', color: '#A29BFE' },
  { id: 'cat-10', name: 'Restaurante', type: 'expense', icon: '🍽️', color: '#FF7675' },
  { id: 'cat-11', name: 'Saúde', type: 'expense', icon: '💊', color: '#00B894' },
  { id: 'cat-12', name: 'Serviços', type: 'expense', icon: '🔧', color: '#74B9FF' },
  { id: 'cat-13', name: 'Supermercado', type: 'expense', icon: '🛒', color: '#55EFC4' },
  { id: 'cat-14', name: 'Carro', type: 'expense', icon: '🚗', color: '#2D3436' },
  { id: 'cat-15', name: 'Roupa', type: 'expense', icon: '👕', color: '#FD79A8' },
  // Income categories
  { id: 'cat-16', name: 'Salário', type: 'income', icon: '💰', color: '#00B894' },
];
