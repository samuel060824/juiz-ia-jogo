
const express = require("express");
const OpenAI = require("openai");

const app = express();
app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;
const GAME_SECRET = process.env.GAME_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("Juiz de respostas do jogo está online!");
});

app.post("/avaliar", async (req, res) => {
  try {
    if (!GAME_SECRET || req.get("x-game-secret") !== GAME_SECRET) {
      return res.status(401).json({
        ok: false,
        error: "Acesso não autorizado."
      });
    }

    const { theme, answer } = req.body || {};

    if (
      typeof theme !== "string" ||
      !theme.trim() ||
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "Envie o tema e a resposta."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Chave da OpenAI não configurada."
      });
    }

    const result = await openai.responses.create({
      model: "gpt-4o-mini",

      instructions: `
Você é o juiz de um jogo de categorias.
Avalie se a resposta tem relação clara com o tema.
Aceite respostas válidas em português, sinônimos
e nomes próprios pertinentes.
Rejeite respostas aleatórias, sem sentido ou
sem relação com o tema.
Se houver dúvida, seja conservador.
`,

      input: `Tema: ${theme}
Resposta: ${answer}
A resposta é válida para esse tema?`,

      text: {
        format: {
          type: "json_schema",
          name: "avaliacao_resposta",
          strict: true,
          schema: {
            type: "object",
            properties: {
              valid: { type: "boolean" },
              reason: { type: "string" }
            },
            required: ["valid", "reason"],
            additionalProperties: false
          }
        }
      }
    });

    const parsed = JSON.parse(result.output_text);

    return res.json({
      ok: true,
      valid: parsed.valid,
      reason: parsed.reason || ""
    });

  } catch (error) {
    console.error("Erro:", error);

    return res.status(500).json({
      ok: false,
      error: "Não foi possível avaliar a resposta."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor iniciado na porta " + PORT);
});
