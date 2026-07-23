import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      messages = [],
      systemPrompt,
      customApiKey,
      model = "gpt-4o-mini",
      responseMimeType,
      temperature,
      images = [],
    } = req.body || {};

    const apiKey = (customApiKey && customApiKey.trim().length > 0)
      ? customApiKey.trim()
      : (process.env.OPENAI_API_KEY || "").trim();

    if (!apiKey) {
      return res.status(400).json({
        error: "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY environment variable in Vercel or enter your key in Settings.",
      });
    }

    const formattedMessages: any[] = [];
    if (systemPrompt) {
      formattedMessages.push({ role: "system", content: systemPrompt });
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLastMsg = i === messages.length - 1;

      if (isLastMsg && images && images.length > 0 && msg.role === "user") {
        const contentParts: any[] = [];
        for (const img of images) {
          const dataUrl = img.data.startsWith("data:")
            ? img.data
            : `data:${img.mimeType || "image/png"};base64,${img.data}`;
          contentParts.push({
            type: "image_url",
            image_url: { url: dataUrl },
          });
        }
        contentParts.push({ type: "text", text: msg.content || "Analyze this image and context." });
        formattedMessages.push({
          role: "user",
          content: contentParts,
        });
      } else {
        formattedMessages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        });
      }
    }

    const selectedModel = typeof model === "string" && model.includes("gpt") ? model : "gpt-4o-mini";
    const bodyPayload: any = {
      model: selectedModel,
      messages: formattedMessages,
      temperature: typeof temperature === "number" ? temperature : 0.7,
    };

    if (responseMimeType === "application/json") {
      bodyPayload.response_format = { type: "json_object" };
      const hasJsonWord = formattedMessages.some(
        (m) => typeof m.content === "string" && m.content.toLowerCase().includes("json")
      );
      if (!hasJsonWord) {
        formattedMessages.unshift({
          role: "system",
          content: "You are a JSON generator assistant. Please output your response as a valid JSON object.",
        });
      }
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || `OpenAI Chat API returned status ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const textResult = data.choices?.[0]?.message?.content || "";
    return res.status(200).json({ text: textResult });
  } catch (error: any) {
    console.error("Vercel api/chat error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error in /api/chat" });
  }
}
