import { Component, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { FileBarComponent } from '../../shared/components/file-bar/file-bar.component';
import { ContextService, AppContext } from '../../core/services/context.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, MobileNavComponent, FileBarComponent],
  template: `
    <!-- Top Header -->
    <header class="top-header">
      <div class="header-left">
        <button class="menu-btn" (click)="toggleSidebar()" *ngIf="!isMobile()">
          <span class="menu-icon">☰</span>
        </button>
        <div class="logo">
          <span class="logo-icon">◆</span>
          <span class="logo-text">CSRFinance</span>
        </div>
      </div>

      <div class="context-toggle">
        <button
          class="toggle-btn"
          [class.active]="contextService.isAccounts()"
          (click)="switchContext('accounts')">
          <span class="toggle-icon">💳</span>
          <span class="toggle-label">Contas</span>
        </button>
        <button
          class="toggle-btn"
          [class.active]="contextService.isInvestments()"
          (click)="switchContext('investments')">
          <span class="toggle-icon">📈</span>
          <span class="toggle-label">Investimentos</span>
        </button>
      </div>

      <div class="header-right">
        <app-file-bar />
      </div>
    </header>

    <!-- Body -->
    <div class="app-body">
      @if (!isMobile()) {
        <app-sidebar
          [collapsed]="sidebarCollapsed()"
          (collapsedChange)="sidebarCollapsed.set($event)"
        />
      }

      <main class="main-content"
            [class.with-sidebar]="!isMobile()"
            [class.sidebar-collapsed]="!isMobile() && sidebarCollapsed()">
        <router-outlet />
      </main>
    </div>

    @if (isMobile()) {
      <app-mobile-nav />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg);
      background-image: var(--bg-gradient);
      background-attachment: fixed;
    }

    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      background: rgba(10, 10, 18, 0.8);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      position: sticky;
      top: 0;
      z-index: 100;
      gap: 16px;

      @media (min-width: 1024px) {
        padding: 12px 32px;
      }
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .menu-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 1rem;
      color: var(--text-secondary);
      transition: all 0.2s;
      cursor: pointer;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text);
      }
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .logo-icon {
      font-size: 1.25rem;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo-text {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;

      @media (max-width: 767px) {
        display: none;
      }
    }

    .context-toggle {
      display: flex;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 3px;
      gap: 2px;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      border: none;
      background: transparent;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

      @media (max-width: 767px) {
        padding: 8px 12px;
      }

      .toggle-icon {
        font-size: 0.95rem;
      }

      .toggle-label {
        @media (max-width: 400px) {
          display: none;
        }
      }

      &.active {
        background: var(--accent-bg);
        color: var(--accent);
        box-shadow: 0 0 12px rgba(129, 140, 248, 0.1);
      }

      &:not(.active):hover {
        color: var(--text-secondary);
        background: rgba(255, 255, 255, 0.04);
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .app-body {
      display: flex;
      flex: 1;
    }

    .main-content {
      flex: 1;
      min-height: calc(100vh - 60px);
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      padding-bottom: 100px;
      width: 100%;
      transition: padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      @media (min-width: 1024px) {
        padding: 32px 40px;
        padding-left: calc(var(--sidebar-width) + 40px);

        &.sidebar-collapsed {
          padding-left: calc(var(--sidebar-collapsed-width) + 40px);
        }
      }

      @media (min-width: 768px) and (max-width: 1023px) {
        padding-left: calc(var(--sidebar-collapsed-width) + 24px);
        padding-bottom: 32px;
      }
    }
  `],
})
export class MainLayoutComponent {
  contextService = inject(ContextService);
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      this.sidebarCollapsed.set(true);
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  switchContext(ctx: AppContext): void {
    this.contextService.setContext(ctx);
    // Navigate to the appropriate dashboard
    if (ctx === 'accounts') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/investments']);
    }
  }
}
