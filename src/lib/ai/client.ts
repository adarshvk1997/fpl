import "server-only";
import { GoogleGenAI } from "@google/genai";

export const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Flash tier: cheap enough that even exceeding the free tier stays pennies,
// and the free tier itself (rate-limited, not "$0 forever unlimited") easily
// covers this app's real usage pattern — a handful of generations per
// gameweek, not per page load. See README for the cost breakdown.
export const AI_MODEL = "gemini-2.5-flash";
