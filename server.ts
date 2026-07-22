import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const getGeminiApiKey = (customKey?: string): string => {
    if (customKey && customKey.trim().length > 0 && !customKey.trim().startsWith("sk-")) {
      return customKey.trim();
    }
    return process.env.GEMINI_API_KEY || "";
  };

  const getOpenAIKeys = (customKey?: string): string[] => {
    const keys: string[] = [];
    if (customKey && customKey.trim().length > 0 && customKey.trim().startsWith("sk-")) {
      keys.push(customKey.trim());
    }
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0) {
      keys.push(process.env.OPENAI_API_KEY.trim());
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
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
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

      // Try OpenAI first
      const openAiKeys = getOpenAIKeys(customApiKey);
      if (openAiKeys.length > 0) {
        for (const apiKey of openAiKeys) {
          try {
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
            if (response.ok) {
              const data = await response.json();
              if (data.data && data.data[0]?.embedding) {
                return res.json({ embedding: data.data[0].embedding });
              }
            } else {
              const errBody = await response.json().catch(() => ({}));
              console.warn("OpenAI embed response error:", response.status, errBody);
            }
          } catch (openAiErr) {
            console.warn("OpenAI embed attempt failed:", openAiErr);
          }
        }
      }

      // Fallback to Gemini if configured
      const geminiKey = getGeminiApiKey(customApiKey);
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const response = await ai.models.embedContent({
            model: "text-embedding-004",
            contents: text,
          });
          const resAny = response as any;
          const embedding = resAny.embedding?.values || resAny.embeddings?.[0]?.values;
          if (embedding && Array.isArray(embedding)) {
            return res.json({ embedding });
          }
        } catch (geminiErr) {
          console.warn("Gemini embed error:", geminiErr);
        }
      }

      return res.status(500).json({ error: "OpenAI API key is missing or invalid. Please provide a valid OpenAI API key in Settings." });
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
        images = [],
      } = req.body;

      // Try OpenAI first
      const candidateKeys = getOpenAIKeys(customApiKey);
      if (candidateKeys.length > 0) {
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

        for (const apiKey of candidateKeys) {
          try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(bodyPayload),
            });

            if (response.ok) {
              const data = await response.json();
              const textResult = data.choices?.[0]?.message?.content || "";
              return res.json({ text: textResult });
            } else {
              const errJson = await response.json().catch(() => ({}));
              console.warn("OpenAI chat response error:", response.status, errJson);
            }
          } catch (openAiErr) {
            console.warn("OpenAI chat error:", openAiErr);
          }
        }
      }

      // Fallback to Gemini if configured
      const geminiKey = getGeminiApiKey(customApiKey);
      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });

          const contents: any[] = messages.map((m: any) => ({
            role: m.role === "assistant" || m.role === "model" ? "model" : "user",
            parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
          }));

          if (images && images.length > 0 && contents.length > 0) {
            const lastMsgParts = contents[contents.length - 1].parts;
            for (const img of images) {
              const cleanBase64 = img.data.replace(/^data:image\/\w+;base64,/, "");
              lastMsgParts.unshift({
                inlineData: {
                  mimeType: img.mimeType || "image/png",
                  data: cleanBase64,
                },
              });
            }
          }

          const config: any = {};
          if (systemPrompt) {
            config.systemInstruction = systemPrompt;
          }
          if (typeof temperature === "number") {
            config.temperature = temperature;
          }
          if (responseMimeType === "application/json") {
            config.responseMimeType = "application/json";
          }

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents.length > 0 ? contents : [{ role: "user", parts: [{ text: "Hello" }] }],
            config,
          });

          return res.json({ text: response.text || "" });
        } catch (geminiErr: any) {
          console.warn("Gemini chat fallback error:", geminiErr?.message || geminiErr);
        }
      }

      return res.status(500).json({ error: "OpenAI API key is required. Please add your OpenAI API key in Settings." });
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
