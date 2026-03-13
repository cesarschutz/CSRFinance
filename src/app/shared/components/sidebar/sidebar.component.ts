import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { CurrencyBrlPipe } from '../../pipes/currency-brl.pipe';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, CurrencyBrlPipe],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">💰</span>
          @if (!collapsed) {
            <span class="logo-text">CSRFinance</span>
          }
        </div>
        <button class="collapse-btn" (click)="toggleCollapse()" aria-label="Colapsar sidebar">
          {{ collapsed ? '›' : '‹' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
             [title]="item.label">
            <span class="nav-icon">{{ item.icon }}</span>
            @if (!collapsed) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <div class="sidebar-accounts">
        @if (!collapsed) {
          <div class="accounts-header">
            <span class="accounts-title">Contas</span>
          </div>
        }

        <button class="account-item"
                [class.active]="!accountService.selectedAccountId()"
                (click)="accountService.selectAccount(null)">
          <span class="account-dot" style="background: var(--accent)"></span>
          @if (!collapsed) {
            <span class="account-name">Todas as Contas</span>
          }
        </button>

        @for (account of accountService.accounts(); track account.id) {
          <button class="account-item"
                  [class.active]="accountService.selectedAccountId() === account.id"
                  (click)="accountService.selectAccount(account.id)">
            <span class="account-dot" [style.background]="account.color"></span>
            @if (!collapsed) {
              <span class="account-name">{{ account.name }}</span>
              <span class="account-balance money">
                {{ (transactionService.accountBalances().get(account.id) ?? 0) | currencyBrl }}
              </span>
            }
          </button>
        }

      </div>

      <div class="sidebar-footer">
        @if (!collapsed) {
          <span class="footer-label">Patrimônio Total</span>
          <span class="footer-value money">
            {{ transactionService.totalBalance() | currencyBrl }}
          </span>
        } @else {
          <span class="footer-icon">💎</span>
        }
      </div>
    </aside>
  `,
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Recorrências', icon: '🔁', route: '/recurring' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
  ];

  constructor(
    public accountService: AccountService,
    public transactionService: TransactionService,
  ) {}

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }
}
