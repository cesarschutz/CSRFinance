import { Component, Input, Output, EventEmitter, HostListener, ElementRef, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AccountService } from '../../../core/services/account.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { ContextService } from '../../../core/services/context.service';
import { Account } from '../../../core/models/account.model';
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
      <!-- Quick Action -->
      <div class="quick-action" [class.collapsed]="collapsed">
        <button class="btn-action" (click)="toggleActionMenu($event)">
          <span class="action-icon">＋</span>
          @if (!collapsed) {
            <span class="action-text">Novo</span>
          }
        </button>

        @if (actionMenuOpen) {
          <div class="action-dropdown" [class.collapsed]="collapsed">
            <button class="dropdown-item" (click)="openTransactionForm('expense')">
              <span class="dd-icon expense-dot"></span>
              <span>Despesa</span>
            </button>
            <button class="dropdown-item" (click)="openTransactionForm('income')">
              <span class="dd-icon income-dot"></span>
              <span>Receita</span>
            </button>
            <button class="dropdown-item" (click)="openTransferForm()">
              <span class="dd-icon transfer-dot"></span>
              <span>Transferência</span>
            </button>
          </div>
        }
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        @for (item of currentNavItems(); track item.route) {
          <a class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' || item.route === '/investments' }"
             [title]="item.label">
            <span class="nav-icon">{{ item.icon }}</span>
            @if (!collapsed) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Account List -->
      <div class="sidebar-accounts" [class.collapsed]="collapsed">
        @if (!collapsed) {
          <div class="accounts-header">
            <span class="accounts-title">
              {{ contextService.isAccounts() ? 'Contas' : 'Carteira' }}
            </span>
          </div>
        }

        @if (contextService.isAccounts()) {
          <!-- Bank Accounts Context -->
          <button class="account-item"
                  [class.active]="!accountService.selectedAccountId()"
                  (click)="accountService.selectAccount(null)">
            <span class="account-dot" style="background: var(--accent)"></span>
            @if (!collapsed) {
              <span class="account-name">Todas</span>
            }
          </button>

          @for (account of accountService.checkingAccounts(); track account.id) {
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

          @for (account of accountService.creditCardAccounts(); track account.id) {
            <button class="account-item"
                    [class.active]="accountService.selectedAccountId() === account.id"
                    (click)="accountService.selectAccount(account.id)">
              <span class="account-dot" [style.background]="account.color"></span>
              @if (!collapsed) {
                <span class="account-name">{{ account.name }}</span>
                <span class="account-balance money text-expense">
                  {{ (transactionService.accountBalances().get(account.id) ?? 0) | currencyBrl }}
                </span>
              }
            </button>
          }
        } @else {
          <!-- Investments Context -->
          <button class="account-item"
                  [class.active]="!accountService.selectedAccountId()"
                  (click)="accountService.selectAccount(null)">
            <span class="account-dot" style="background: var(--accent)"></span>
            @if (!collapsed) {
              <span class="account-name">Todos</span>
            }
          </button>

          @for (account of accountService.allInvestmentAccounts(); track account.id) {
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
        }
      </div>

      <!-- Footer -->
      <div class="sidebar-footer">
        @if (!collapsed) {
          <span class="footer-label">
            {{ contextService.isAccounts() ? 'Saldo Total' : 'Patrimônio' }}
          </span>
          <span class="footer-value money">
            {{ transactionService.totalBalance() | currencyBrl }}
          </span>
        } @else {
          <span class="footer-icon">◆</span>
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
  contextService = inject(ContextService);

  accountsNavItems: NavItem[] = [
    { label: 'Dashboard', icon: '📊', route: '/dashboard' },
    { label: 'Contas', icon: '🏦', route: '/accounts' },
    { label: 'Transações', icon: '💳', route: '/transactions' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
    { label: 'Categorias', icon: '🏷️', route: '/categories' },
  ];

  investmentsNavItems: NavItem[] = [
    { label: 'Carteira', icon: '💰', route: '/investments' },
    { label: 'Relatórios', icon: '📈', route: '/reports' },
  ];

  readonly currentNavItems = computed(() => {
    return this.contextService.isAccounts()
      ? this.accountsNavItems
      : this.investmentsNavItems;
  });

  constructor(
    public accountService: AccountService,
    public transactionService: TransactionService,
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.actionMenuOpen) {
      const clickedInside = this.elementRef.nativeElement.querySelector('.quick-action')?.contains(event.target);
      if (!clickedInside) {
        this.actionMenuOpen = false;
      }
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
