import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-6.2-astra";
const allowedOrigin = process.env.FRONTEND_ORIGIN || "https://phillyphilly-lab.github.io";

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    // Allow command-line health checks; browser requests must match the configured site.
    if (!origin || origin === allowedOrigin) return callback(null, true);
    return callback(new Error("Origin not allowed by ScholarshipMatch AI server."));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "20kb" }));

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many questions in a short time. Please wait a minute and try again." }
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "ScholarshipMatch AI" }));

app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
      return res.status(400).json({ error: "Send between 1 and 12 recent messages." });
    }

    const cleanMessages = [];
    for (const item of messages) {
      if (!item || !["user", "assistant"].includes(item.role) ||
          typeof item.content !== "string" || item.content.length > 4000) {
        return res.status(400).json({ error: "A message was invalid or too long." });
      }
      cleanMessages.push({ role: item.role, content: item.content });
    }
    if (cleanMessages[cleanMessages.length - 1].role !== "user") {
      return res.status(400).json({ error: "The last message must be a user question." });
    }

    const response = await openai.responses.create({
      model,
      tools: [{ type: "web_search" }],
      instructions: `You are ScholarshipMatch AI, an educational assistant on an independent college-affordability website.
Help users understand scholarships, FAFSA, grants, college financial aid, student loans, deadlines, and comparing college costs.
For questions about current scholarships, deadlines, eligibility, award amounts, government rules, or current events, use web search and prioritize official scholarship-provider, college, state-agency, and government sources.
Clearly distinguish verified facts from estimates or general guidance. Never invent scholarships, deadlines, eligibility rules, amounts, or links. Say when information could not be verified.
Cite sources in your answer using the URLs returned by web search. Encourage users to confirm final eligibility and deadlines with the official provider or college.
Do not claim to submit applications, contact schools, or check a user's private financial-aid account. Never request passwords, Social Security numbers, bank details, or other sensitive credentials.
For loans, explain assumptions and avoid presenting general information as individualized financial, tax, or legal advice. Be clear, practical, and beginner-friendly.`,
      input: cleanMessages.map(m => ({
        role: m.role,
        content: [{ type: "input_text", text: m.content }]
      }))
    });

    const citations = [];
    for (const item of response.output || []) {
      if (item.type !== "message") continue;
      for (const part of item.content || []) {
        for (const annotation of part.annotations || []) {
          if (annotation.type === "url_citation" && annotation.url) {
            const url = annotation.url;
            if (!citations.some(c => c.url === url)) {
              citations.push({ title: annotation.title || url, url });
            }
          }
        }
      }
    }

    res.json({
      answer: response.output_text || "I couldn't generate an answer. Please try again.",
      citations
    });
  } catch (error) {
    console.error("ScholarshipMatch AI request failed:", error?.message || error);
    const status = error?.status === 429 ? 429 : 502;
    res.status(status).json({
      error: status === 429
        ? "The AI service is temporarily rate-limited. Please try again shortly."
        : "The research service couldn't complete that request. Please try again."
    });
  }
});

app.listen(port, () => console.log(`ScholarshipMatch AI server listening on ${port}`));
