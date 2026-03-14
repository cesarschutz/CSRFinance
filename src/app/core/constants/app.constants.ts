/** Storage keys */
export const STORAGE_KEYS = {
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  RECURRING: 'recurringTransactions',
  BUDGETS: 'budgets',
  GOALS: 'goals',
  THEME: 'csrfinance_theme',
} as const;

/** Excel sheet names */
export const EXCEL_SHEETS = {
  ACCOUNTS: 'Contas',
  CATEGORIES: 'Categorias',
  TRANSACTIONS: 'Transações',
  RECURRING: 'Recorrências',
  BUDGETS: 'Orçamentos',
  GOALS: 'Metas',
} as const;

/** Auto-save debounce in milliseconds */
export const AUTO_SAVE_DEBOUNCE_MS = 1500;

/** Default colors for new items */
export const DEFAULT_COLOR = '#818CF8';

/** Preset colors for account/category pickers */
export const PRESET_COLORS = [
  '#818CF8', '#FB7185', '#34D399', '#FBBF24', '#38BDF8',
  '#E17055', '#00CEC9', '#6C5B7B', '#F8B500', '#2D3436',
  '#D63031', '#74B9FF', '#A29BFE', '#55EFC4', '#FF7675',
  '#636E72',
] as const;

/** Budget thresholds */
export const BUDGET_WARNING_THRESHOLD = 75;
export const BUDGET_EXCEEDED_THRESHOLD = 100;

/** Chart tooltip colors (for Chart.js canvas - can't use CSS vars) */
export const CHART_TOOLTIP = {
  backgroundColor: 'rgba(18, 18, 30, 0.95)',
  borderColor: 'rgba(129, 140, 248, 0.2)',
  titleColor: '#EEEEF4',
  bodyColor: '#9394A5',
  padding: 12,
  cornerRadius: 10,
  borderWidth: 1,
} as const;

/** Chart axis colors */
export const CHART_AXIS = {
  tickColor: '#5C5D72',
  gridColor: 'rgba(129, 140, 248, 0.06)',
  fontFamily: "'DM Sans', sans-serif",
  monoFamily: "'DM Sans', sans-serif",
} as const;

/** Semantic colors (for Chart.js canvas) */
export const CHART_COLORS = {
  income: '#34D399',
  incomeBg: 'rgba(52, 211, 153, 0.7)',
  expense: '#FB7185',
  expenseBg: 'rgba(251, 113, 133, 0.7)',
  accent: '#818CF8',
  accentBg: 'rgba(129, 140, 248, 0.08)',
} as const;
