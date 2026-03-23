import { GoogleGenAI, Type } from "@google/genai";
import { PlantAnalysisResult } from "../types";

const getValidKeys = () => {
  const keys = [
    { name: 'GEMINI_API_KEY1', val: process.env.GEMINI_API_KEY1 },
    { name: 'GEMINI_API_KEY', val: process.env.GEMINI_API_KEY },
    { name: 'Gemini_API_Key2', val: (process.env as any).Gemini_API_Key2 },
    { name: 'VITE_GEMINI_API_KEY', val: process.env.VITE_GEMINI_API_KEY },
    { name: 'API_KEY', val: process.env.API_KEY },
    { name: 'import.meta.env.VITE_GEMINI_API_KEY', val: (import.meta as any).env?.VITE_GEMINI_API_KEY }
  ];

  return keys
    .map(k => String(k.val || '').trim())
    .filter(val => 
      val !== '' && 
      val !== 'undefined' && 
      val !== 'null' && 
      val !== 'YOUR_API_KEY'
    );
};

export async function analyzePlantDisease(
  imageBase64: string, 
  sensorData?: { moisture: number; temp: number; humidity: number; light: number }
): Promise<PlantAnalysisResult> {
  const validKeys = getValidKeys();
  if (validKeys.length === 0) {
    return {
      plantName: "AI Key Missing",
      status: "Unknown",
      confidence: 0,
      description: "NO_KEYS: Gemini API key is missing or set to a placeholder like 'AI Studio Free Tier'. To fix this: 1. Get a key from ai.google.dev. 2. Open Settings (gear icon) -> Secrets in AI Studio. 3. Add 'GEMINI_API_KEY' with your actual key string.",
      suggestions: ["Add your Gemini API key in AI Studio Secrets.", "Check the documentation for more details."]
    };
  }

  let lastError = null;

  for (const apiKey of validKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Extract mime type and data
      const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        throw new Error("Invalid image format");
      }
      
      const mimeType = matches[1];
      const data = matches[2];

      const sensorContext = sensorData 
        ? `\n\nCurrent environmental conditions provided by sensors:
           - Soil Moisture: ${Math.round(sensorData.moisture)}%
           - Temperature: ${Math.round(sensorData.temp)}°C
           - Humidity: ${Math.round(sensorData.humidity)}%
           - Light Level: ${Math.round(sensorData.light)}%`
        : "";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `You are a highly advanced botanical diagnostic system specializing in Indian agriculture and urban gardening. Analyze this plant image and the provided environmental data with absolute precision.
              1. Identify the exact plant species and provide a definitive health status.
              2. Identify any pests (e.g., aphids, spider mites) or beneficial insects (e.g., ladybugs, lacewings) present with certainty.
              3. Provide a factual explanation of any diseases, pest damage, or issues observed. 
              4. Use the sensor data to provide confirmed, expert-level care solutions suitable for the Indian climate (e.g., monsoon care, heat protection).
              5. If pests are found, provide specific, proven organic/non-toxic remedies common in India (e.g., Neem oil, soap water, wood ash).
              
              Avoid using hedging language like "it appears", "possibly", "likely", or "I think". State your findings as confirmed facts.
              ${sensorContext}` },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plantName: { type: Type.STRING, description: "The common name of the plant identified." },
              status: { 
                type: Type.STRING, 
                enum: ["Healthy", "Leaf Spot", "Yellow Leaf", "Fungus", "Pest Infestation", "Beneficial Insects Found", "Unknown"],
                description: "The health status or insect presence." 
              },
              confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1." },
              description: { type: Type.STRING, description: "A brief description of what was observed, including specific pests or insects." },
              symptoms: { type: Type.STRING, description: "Key symptoms observed in the plant." },
              treatment: { type: Type.STRING, description: "Recommended treatment or remedy." },
              suggestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of 3-4 specific care or pest management suggestions."
              }
            },
            required: ["plantName", "status", "suggestions", "description", "symptoms", "treatment"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI");
      }
      
      // Defensive JSON parsing
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      const result = JSON.parse(cleanText);
      return {
        plantName: result.plantName || "Unknown Plant",
        status: result.status || "Unknown",
        confidence: result.confidence || 0.5,
        description: result.description || "No description available.",
        symptoms: result.symptoms || "No specific symptoms identified.",
        treatment: result.treatment || "No specific treatment recommended.",
        suggestions: result.suggestions || ["Keep monitoring your plant.", "Ensure proper watering.", "Check for pests regularly."]
      };
    } catch (error: any) {
      console.error(`Error analyzing plant with key starting with ${apiKey.substring(0, 4)}:`, error);
      lastError = error;
      // Continue to next key
    }
  }

  // If we get here, all keys failed
  const originalMsg = lastError?.message || String(lastError);
  return {
    plantName: "Unknown Plant",
    status: "Unknown",
    confidence: 0,
    description: `AI_ERROR: ${originalMsg}`,
    suggestions: ["Try taking a photo in better lighting.", "Ensure the leaf is clearly visible."]
  };
}

