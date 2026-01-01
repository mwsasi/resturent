
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getChefRecommendation(menuItems: string[]): Promise<string> {
  try {
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

export async function generateDishImage(itemName: string, description: string): Promise<string | null> {
  try {
    const prompt = `A professional, high-end commercial food photograph of ${itemName}. ${description}. 
    Soft studio lighting, shallow depth of field, plated beautifully on a ceramic dish, 4k resolution, appetizing.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "4:3"
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
    return null;
  }
}

export async function analyzeTrafficPatterns(orderHistory: any[]) {
  try {
    const summary = orderHistory.map(o => ({
      time: new Date(o.date).getHours(),
      items: o.items.map((i: any) => i.name),
      total: o.grandTotal
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Analyze these restaurant orders: ${JSON.stringify(summary)}. 
      Identify:
      1. Peak Busy Hour (range)
      2. Off-Peak Hour (range)
      3. The "Fastest Moving Item" (highest volume)
      4. A brief operational tip for the manager.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            peakHour: { type: Type.STRING },
            offPeakHour: { type: Type.STRING },
            fastestMovingItem: { type: Type.STRING },
            managerTip: { type: Type.STRING }
          },
          required: ["peakHour", "offPeakHour", "fastestMovingItem", "managerTip"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
}
