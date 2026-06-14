import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'translate' },
      {
        path: 'translate',
        loadComponent: () =>
          import('./features/translation/translation.component').then((m) => m.TranslationComponent),
      },
      {
        path: 'speech',
        loadComponent: () =>
          import('./features/speech-to-text/speech-to-text.component').then((m) => m.SpeechToTextComponent),
      },
    ],
  },
];
