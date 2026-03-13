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
          <div class="logo-icon-wrapper">
            <span class="logo-icon">💰</span>
          </div>
          <h1 class="logo-text">CSRFinance</h1>
        </div>

        <p class="welcome-subtitle">Sistema Financeiro Pessoal</p>

        <div class="welcome-features">
          <div class="feature">
            <span class="feature-icon">📊</span>
            <span>Dashboard inteligente</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🔄</span>
            <span>Transferências entre contas</span>
          </div>
          <div class="feature">
            <span class="feature-icon">💾</span>
            <span>Salvamento automático</span>
          </div>
        </div>

        <div class="welcome-actions">
          <button class="btn btn-primary" (click)="openFile()">
            📂 Abrir arquivo existente
          </button>

          <div class="divider">
            <span>ou</span>
          </div>

          <button class="btn btn-secondary" (click)="newFile()">
            ✨ Criar novo arquivo
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
        🔒 Seus dados ficam no seu dispositivo — nada é enviado para servidores.
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
      background: linear-gradient(180deg, var(--bg) 0%, #E4E6F0 100%);
      padding: 24px;
    }

    .welcome-card {
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 40px 28px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      animation: slideUp 0.4s ease-out;

      @include tablet {
        padding: 48px 40px;
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .welcome-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: var(--accent-bg);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon {
      font-size: 2rem;
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
      margin: 0 0 24px;
    }

    .welcome-features {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 32px;
      padding: 16px;
      background: var(--surface-hover);
      border-radius: var(--radius-sm);
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .feature-icon {
      font-size: 1rem;
      width: 20px;
      text-align: center;
      flex-shrink: 0;
    }

    .welcome-actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
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

    .btn-primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);

      &:hover {
        background: var(--accent-hover);
        border-color: var(--accent-hover);
        box-shadow: 0 4px 16px rgba(108, 92, 231, 0.3);
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
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
      font-size: 0.75rem;

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
