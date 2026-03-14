import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileService } from './core/services/file.service';
import { ThemeService } from './core/services/theme.service';
import { WelcomeComponent } from './features/welcome/welcome.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, WelcomeComponent],
  template: `
    @if (fileService.hasFile()) {
      <router-outlet />
    } @else {
      <app-welcome />
    }
  `,
})
export class AppComponent {
  readonly fileService = inject(FileService);
  private readonly themeService = inject(ThemeService);

  constructor() {
    this.themeService.init();
  }
}
