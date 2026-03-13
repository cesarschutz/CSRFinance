import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService, FileStatus } from '../../../core/services/file.service';

@Component({
  selector: 'app-file-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-bar">
      <div class="file-bar-left">
        <span class="file-icon">📄</span>
        <span class="file-name">{{ fileService.fileName() }}</span>
        <span class="file-status" [ngClass]="'status-' + fileService.status()">
          {{ getStatusLabel() }}
        </span>
        @if (fileService.lastSaved() && fileService.status() === 'saved') {
          <span class="file-time">{{ formatTime(fileService.lastSaved()!) }}</span>
        }
      </div>

      <div class="file-bar-actions">
        <button
          class="file-btn file-btn-save"
          (click)="fileService.saveFile()"
          [disabled]="fileService.status() === 'saving'"
          title="Salvar arquivo"
        >
          💾 Salvar
        </button>
        <button
          class="file-btn"
          (click)="fileService.closeFile()"
          title="Fechar arquivo"
        >
          ✕ Fechar
        </button>
      </div>
    </div>

    @if (fileService.errorMessage()) {
      <div class="file-error">
        <span>{{ fileService.errorMessage() }}</span>
        <button class="file-error-dismiss" (click)="dismissError()">✕</button>
      </div>
    }
  `,
  styles: [`
    @use 'assets/styles/mixins' as *;

    .file-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      margin-bottom: 20px;
      font-size: 0.8125rem;
      gap: 12px;
      flex-wrap: wrap;

      @include tablet {
        padding: 10px 20px;
        flex-wrap: nowrap;
      }
    }

    .file-bar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .file-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .file-name {
      color: var(--text);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-status {
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 0.6875rem;
      font-weight: 600;
      white-space: nowrap;

      &.status-saved {
        background: rgba(0, 184, 148, 0.12);
        color: var(--income);
      }

      &.status-saving {
        background: var(--warning-bg);
        color: var(--warning);
      }

      &.status-unsaved {
        background: rgba(232, 67, 147, 0.1);
        color: var(--expense);
      }

      &.status-error {
        background: rgba(255, 107, 107, 0.12);
        color: var(--danger);
      }
    }

    .file-time {
      font-size: 0.6875rem;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .file-bar-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .file-btn {
      padding: 5px 12px;
      border-radius: var(--radius-xs);
      font-size: 0.75rem;
      font-weight: 500;
      font-family: 'DM Sans', sans-serif;
      color: var(--text-secondary);
      background: transparent;
      border: 1px solid var(--border);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;

      &:hover {
        background: var(--accent-bg);
        color: var(--accent);
        border-color: var(--accent);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .file-btn-save {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);

      &:hover:not(:disabled) {
        background: var(--accent-hover);
        color: #fff;
        border-color: var(--accent-hover);
      }
    }

    .file-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 16px;
      background: rgba(255, 107, 107, 0.1);
      border: 1px solid rgba(255, 107, 107, 0.2);
      color: var(--danger);
      font-size: 0.75rem;
      border-radius: var(--radius-xs);
      margin-bottom: 12px;

      span {
        flex: 1;
      }
    }

    .file-error-dismiss {
      background: none;
      border: none;
      color: var(--danger);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;

      &:hover {
        background: rgba(255, 107, 107, 0.15);
      }
    }
  `],
})
export class FileBarComponent {
  readonly fileService = inject(FileService);

  getStatusLabel(): string {
    const labels: Record<FileStatus, string> = {
      'no-file': '',
      'saved': 'Salvo',
      'saving': 'Salvando...',
      'unsaved': 'Alterações pendentes',
      'error': 'Erro',
    };
    return labels[this.fileService.status()];
  }

  formatTime(date: Date): string {
    return `às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  dismissError(): void {
    this.fileService.clearError();
  }
}
