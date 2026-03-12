import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { MobileNavComponent } from '../mobile-nav/mobile-nav.component';
import { FileBarComponent } from '../../shared/components/file-bar/file-bar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, MobileNavComponent, FileBarComponent],
  template: `
    @if (!isMobile()) {
      <app-sidebar
        [collapsed]="sidebarCollapsed()"
        (collapsedChange)="sidebarCollapsed.set($event)"
      />
    }

    <main class="main-content"
          [class.with-sidebar]="!isMobile()"
          [class.sidebar-collapsed]="!isMobile() && sidebarCollapsed()">
      <app-file-bar />
      <router-outlet />
    </main>

    @if (isMobile()) {
      <app-mobile-nav />
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--bg);
    }

    .main-content {
      min-height: 100vh;
      padding: 16px;
      padding-bottom: 80px;
      transition: margin-left 0.3s ease, padding 0.3s ease;

      &.with-sidebar {
        margin-left: var(--sidebar-width);
        padding: 24px 32px;
        padding-bottom: 24px;
      }

      &.sidebar-collapsed {
        margin-left: var(--sidebar-collapsed-width);
      }
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      .main-content.with-sidebar {
        margin-left: var(--sidebar-collapsed-width);
      }
    }
  `],
})
export class MainLayoutComponent {
  sidebarCollapsed = signal(false);
  isMobile = signal(window.innerWidth < 768);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      this.sidebarCollapsed.set(true);
    }
  }
}
