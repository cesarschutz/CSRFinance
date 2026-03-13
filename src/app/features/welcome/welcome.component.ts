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
    @use 'assets/styles/mixins' as *;

    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg);
      background-image: var(--bg-gradient);
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .welcome-card {
      background: var(--surface-solid);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg), var(--shadow-glow);
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      position: relative;
      z-index: 1;
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
      font-size: 2.5rem;
      filter: drop-shadow(0 0 12px rgba(124, 58, 237, 0.5));
    }

    .logo-text {
      font-size: 1.75rem;
      font-weight: 800;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid transparent;
    }

    .btn-primary {
      background: var(--accent-gradient);
      color: #fff;
      border-color: transparent;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 0 30px rgba(124, 58, 237, 0.4);
      }
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
      border-color: var(--glass-border);

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
        background: var(--accent-bg);
        box-shadow: var(--shadow-glow);
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
        background: var(--glass-border);
      }
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      padding: 10px 16px;
      background: var(--danger-bg);
      border: 1px solid rgba(239, 68, 68, 0.2);
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
        background: rgba(239, 68, 68, 0.15);
      }
    }

    .welcome-footer {
      margin-top: 24px;
      color: var(--text-muted);
      font-size: 0.75rem;
      position: relative;
      z-index: 1;
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
