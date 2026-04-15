import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { PlantAnalysisResult } from "../types";
import { getLanguageName } from "../lib/utils";

export function getAIErrorKey(error: any): string {
  const msg = (error?.message || String(error)).toLowerCase();
  if (msg.includes("api_key_invalid") || msg.includes("api key not valid") || msg.includes("invalid api key") || msg.includes("unexpected end of json input") || msg.includes("failed to execute 'json'")) {
    return "ai_error_api_key";
  }
  if (msg.includes("quota_exceeded") || msg.includes("quota") || msg.includes("limit reached")) {
    return "ai_error_quota";
  }
  if (msg.includes("safety") || msg.includes("blocked") || msg.includes("candidate was blocked")) {
    return "ai_error_safety";
  }
  return "ai_error_generic";
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzePlantDisease(
  imageBase64: string, 
  sensorData?: { moisture: number; temp: number; humidity: number; light: number },
  language: string = 'en'
): Promise<PlantAnalysisResult> {
  try {
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

    const targetLanguage = getLanguageName(language);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `You are a botanical diagnostic expert. Analyze this plant image and environmental data.
            
            Language: ${targetLanguage}.
            
            1. Identify species and health status.
            2. Identify pests or beneficial insects.
            3. Explain symptoms and causes.
            4. Recommend fertilizers and organic remedies common in India.
            5. Provide a step-by-step action checklist.
            
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
            detailedAnalysis: { type: Type.STRING, description: "A deep, scientific explanation of the plant's condition and underlying causes." },
            fertilizerSuggestion: { type: Type.STRING, description: "Specific fertilizer recommendations and application instructions." },
            soilAdvice: { type: Type.STRING, description: "Expert advice on soil health and maintenance." },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3-4 specific care or pest management suggestions."
            },
            checklist: {
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Step-by-step action checklist for the user."
            }
          },
          required: ["plantName", "status", "suggestions", "description", "symptoms", "treatment", "detailedAnalysis", "fertilizerSuggestion", "soilAdvice", "checklist"]
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
      detailedAnalysis: result.detailedAnalysis || "No detailed analysis available.",
      fertilizerSuggestion: result.fertilizerSuggestion || "No fertilizer suggestions available.",
      soilAdvice: result.soilAdvice || "No soil advice available.",
      suggestions: result.suggestions || ["Keep monitoring your plant.", "Ensure proper watering.", "Check for pests regularly."],
      checklist: result.checklist || ["Isolate the plant if possible.", "Remove affected leaves.", "Monitor surrounding plants."]
    };
  } catch (error: any) {
    console.error(`Error analyzing plant:`, error);
    const errorKey = getAIErrorKey(error);
    return {
      plantName: "Unknown Plant",
      status: "Unknown",
      confidence: 0,
      description: errorKey, // Return the key for translation
      suggestions: ["Try taking a photo in better lighting.", "Ensure the leaf is clearly visible."]
    };
  }
}

export async function getGrowthSuggestions(plantName: string, daysPlanted: number = 0, language: string = 'en'): Promise<{ 
  stageAdvice: string;
  fertilizerAdvice: string;
  wateringAdvice: string;
  pestAdvice: string;
  harvestDays: number;
}> {
  try {
    const targetLanguage = getLanguageName(language);
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional Indian horticulturist. Provide advice for ${plantName} planted ${daysPlanted} days ago. 
      
      Language: ${targetLanguage}.
      
      1. Analyze growth stage.
      2. Fertilizer recommendations (NPK, Vermicompost, etc.) for Indian climate.
      3. Watering instructions.
      4. Common pests/diseases prevention.
      5. Estimated harvest days.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stageAdvice: { type: Type.STRING, description: "Detailed analysis of the current growth stage and what to expect." },
            fertilizerAdvice: { type: Type.STRING, description: "Specific fertilizer names, NPK ratios, and application methods for this age." },
            wateringAdvice: { type: Type.STRING, description: "Precise watering frequency and quantity." },
            pestAdvice: { type: Type.STRING, description: "Pest prevention and common issues at this stage." },
            harvestDays: { type: Type.NUMBER, description: "Estimated total days from planting to harvest." }
          },
          required: ["stageAdvice", "fertilizerAdvice", "wateringAdvice", "pestAdvice", "harvestDays"]
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
    const errorKey = getAIErrorKey(error);
    return {
      stageAdvice: errorKey,
      fertilizerAdvice: errorKey,
      wateringAdvice: errorKey,
      pestAdvice: errorKey,
      harvestDays: 0
    };
  }
}

export async function analyzeGrowthFromImage(
  imageBase64: string,
  plantName?: string,
  language: string = 'en'
): Promise<{ 
  plantName: string; 
  growthStage: string; 
  healthStatus: string; 
  suggestions: string[]; 
  estimatedHarvestDays: number;
  confidence: number;
}> {
  try {
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid image format");
    }
    
    const mimeType = matches[1];
    const data = matches[2];

    const targetLanguage = getLanguageName(language);

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `You are a professional Indian horticulturist. Analyze image of ${plantName || 'plant'}.
            
            Language: ${targetLanguage}.
            
            1. Identify species.
            2. Determine growth stage.
            3. Assess health status.
            4. Provide 4 specific suggestions for Indian climate.
            5. Estimate days to harvest.` },
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
    const errorKey = getAIErrorKey(error);
    throw new Error(errorKey);
  }
}
