import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export interface Dish {
  dishName: string;
  description: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async parseMenu(menuText: string): Promise<Dish[]> {
    const model = 'gemini-2.5-flash';
    const response = await this.ai.models.generateContent({
      model: model,
      contents: `Parse the following restaurant menu text into a JSON array of objects. Each object must have a "dishName" (string) and a "description" (string). Only include main dishes, appetizers, and entrees. Ignore drinks, sides, and categories. If a description is not present for a dish, use an empty string. Here is the menu:\n\n${menuText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              dishName: {
                type: Type.STRING,
                description: 'The name of the dish.',
              },
              description: {
                type: Type.STRING,
                description: 'A brief description of the dish.',
              },
            },
            required: ["dishName", "description"]
          },
        },
      },
    });

    try {
      const jsonText = response.text.trim();
      const parsedData = JSON.parse(jsonText);
      if (Array.isArray(parsedData)) {
         return parsedData.filter(item => item.dishName && typeof item.dishName === 'string');
      }
      return [];
    } catch (e) {
      console.error('Failed to parse JSON response from Gemini:', response.text);
      throw new Error('Could not parse menu data.');
    }
  }

  async generateFoodImage(dish: Dish, style: 'rustic' | 'modern' | 'social'): Promise<string> {
    const stylePrompts = {
      modern: 'bright and airy aesthetic, minimalist white plate, clean modern background, soft natural light, shallow depth of field',
      rustic: 'dark and moody aesthetic, rustic wooden table background, dramatic side lighting, deep shadows, rich textures',
      social: 'vibrant top-down flat lay, popular on social media, on a stylish marble or slate surface, with complementary garnishes arranged neatly',
    };
    
    const prompt = `Professional food photography of "${dish.dishName}", described as "${dish.description}". The style must be: ${stylePrompts[style]}. Hyperrealistic, high detail, 8k, delicious looking, studio quality.`;

    const response = await this.ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error('Image generation failed or returned no images.');
    }
  }
}