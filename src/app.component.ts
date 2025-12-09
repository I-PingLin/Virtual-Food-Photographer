import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, Dish } from './services/gemini.service';

interface DisplayDish extends Dish {
  imageUrl?: string;
  isLoading: boolean;
  error?: string;
}

interface StyleOption {
  id: 'rustic' | 'modern' | 'social';
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  menuText = signal<string>('Spaghetti Carbonara - Creamy pasta with pancetta, pecorino cheese, and black pepper.\nMargherita Pizza - Classic pizza with tomato, mozzarella, and fresh basil.\nGrilled Salmon - Salmon fillet served with asparagus and lemon butter sauce.');
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  dishes = signal<DisplayDish[]>([]);

  styles: StyleOption[] = [
    {
      id: 'modern',
      name: 'Bright & Modern',
      description: 'Clean, airy, with soft natural light.',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>`,
    },
    {
      id: 'rustic',
      name: 'Rustic & Dark',
      description: 'Moody, dramatic lighting on dark surfaces.',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>`,
    },
    {
      id: 'social',
      name: 'Social Media',
      description: 'Vibrant, top-down flat lay style shots.',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.174 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>`,
    },
  ];

  selectedStyle = signal<StyleOption['id']>('modern');

  handleTextInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.menuText.set(target.value);
  }
  
  selectStyle(styleId: StyleOption['id']) {
    this.selectedStyle.set(styleId);
  }

  async generatePhotos() {
    if (!this.menuText().trim()) {
      this.error.set('Please enter a menu first.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.dishes.set([]);

    try {
      const parsedDishes = await this.geminiService.parseMenu(this.menuText());

      if (parsedDishes.length === 0) {
        this.error.set('No dishes could be identified in the menu. Please check the format.');
        this.isLoading.set(false);
        return;
      }

      this.dishes.set(parsedDishes.map(d => ({ ...d, isLoading: true })));
      this.isLoading.set(false);

      parsedDishes.forEach(async (dish, index) => {
        try {
          const imageUrl = await this.geminiService.generateFoodImage(dish, this.selectedStyle());
          this.dishes.update(currentDishes => {
            const newDishes = [...currentDishes];
            if(newDishes[index]) {
                newDishes[index] = { ...newDishes[index], imageUrl, isLoading: false };
            }
            return newDishes;
          });
        } catch (e) {
          console.error(`Failed to generate image for ${dish.dishName}`, e);
          this.dishes.update(currentDishes => {
            const newDishes = [...currentDishes];
            if(newDishes[index]) {
                newDishes[index] = { ...newDishes[index], isLoading: false, error: 'Image creation failed' };
            }
            return newDishes;
          });
        }
      });
    } catch (e) {
      console.error('Failed to parse menu', e);
      this.error.set("We couldn't understand this menu. Please try reformatting it (e.g., 'Dish Name - Description').");
      this.isLoading.set(false);
    }
  }
}