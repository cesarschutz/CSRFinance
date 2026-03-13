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
      background-image: var(--bg-gradient);
      background-attachment: fixed;
    }

    .main-content {
      min-height: 100vh;
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      padding-bottom: 120px; // Space for mobile nav
      transition: margin-left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

      @media (min-width: 1024px) {
        padding: 32px 48px;
        padding-left: calc(var(--sidebar-width) + 48px);
        padding-bottom: 32px;
        
        &.sidebar-collapsed {
          padding-left: calc(var(--sidebar-collapsed-width) + 48px);
        }
      }

      @media (min-width: 768px) and (max-width: 1023px) {
        padding-left: calc(var(--sidebar-collapsed-width) + 32px);
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
