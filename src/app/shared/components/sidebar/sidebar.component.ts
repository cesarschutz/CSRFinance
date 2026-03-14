import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { ThemeService } from '../../../core/services/theme.service';
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

      <div class="action-menu-container" [class.collapsed]="collapsed">
        <button class="btn-new-action" (click)="toggleActionMenu($event)">
          <span class="btn-icon">＋</span>
          @if (!collapsed) {
            <span class="btn-text">Novo</span>
          }
        </button>

        @if (actionMenuOpen) {
          <div class="action-dropdown" [class.collapsed]="collapsed">
            <button class="dropdown-item option-expense" (click)="openTransactionForm('expense')">
              <span class="dropdown-icon">📉</span>
              <span>Despesa</span>
            </button>
            <button class="dropdown-item option-income" (click)="openTransactionForm('income')">
              <span class="dropdown-icon">📈</span>
              <span>Receita</span>
            </button>
            <button class="dropdown-item option-transfer" (click)="openTransferForm()">
              <span class="dropdown-icon">🔄</span>
              <span>Transferência</span>
            </button>
          </div>
        }
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

      <button class="theme-toggle" (click)="themeService.toggleTheme()" [title]="themeService.theme() === 'dark' ? 'Tema claro' : 'Tema escuro'">
        <span class="nav-icon">{{ themeService.theme() === 'dark' ? '☀️' : '🌙' }}</span>
        @if (!collapsed) {
          <span class="nav-label">{{ themeService.theme() === 'dark' ? 'Tema Claro' : 'Tema Escuro' }}</span>
        }
      </button>

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
  
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  public themeService = inject(ThemeService);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
  ];

  constructor(
    public accountService: AccountService,
    public transactionService: TransactionService,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.actionMenuOpen) {
      const clickedInside = this.elementRef.nativeElement.querySelector('.action-menu-container')?.contains(event.target);
      if (!clickedInside) {
        this.actionMenuOpen = false;
      }
    }
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
    if (this.collapsed) {
      this.actionMenuOpen = false;
    }
  }

  actionMenuOpen = false;

  toggleActionMenu(event: Event): void {
    event.stopPropagation();
    this.actionMenuOpen = !this.actionMenuOpen;
  }

  openTransactionForm(type: 'expense' | 'income'): void {
    this.actionMenuOpen = false;
    this.router.navigate(['/transactions'], { queryParams: { action: type } });
  }

  openTransferForm(): void {
    this.actionMenuOpen = false;
    this.router.navigate(['/transactions'], { queryParams: { action: 'transfer' } });
  }
}
