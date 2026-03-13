import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="mobile-nav">
      @for (item of navItems; track item.route) {
        <a class="mobile-nav-item"
           [routerLink]="item.route"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }">
          <span class="mobile-nav-icon">{{ item.icon }}</span>
          <span class="mobile-nav-label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    .mobile-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(11, 15, 26, 0.9);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-around;
      padding: 8px 0;
      padding-bottom: calc(8px + env(safe-area-inset-bottom));
      z-index: 100;
    }

    .mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 12px;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      font-size: 0.65rem;
      font-weight: 500;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;

      &.active {
        color: var(--accent);

        .mobile-nav-icon {
          filter: drop-shadow(0 0 6px rgba(124, 58, 237, 0.5));
        }
      }
    }

    .mobile-nav-icon {
      font-size: 1.25rem;
      transition: filter 0.2s;
    }
  `],
})
export class MobileNavComponent {
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
  ];
}
