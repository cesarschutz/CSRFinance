import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../core/services/file.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="welcome">
      <div class="welcome-card">
        <div class="welcome-logo">
          <span class="logo-icon">💰</span>
          <h1 class="logo-text">CSRFinance</h1>
        </div>

        <p class="welcome-subtitle">Sistema Financeiro Pessoal</p>

        <div class="welcome-description">
          <p>Para começar, abra um arquivo <strong>.xlsx</strong> existente ou crie um novo.</p>
          <p class="welcome-hint">Seus dados ficam salvos automaticamente no arquivo escolhido.</p>
        </div>

        <div class="welcome-actions">
          <button class="btn btn-primary" (click)="openFile()">
            <span class="btn-icon">📂</span>
            Abrir arquivo existente
          </button>

          <div class="divider">
            <span>ou</span>
          </div>

          <button class="btn btn-secondary" (click)="newFile()">
            <span class="btn-icon">✨</span>
            Criar novo arquivo
          </button>
        </div>

        @if (errorMessage()) {
          <div class="error-banner">
            <span>{{ errorMessage() }}</span>
            <button class="error-dismiss" (click)="errorMessage.set(null)">✕</button>
          </div>
        }
      </div>

      <p class="welcome-footer">
        Seus dados nunca saem do seu dispositivo.
      </p>
    </div>
  `,
  styles: [`
    @import 'assets/styles/mixins';

    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg);
      padding: 24px;
    }

    .welcome-card {
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;

      @include tablet {
        padding: 48px 40px;
      }
    }

    .welcome-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-icon {
      font-size: 2.5rem;
    }

    .logo-text {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text);
      margin: 0;
      letter-spacing: -0.5px;
    }

    .welcome-subtitle {
      color: var(--text-secondary);
      font-size: 0.9375rem;
      margin: 0 0 28px;
    }

    .welcome-description {
      margin-bottom: 32px;

      p {
        color: var(--text-secondary);
        font-size: 0.875rem;
        line-height: 1.6;
        margin: 0;
      }

      .welcome-hint {
        margin-top: 8px;
        font-size: 0.8125rem;
        color: var(--text-muted);
      }
    }

    .welcome-actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 24px;
      border-radius: var(--radius-sm);
      font-size: 0.9375rem;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .btn-icon {
      font-size: 1.125rem;
    }

    .btn-primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);

      &:hover {
        background: var(--accent-hover);
        border-color: var(--accent-hover);
        box-shadow: var(--shadow-md);
      }
    }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border);

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
        background: var(--accent-bg);
      }
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      color: var(--text-muted);
      font-size: 0.8125rem;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border);
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      padding: 10px 16px;
      background: var(--danger-bg);
      border: 1px solid rgba(255, 107, 107, 0.3);
      border-radius: var(--radius-xs);
      color: var(--danger);
      font-size: 0.8125rem;
      text-align: left;

      span {
        flex: 1;
      }
    }

    .error-dismiss {
      background: none;
      border: none;
      color: var(--danger);
      cursor: pointer;
      padding: 2px 6px;
      font-size: 0.875rem;
      border-radius: 4px;

      &:hover {
        background: rgba(255, 107, 107, 0.15);
      }
    }

    .welcome-footer {
      margin-top: 24px;
      color: var(--text-muted);
      font-size: 0.75rem;
    }
  `],
})
export class WelcomeComponent {
  private readonly fileService = inject(FileService);
  readonly errorMessage = signal<string | null>(null);

  async openFile(): Promise<void> {
    try {
      this.errorMessage.set(null);
      await this.fileService.openFile();
    } catch {
      // Error is handled inside FileService, but we also show it here
      if (this.fileService.errorMessage()) {
        this.errorMessage.set(this.fileService.errorMessage());
        this.fileService.clearError();
      }
    }
  }

  async newFile(): Promise<void> {
    try {
      this.errorMessage.set(null);
      await this.fileService.newFile();
    } catch {
      if (this.fileService.errorMessage()) {
        this.errorMessage.set(this.fileService.errorMessage());
        this.fileService.clearError();
      }
    }
  }
}
