import { deepseek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 返回流式数据
export async function POST(request: Request) {
  const { messages } = await request.json();

  // 代理 7890 端口
  const result = streamText({
    model: deepseek("deepseek-chat"),
    // system: "You are a friendly assistant!",
    messages,
    maxSteps: 5,
  });

  console.log(request, "1111111111111");

  return result.toDataStreamResponse();
}
