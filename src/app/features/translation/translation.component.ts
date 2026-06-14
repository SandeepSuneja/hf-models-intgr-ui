import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { INDIAN_LANGUAGES } from '../../shared/indian-languages';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-translation',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './translation.component.html',
  styleUrl: './translation.component.scss',
})
export class TranslationComponent {
  private readonly translation = inject(TranslationService);

  protected readonly languages = INDIAN_LANGUAGES;

  protected englishText = '';
  protected targetCode = INDIAN_LANGUAGES[0].translationCode;
  protected translatedText = '';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected translate(): void {
    this.error.set(null);
    this.loading.set(true);
    this.translation
      .translateEnglishTo(this.englishText, this.targetCode)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (text) => {
          this.translatedText = text;
        },
        error: (err: unknown) => {
          this.translatedText = '';
          this.error.set(err instanceof Error ? err.message : 'Translation failed.');
        },
      });
  }

  protected clear(): void {
    this.englishText = '';
    this.translatedText = '';
    this.error.set(null);
  }
}