export async function getGrowthSuggestions(plantName: string): Promise<{ suggestions: string[], harvestDays: number }> {
  const validKeys = getValidKeys();
  if (validKeys.length === 0) {
    return {
      suggestions: ["Add your Gemini API key to get personalized suggestions."],
      harvestDays: 60
    };
  }

  for (const apiKey of validKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a professional Indian horticulturist. Provide 4 specific, high-quality growth suggestions for ${plantName} to ensure a healthy harvest in the Indian climate. Also, estimate the typical number of days from planting to harvest for this plant in tropical/sub-tropical conditions.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 specific growth suggestions."
              },
              harvestDays: {
                type: Type.NUMBER,
                description: "Estimated days from planting to harvest."
              }
            },
            required: ["suggestions", "harvestDays"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response");
      
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("Error getting growth suggestions:", error);
    }
  }

  return {
    suggestions: ["Ensure proper sunlight.", "Water consistently.", "Use well-draining soil.", "Monitor for pests."],
    harvestDays: 60
  };
}

export async function analyzeGrowthFromImage(
  imageBase64: string,
  plantName?: string
): Promise<{ 
  plantName: string; 
  growthStage: string; 
  healthStatus: string; 
  suggestions: string[]; 
  estimatedHarvestDays: number;
  confidence: number;
}> {
  const validKeys = getValidKeys();
  if (validKeys.length === 0) {
    throw new Error("Gemini API key is missing.");
  }

  for (const apiKey of validKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (!matches || matches.length !== 3) {
        throw new Error("Invalid image format");
      }
      
      const mimeType = matches[1];
      const data = matches[2];

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `You are a professional Indian horticulturist. Analyze this image of a ${plantName || 'plant'} and provide a detailed growth assessment suitable for Indian urban gardening.
              1. Identify the plant species (if not provided).
              2. Determine the current growth stage (e.g., Seedling, Vegetative, Flowering, Fruiting).
              3. Assess the overall health status.
              4. Provide 4 specific growth suggestions to optimize its development in the Indian climate.
              5. Estimate the total number of days from planting to harvest for this specific plant in Indian conditions.
              
              Return the result in JSON format.` },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              plantName: { type: Type.STRING, description: "The name of the plant identified." },
              growthStage: { type: Type.STRING, description: "Current stage of growth." },
              healthStatus: { type: Type.STRING, description: "Overall health assessment." },
              suggestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "4 specific growth suggestions."
              },
              estimatedHarvestDays: { type: Type.NUMBER, description: "Estimated total days from planting to harvest." },
              confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1." }
            },
            required: ["plantName", "growthStage", "healthStatus", "suggestions", "estimatedHarvestDays", "confidence"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response");
      
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      return JSON.parse(cleanText);
    } catch (error) {
      console.error("Error analyzing growth from image:", error);
    }
  }

  throw new Error("Failed to analyze growth from image after trying all API keys.");
}
