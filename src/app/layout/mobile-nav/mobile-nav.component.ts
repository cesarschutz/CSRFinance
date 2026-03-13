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
      background: var(--surface);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-around;
      padding: 6px 0;
      padding-bottom: calc(6px + env(safe-area-inset-bottom));
      z-index: 100;
      box-shadow: 0 -2px 12px rgba(26, 29, 46, 0.06);
    }

    .mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-size: 0.625rem;
      font-weight: 600;
      transition: all 0.2s;
      position: relative;

      &.active {
        color: var(--accent);

        .mobile-nav-icon {
          transform: scale(1.1);
        }

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background: var(--accent);
          border-radius: 0 0 3px 3px;
        }
      }
    }

    .mobile-nav-icon {
      font-size: 1.2rem;
      transition: transform 0.2s;
    }
  `],
})
export class MobileNavComponent {
  navItems: NavItem[] = [
    { label: 'Início', icon: '📊', route: '/dashboard' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
  ];
}
