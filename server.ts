import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Helper to get candidate OpenAI API keys (custom key first if present, then env key)
  const getOpenAIKeys = (customKey?: string): string[] => {
    const keys: string[] = [];
    if (customKey && customKey.trim().length > 0) {
      let key = customKey.trim();
      if (key.startsWith("k-proj-") || key.startsWith("k-")) {
        key = "s" + key;
      }
      keys.push(key);
    }
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0) {
      let envKey = process.env.OPENAI_API_KEY.trim();
      if (envKey.startsWith("k-proj-") || envKey.startsWith("k-")) {
        envKey = "s" + envKey;
      }
      if (!keys.includes(envKey)) {
        keys.push(envKey);
      }
    }
    if (keys.length === 0) {
      throw new Error("OPENAI_API_KEY is not configured. Please add OPENAI_API_KEY in Settings or .env file.");
    }
    return keys;
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
  });

  // Check API keys availability
  app.get("/api/llm/status", (_req, res) => {
    res.json({
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    });
  });

  // Embedding endpoint using OpenAI
  app.post("/api/llm/embed", async (req, res) => {
    try {
      const { text, customApiKey } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text string is required" });
      }

      const candidateKeys = getOpenAIKeys(customApiKey);

      let response: Response | null = null;
      let lastErr: any = null;

      keyLoop: for (const apiKey of candidateKeys) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await fetch("https://api.openai.com/v1/embeddings", {
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

            if (response.ok) {
              break keyLoop;
            } else {
              const errData = await response.json().catch(() => ({}));
              lastErr = new Error(errData.error?.message || `OpenAI Embedding error: ${response.statusText}`);
              if (response.status === 401 || response.status === 403) {
                // Invalid key, try next candidate key
                break;
              } else if (response.status === 429 || response.status >= 500) {
                await new Promise((r) => setTimeout(r, attempt * 1000));
              } else {
                break;
              }
            }
          } catch (err: any) {
            lastErr = err;
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, attempt * 1000));
            }
          }
        }
      }

      if (!response || !response.ok) {
        throw lastErr || new Error("Failed to generate embedding from OpenAI");
      }

      const data = await response.json();
      if (data.data && data.data[0]?.embedding) {
        return res.json({ embedding: data.data[0].embedding });
      } else {
        throw new Error("No embedding returned from OpenAI");
      }
    } catch (error: any) {
      console.error("Embedding API error:", error?.message || error);
      res.status(500).json({
        error: error?.message || "Failed to generate embedding",
      });
    }
  });

  // Chat completion endpoint using OpenAI
  app.post("/api/llm/chat", async (req, res) => {
    try {
      const {
        messages = [],
        systemPrompt,
        customApiKey,
        model = "gpt-4o-mini",
        responseMimeType,
        temperature,
        images = [], // array of base64 images { data: string, mimeType: string }
      } = req.body;

      const candidateKeys = getOpenAIKeys(customApiKey);

      const formattedMessages: any[] = [];
      if (systemPrompt) {
        formattedMessages.push({ role: "system", content: systemPrompt });
      }

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const isLastMsg = i === messages.length - 1;

        if (isLastMsg && images && images.length > 0 && msg.role === "user") {
          // Multimodal message for OpenAI Vision
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
            content: msg.content || "",
          });
        }
      }

      const selectedModel = model.includes("gpt") ? model : "gpt-4o-mini";
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
            content: "You are a JSON generator. Respond strictly with a valid JSON object.",
          });
        }
      }

      let response: Response | null = null;
      let lastErr: any = null;

      keyLoop: for (const apiKey of candidateKeys) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(bodyPayload),
            });

            if (response.ok) {
              break keyLoop;
            } else {
              const errData = await response.json().catch(() => ({}));
              lastErr = new Error(errData.error?.message || `OpenAI Chat error (${response.status}): ${response.statusText}`);
              if (response.status === 401 || response.status === 403) {
                // Invalid key, try next key
                break;
              } else if (response.status === 429 || response.status >= 500) {
                await new Promise((r) => setTimeout(r, attempt * 1000));
              } else {
                break;
              }
            }
          } catch (err: any) {
            lastErr = err;
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, attempt * 1000));
            }
          }
        }
      }

      if (!response || !response.ok) {
        throw lastErr || new Error("Failed to generate response from OpenAI");
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
  });

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
