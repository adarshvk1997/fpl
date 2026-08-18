import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Sonnet 5 is the right cost/quality point for this app: strong enough for
// nuanced squad reasoning and pundit-style writing, cheap enough that even
// several generations per gameweek stay in the pennies-per-month range.
export const AI_MODEL = "claude-sonnet-5";
