import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import * as XLSX from 'xlsx';

import { StorageService } from './storage.service';
import { AccountService } from './account.service';
import { CategoryService } from './category.service';
import { TransactionService } from './transaction.service';
import { Account } from '../models/account.model';
import { Category, CategoryType } from '../models/category.model';
import { Transaction, TransactionType, TransactionStatus } from '../models/transaction.model';

export type FileStatus = 'no-file' | 'saved' | 'saving' | 'unsaved' | 'error';

@Injectable({ providedIn: 'root' })
export class FileService implements OnDestroy {
  private storage = inject(StorageService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private transactionService = inject(TransactionService);

  // State signals
  private statusSignal = signal<FileStatus>('no-file');
  private fileNameSignal = signal<string | null>(null);
  private lastSavedSignal = signal<Date | null>(null);
  private errorMessageSignal = signal<string | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly fileName = this.fileNameSignal.asReadonly();
  readonly lastSaved = this.lastSavedSignal.asReadonly();
  readonly errorMessage = this.errorMessageSignal.asReadonly();
  readonly hasFile = computed(() => this.statusSignal() !== 'no-file');
  readonly isFileSystemAccessSupported = 'showSaveFilePicker' in window;

  // File handle (File System Access API)
  private fileHandle: any = null;

  // Auto-save guard
  private suppressAutoSave = false;

  // Sheet names
  private readonly SHEET_CONTAS = 'Contas';
  private readonly SHEET_CATEGORIAS = 'Categorias';
  private readonly SHEET_TRANSACOES = 'Transações';

  // Auto-save subscription
  private autoSaveSub: Subscription;

  constructor() {
    this.autoSaveSub = this.storage.onChange$.pipe(
      filter(() => this.hasFile() && !this.suppressAutoSave),
      debounceTime(1500),
    ).subscribe(() => this.autoSave());
  }

  ngOnDestroy(): void {
    this.autoSaveSub.unsubscribe();
  }

  // ===== PUBLIC API =====

  async newFile(): Promise<void> {
    try {
      if (this.isFileSystemAccessSupported) {
        const handle = await this.pickSaveFile();
        if (!handle) return;
        this.fileHandle = handle;
        this.fileNameSignal.set(handle.name);
      } else {
        this.fileHandle = null;
        this.fileNameSignal.set('FinControl.xlsx');
      }

      this.statusSignal.set('saving');
      const wb = this.buildWorkbook();
      await this.writeToFile(wb);

      this.statusSignal.set('saved');
      this.lastSavedSignal.set(new Date());
      this.errorMessageSignal.set(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.statusSignal.set('error');
      this.errorMessageSignal.set('Erro ao criar arquivo');
    }
  }

  async openFile(): Promise<void> {
    try {
      let buffer: ArrayBuffer;
      let name: string;

      if (this.isFileSystemAccessSupported) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'Planilha Excel',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
          }],
          multiple: false,
        });
        this.fileHandle = handle;
        name = handle.name;
        const file = await handle.getFile();
        buffer = await file.arrayBuffer();
      } else {
        const file = await this.pickOpenFileFallback();
        if (!file) return;
        this.fileHandle = null;
        name = file.name;
        buffer = await file.arrayBuffer();
      }

      const wb = XLSX.read(buffer, { type: 'array' });
      const data = this.parseWorkbook(wb);
      this.importData(data);

      this.fileNameSignal.set(name);
      this.statusSignal.set('saved');
      this.lastSavedSignal.set(new Date());
      this.errorMessageSignal.set(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.fileHandle = null;
      this.fileNameSignal.set(null);
      this.statusSignal.set('error');
      this.errorMessageSignal.set((err as Error).message || 'Erro ao abrir arquivo');
    }
  }

  async saveFile(): Promise<void> {
    if (!this.hasFile()) return;

    try {
      this.statusSignal.set('saving');
      const wb = this.buildWorkbook();

      if (this.fileHandle) {
        await this.writeToFile(wb);
      } else {
        this.downloadBlob(wb, this.fileNameSignal() ?? 'FinControl.xlsx');
      }

      this.statusSignal.set('saved');
      this.lastSavedSignal.set(new Date());
      this.errorMessageSignal.set(null);
    } catch (err) {
      this.statusSignal.set('error');
      this.errorMessageSignal.set('Erro ao salvar arquivo');
    }
  }

  async saveFileAs(): Promise<void> {
    try {
      if (this.isFileSystemAccessSupported) {
        const handle = await this.pickSaveFile();
        if (!handle) return;
        this.fileHandle = handle;
        this.fileNameSignal.set(handle.name);
      }

      this.statusSignal.set('saving');
      const wb = this.buildWorkbook();

      if (this.fileHandle) {
        await this.writeToFile(wb);
      } else {
        this.downloadBlob(wb, 'FinControl.xlsx');
        this.fileNameSignal.set('FinControl.xlsx');
      }

      this.statusSignal.set('saved');
      this.lastSavedSignal.set(new Date());
      this.errorMessageSignal.set(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.statusSignal.set('error');
      this.errorMessageSignal.set('Erro ao salvar arquivo');
    }
  }

  closeFile(): void {
    this.fileHandle = null;
    this.fileNameSignal.set(null);
    this.statusSignal.set('no-file');
    this.lastSavedSignal.set(null);
    this.errorMessageSignal.set(null);
  }

  clearError(): void {
    this.errorMessageSignal.set(null);
    if (!this.hasFile()) {
      this.statusSignal.set('no-file');
    }
  }

  // ===== PRIVATE METHODS =====

  private async autoSave(): Promise<void> {
    if (!this.fileHandle) {
      this.statusSignal.set('unsaved');
      return;
    }

    try {
      this.statusSignal.set('saving');
      const wb = this.buildWorkbook();
      await this.writeToFile(wb);
      this.statusSignal.set('saved');
      this.lastSavedSignal.set(new Date());
      this.errorMessageSignal.set(null);
    } catch {
      this.statusSignal.set('error');
      this.errorMessageSignal.set('Erro ao salvar automaticamente');
    }
  }

  private buildWorkbook(): XLSX.WorkBook {
    const accounts = this.accountService.accounts();
    const categories = this.categoryService.categories();
    const transactions = this.transactionService.transactions();

    const wb = XLSX.utils.book_new();

    // Sheet "Contas"
    const accountRows = accounts.map(a => ({
      id: a.id,
      nome: a.name,
      banco: a.bank,
      saldoInicial: a.initialBalance,
      cor: a.color,
      criadoEm: a.createdAt,
    }));
    const wsAccounts = XLSX.utils.json_to_sheet(accountRows);
    XLSX.utils.book_append_sheet(wb, wsAccounts, this.SHEET_CONTAS);

    // Sheet "Categorias"
    const categoryRows = categories.map(c => ({
      id: c.id,
      nome: c.name,
      tipo: c.type,
      icone: c.icon,
      cor: c.color,
    }));
    const wsCategories = XLSX.utils.json_to_sheet(categoryRows);
    XLSX.utils.book_append_sheet(wb, wsCategories, this.SHEET_CATEGORIAS);

    // Sheet "Transações"
    const transactionRows = transactions.map(t => ({
      id: t.id,
      descricao: t.description,
      valor: t.amount,
      tipo: t.type,
      categoriaId: t.categoryId,
      contaId: t.accountId,
      data: t.date,
      status: t.status,
      criadoEm: t.createdAt,
      transferenciaId: t.transferId ?? '',
      contaTransferenciaId: t.transferAccountId ?? '',
    }));
    const wsTransactions = XLSX.utils.json_to_sheet(transactionRows);
    XLSX.utils.book_append_sheet(wb, wsTransactions, this.SHEET_TRANSACOES);

    return wb;
  }

  private validateWorkbook(workbook: XLSX.WorkBook): void {
    const sheetNames = workbook.SheetNames;
    const required = [this.SHEET_CONTAS, this.SHEET_CATEGORIAS, this.SHEET_TRANSACOES];
    const missing = required.filter(s => !sheetNames.includes(s));

    if (missing.length > 0) {
      throw new Error(
        `Planilhas não encontradas: "${missing.join('", "')}". ` +
        `O arquivo deve conter: "${required.join('", "')}". ` +
        `Encontradas: "${sheetNames.join('", "')}".`
      );
    }

    // Validate column headers for each sheet
    const expectedColumns: Record<string, string[]> = {
      [this.SHEET_CONTAS]: ['id', 'nome', 'banco', 'saldoInicial'],
      [this.SHEET_CATEGORIAS]: ['id', 'nome', 'tipo', 'icone'],
      [this.SHEET_TRANSACOES]: ['id', 'descricao', 'valor', 'tipo', 'contaId', 'data'],
    };

    for (const [sheet, requiredCols] of Object.entries(expectedColumns)) {
      const ws = workbook.Sheets[sheet];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (rows.length === 0) continue;

      const actualCols = Object.keys(rows[0]);
      const missingCols = requiredCols.filter(c => !actualCols.includes(c));
      if (missingCols.length > 0) {
        throw new Error(
          `Planilha "${sheet}": colunas obrigatórias não encontradas: "${missingCols.join('", "')}". ` +
          `Colunas encontradas: "${actualCols.join('", "')}".`
        );
      }
    }
  }

  private parseWorkbook(workbook: XLSX.WorkBook): {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  } {
    this.validateWorkbook(workbook);

    const parseSheet = (sheetName: string): Record<string, unknown>[] => {
      const ws = workbook.Sheets[sheetName];
      if (!ws) return [];
      return XLSX.utils.sheet_to_json(ws);
    };

    const rawAccounts = parseSheet(this.SHEET_CONTAS);
    const accounts: Account[] = rawAccounts.map((r: any) => ({
      id: String(r.id ?? ''),
      name: String(r.nome ?? ''),
      bank: String(r.banco ?? ''),
      initialBalance: Number(r.saldoInicial ?? 0),
      color: String(r.cor ?? '#6C5CE7'),
      createdAt: String(r.criadoEm ?? new Date().toISOString()),
    }));

    const rawCategories = parseSheet(this.SHEET_CATEGORIAS);
    const categories: Category[] = rawCategories.map((r: any) => ({
      id: String(r.id ?? ''),
      name: String(r.nome ?? ''),
      type: (['income', 'expense'].includes(r.tipo) ? r.tipo : 'expense') as CategoryType,
      icon: String(r.icone ?? '📌'),
      color: String(r.cor ?? '#6C5CE7'),
    }));

    const rawTransactions = parseSheet(this.SHEET_TRANSACOES);
    const transactions: Transaction[] = rawTransactions.map((r: any) => ({
      id: String(r.id ?? ''),
      description: String(r.descricao ?? ''),
      amount: Number(r.valor ?? 0),
      type: (['income', 'expense', 'transfer'].includes(r.tipo) ? r.tipo : 'expense') as TransactionType,
      categoryId: String(r.categoriaId ?? ''),
      accountId: String(r.contaId ?? ''),
      date: String(r.data ?? ''),
      status: (r.status === 'pending' ? 'pending' : 'settled') as TransactionStatus,
      createdAt: String(r.criadoEm ?? new Date().toISOString()),
      ...(r.transferenciaId ? { transferId: String(r.transferenciaId) } : {}),
      ...(r.contaTransferenciaId ? { transferAccountId: String(r.contaTransferenciaId) } : {}),
    }));

    return { accounts, categories, transactions };
  }

  private importData(data: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  }): void {
    this.suppressAutoSave = true;
    if (data.accounts.length > 0) {
      this.accountService.loadFromData(data.accounts);
    }
    if (data.categories.length > 0) {
      this.categoryService.loadFromData(data.categories);
    }
    if (data.transactions.length > 0) {
      this.transactionService.loadFromData(data.transactions);
    }
    this.suppressAutoSave = false;
  }

  private async writeToFile(workbook: XLSX.WorkBook): Promise<void> {
    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    if (this.fileHandle) {
      const writable = await this.fileHandle.createWritable();
      await writable.write(new Uint8Array(xlsxBuffer));
      await writable.close();
    }
  }

  private async pickSaveFile(): Promise<any> {
    return (window as any).showSaveFilePicker({
      suggestedName: 'FinControl.xlsx',
      types: [{
        description: 'Planilha Excel',
        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
      }],
    });
  }

  private pickOpenFileFallback(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }

  private downloadBlob(workbook: XLSX.WorkBook, name: string): void {
    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
