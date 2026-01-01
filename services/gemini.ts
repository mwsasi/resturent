
import { GoogleGenAI, Type } from "@google/genai";

export async function getChefRecommendation(menuItems: string[]): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on this restaurant menu: ${menuItems.join(", ")}, recommend one "Chef's Special" dish and write a catchy 1-sentence marketing pitch for it.`,
    });
    return response.text || "Try our signature Crispy Dosa today!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Our fluffy Idly is a customer favorite!";
  }
}

export async function generateDishImage(
  itemName: string, 
  description: string, 
  imageSize: "1K" | "2K" | "4K" = "1K"
): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `A professional, high-end commercial food photograph of ${itemName}. ${description}. 
    Soft studio lighting, shallow depth of field, plated beautifully on a ceramic dish, professional styling, appetizing.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: imageSize
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    // Fallback to flash if pro fails or key is missing, or return null to trigger UI warning
    return null;
  }
}
