import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly breakpoint = inject(BreakpointObserver);

  private readonly sidenav = viewChild.required<MatSidenav>('drawer');

  protected readonly isHandset = toSignal(
    this.breakpoint.observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape]).pipe(
      map((r) => r.matches),
    ),
    { initialValue: false },
  );

  protected closeDrawerIfHandset(): void {
    if (this.isHandset()) {
      void this.sidenav().close();
    }
  }
}
