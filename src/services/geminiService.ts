import { GoogleGenAI, Type } from "@google/genai";
import { PlantAnalysisResult } from "../types";

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `You are a highly advanced botanical diagnostic system specializing in Indian agriculture and urban gardening. Analyze this plant image and the provided environmental data with absolute precision.
            
            IMPORTANT: You MUST provide the entire response in the following language: ${language}.
            
            1. Identify the exact plant species and provide a definitive health status.
            2. Identify any pests (e.g., aphids, spider mites) or beneficial insects (e.g., ladybugs, lacewings) present with certainty.
            3. Provide a factual explanation of any diseases, pest damage, or issues observed. 
            4. Provide a deep, detailed analysis of the underlying causes (e.g., nutrient deficiency, overwatering, fungal pathogens).
            5. Recommend specific fertilizers suitable for the Indian market (e.g., NPK ratios, organic compost, bone meal) and how to apply them.
            6. Give expert advice on soil health and improvement.
            7. Use the sensor data to provide confirmed, expert-level care solutions suitable for the Indian climate (e.g., monsoon care, heat protection).
            8. If pests are found, provide specific, proven organic/non-toxic remedies common in India (e.g., Neem oil, soap water, wood ash).
            9. Provide a step-by-step action checklist for the user to follow.
            
            CRITICAL: You MUST provide ALL text fields (plantName, status, description, symptoms, treatment, detailedAnalysis, fertilizerSuggestion, soilAdvice, suggestions, checklist) in the following language: ${language}.
            
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional Indian horticulturist with decades of experience in both traditional and urban farming. Provide an extremely deep, expert-level growth analysis and advice for ${plantName} which was planted ${daysPlanted} days ago. 
      
      IMPORTANT: You MUST provide the entire response in the following language: ${language}.
      
      1. Analyze its current growth stage (seedling, vegetative, flowering, etc.) based on the age. Explain the physiological changes happening in the plant right now.
      2. Provide specific fertilizer recommendations. Mention exact types (e.g., NPK 19:19:19, Vermicompost, Mustard cake, Bone meal, Seaweed extract) and precise dosage/frequency suitable for this age in the Indian climate. Explain WHY these nutrients are needed now.
      3. Give precise watering instructions, considering the current growth stage and typical Indian weather.
      4. Identify potential pests, fungal diseases, or physiological disorders common at this specific age and how to prevent them using both organic and integrated pest management (IPM) techniques.
      5. Estimate the total days to harvest and what signs to look for when it's ready.
      
      Be exceptionally detailed, technical, and factual. Avoid hedging. Provide at least 5-6 sentences for each advice category to ensure the user gets a comprehensive guide.`,
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: `You are a professional Indian horticulturist. Analyze this image of a ${plantName || 'plant'} and provide a detailed growth assessment suitable for Indian urban gardening.
            
            IMPORTANT: You MUST provide the entire response in the following language: ${language}.
            
            1. Identify the plant species (if not provided).
            2. Determine the current growth stage (e.g., Seedling, Vegetative, Flowering, Fruiting).
            3. Assess the overall health status.
            4. Provide 4 specific growth suggestions to optimize its development in the Indian climate.
            5. Estimate the total number of days from planting to harvest for this specific plant in Indian conditions.
            
            Return the result in JSON format. Be very detailed in your suggestions.` },
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
