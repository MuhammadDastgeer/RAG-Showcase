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
    const { text, customApiKey } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text string is required" });
    }

    const apiKey = (customApiKey && customApiKey.trim().length > 0)
      ? customApiKey.trim()
      : (process.env.OPENAI_API_KEY || "").trim();

    if (!apiKey) {
      return res.status(400).json({
        error: "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY environment variable in Vercel or enter your key in Settings.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || `OpenAI Embedding API returned status ${response.status}`;
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    if (data.data && data.data[0]?.embedding) {
      return res.status(200).json({ embedding: data.data[0].embedding });
    }

    return res.status(500).json({ error: "No embedding returned from OpenAI API." });
  } catch (error: any) {
    console.error("Vercel api/embed error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error in /api/embed" });
  }
}
