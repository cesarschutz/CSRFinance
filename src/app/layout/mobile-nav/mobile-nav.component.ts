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
      bottom: 24px;
      left: 24px;
      right: 24px;
      background: var(--glass-bg);
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-full);
      display: flex;
      justify-content: space-around;
      padding: 8px 12px;
      z-index: 100;
      box-shadow: var(--shadow-lg), var(--shadow-bento);
    }

    .mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      font-size: 0.65rem;
      font-weight: 700;
      transition: all var(--transition-base);
      position: relative;

      &.active {
        color: var(--accent);
        background: var(--surface-solid);
        box-shadow: var(--shadow-sm);

        .mobile-nav-icon {
          transform: translateY(-2px) scale(1.1);
          filter: drop-shadow(0 4px 6px rgba(99, 102, 241, 0.4));
        }
      }
    }

    .mobile-nav-icon {
      font-size: 1.25rem;
      transition: transform var(--transition-base), filter var(--transition-fast);
      filter: grayscale(1);

      .active & {
        filter: none;
      }
    }
    
    .mobile-nav-label {
      line-height: 1;
    }
  `],
})
export class MobileNavComponent {
  navItems: NavItem[] = [
    { label: 'Início', icon: '📊', route: '/dashboard' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Recorrências', icon: '🔁', route: '/recurring' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
  ];
}
