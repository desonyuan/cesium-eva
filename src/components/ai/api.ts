// src/api.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function fetchStreamedAIResponse(messages: { role: "user" | "assistant"; content: string }[]) {
  const result = streamText({
    model: openai("gpt-3.5-turbo"),
    messages,
  });

  return result;
}
