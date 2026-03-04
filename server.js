import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

app.use(cors());
app.use(express.json());

app.post('/api/oracle', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question required' });
    }

    console.log("🔮 Backend received question:", question);

    const requestPayload = {
  model: "llama3-8b-8192",
  messages: [
    {
      role: "system",
      content: "You are an OS expert AI Oracle inside a fantasy RPG called OQUEST. Speak mystically using OS metaphors. Keep answers 60-100 words."
    },
    {
      role: "user",
      content: question
    }
  ],
  temperature: 0.7,
  max_tokens: 180
};

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestPayload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Groq API Error:", response.status, data);
      return res.status(response.status).json({
        error: data.error?.message || "Groq API error"
      });
    }

    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return res.json({
        text: "🔮 The Oracle gazes into the void but returns no prophecy..."
      });
    }

    console.log("✨ Oracle Response:", text);
    res.json({ text });

  } catch (error) {
    console.error("🔴 Backend error:", error);
    res.status(500).json({
      error: error.message,
      text: `🔮 The portal flickers: ${error.message}`
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🌳 Server running on http://localhost:${PORT}`);
});