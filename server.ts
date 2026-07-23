import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const getOpenAIKey = (customKey?: string): string => {
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
    return (process.env.OPENAI_API_KEY || "").trim();
  };

  // Health endpoint
  const handleHealth = (_req: express.Request, res: express.Response) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
  };
  app.get("/api/health", handleHealth);

  // Status endpoint
  const handleStatus = (_req: express.Request, res: express.Response) => {
    const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0);
    res.json({
      hasOpenAIKey,
      hasGeminiKey: false,
    });
  };
  app.get("/api/status", handleStatus);
  app.get("/api/llm/status", handleStatus);

  // Embeddings endpoint
  const handleEmbed = async (req: express.Request, res: express.Response) => {
    try {
      const { text, customApiKey } = req.body || {};
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text string is required" });
      }

      const apiKey = getOpenAIKey(customApiKey);
      if (!apiKey) {
        return res.status(400).json({
          error: "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY environment variable or enter your key in Settings.",
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
        return res.json({ embedding: data.data[0].embedding });
      }

      return res.status(500).json({ error: "No embedding returned from OpenAI API." });
    } catch (error: any) {
      console.error("Embedding API error:", error?.message || error);
      res.status(500).json({
        error: error?.message || "Failed to generate embedding",
      });
    }
  };
  app.post("/api/embed", handleEmbed);
  app.post("/api/llm/embed", handleEmbed);

  // Chat completion endpoint
  const handleChat = async (req: express.Request, res: express.Response) => {
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

      const apiKey = getOpenAIKey(customApiKey);
      if (!apiKey) {
        return res.status(400).json({
          error: "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY environment variable or enter your key in Settings.",
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
      return res.json({ text: textResult });
    } catch (error: any) {
      console.error("Chat API error:", error?.message || error);
      res.status(500).json({
        error: error?.message || "Failed to generate LLM response",
      });
    }
  };
  app.post("/api/chat", handleChat);
  app.post("/api/llm/chat", handleChat);

  // Vite middleware for dev / static for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
