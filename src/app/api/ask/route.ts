import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const key = process.env.GROK_API_KEY
  if (!key) {
    return new Response(JSON.stringify({ error: "GROK_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { messages, context } = await req.json()

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      stream: true,
      messages: [
        {
          role: "system",
          content: `You are a helpful, concise study assistant for a Yale College student using YScholar. Here is their current context:\n\n${context}\n\nHelp them study, plan, and prepare for exams. Give specific, actionable advice. Keep responses under 120 words. Reference their actual courses and exam dates when relevant.`,
        },
        ...messages,
      ],
    }),
  })

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "Unknown error")
    return new Response(JSON.stringify({ error: text }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  })
}
