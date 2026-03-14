import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ContextService } from '../../core/services/context.service';

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
      @for (item of currentItems(); track item.route) {
        <a class="mobile-nav-item"
           [routerLink]="item.route"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' || item.route === '/investments' }">
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
      display: flex;
      justify-content: space-around;
      padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
      background: var(--surface-solid);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-top: 1px solid var(--glass-border);
      z-index: 100;
    }

    .mobile-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 6px 12px;
      border-radius: 12px;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.2s;
      position: relative;

      &.active {
        color: var(--accent);

        &::after {
          content: '';
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: var(--accent);
          border-radius: 2px;
        }
      }
    }

    .mobile-nav-icon {
      font-size: 1.2rem;
    }

    .mobile-nav-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
  `],
})
export class MobileNavComponent {
  private contextService = inject(ContextService);

  private accountItems: NavItem[] = [
    { label: 'Home', icon: '📊', route: '/dashboard' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
  ];

  private investmentItems: NavItem[] = [
    { label: 'Carteira', icon: '💰', route: '/investments' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
  ];

  readonly currentItems = computed(() =>
    this.contextService.isAccounts() ? this.accountItems : this.investmentItems
  );
}
