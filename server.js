import express from "express";
import fetch from "node-fetch";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Test route
app.get("/test", (req, res) => {
  res.send("✅ Backend is reachable!");
});

// --- API Helper Functions ---

/**
 * 🥇 Attempt 1: Solve with Google Gemini
 * Uses the generative model for step-by-step reasoning.
 */
async function solveWithGemini(question) {
  console.log("-> Trying Gemini...");
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set.");
    return null;
  }

  try {
    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `Solve this math problem step-by-step: ${question}` }],
          },
        ],
      }),
    });

    // --- ⬇️ FIXED LOGIC ⬇️ ---
    // Check if the response itself is OK before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini failed with status: ${response.status}`, errorText);
      return null;
    }

    // Now it's safe to parse
    const data = await response.json();
    // --- ⬆️ FIXED LOGIC ⬆️ ---

    if (data.error) {
      // This is for errors *inside* the JSON (like your quota error)
      console.error("Gemini API error:", data.error.message);
      return null;
    }

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (result) {
      console.log("Gemini success.");
      return result;
    } else {
      console.error("No valid response from Gemini.");
      return null;
    }
  } catch (error) {
    console.error("Error connecting to Gemini:", error.message);
    return null;
  }
}

/**
 * 🥈 Attempt 2: Solve with WolframAlpha
 * (This function was already correct and did not need changes)
 */
async function solveWithWolfram(question) {
  console.log("-> Trying WolframAlpha...");
  if (!process.env.WOLFRAM_API_KEY) {
    console.error("WOLFRAM_API_KEY not set.");
    return null;
  }

  try {
    const encodedQuestion = encodeURIComponent(question);
    const apiUrl = `http://api.wolframalpha.com/v1/result?appid=${process.env.WOLFRAM_API_KEY}&i=${encodedQuestion}`;

    const response = await fetch(apiUrl);

    if (response.ok) { // Status 200
      const result = await response.text();
      console.log("WolframAlpha success.");
      return `### WolframAlpha Solution\n${result}`;
    } else {
      // 501 means "Not Implemented" (Wolfram can't answer)
      console.error(`WolframAlpha failed with status: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error("Error connecting to WolframAlpha:", error.message);
    return null;
  }
}

/**
 * 🥉 Attempt 3: Solve with Hugging Face
 * Uses the DeepSeek Math model, which is specialized for math.
 */
async function solveWithHuggingFace(question) {
  console.log("-> Trying Hugging Face (DeepSeek Math)...");
  if (!process.env.HF_API_KEY) {
    console.error("HF_API_KEY not set.");
    return null;
  }

  try {
    // --- ⬇️ UPDATED MODEL AND PROMPT ⬇️ ---
    const apiUrl = "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct";

    // Llama 3 uses a specific chat template format
    const llamaPrompt = {
      inputs: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\nSolve this math problem step-by-step: ${question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
      parameters: {
        max_new_tokens: 512, // Limit the response length
        return_full_text: false, // Only return the assistant's part
      }
    };

    // --- ⬇️ FIXED LOGIC ⬇️ ---
    // Check if the response itself is OK before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face failed with status: ${response.status}`, errorText);
      // This is common if the model is loading (503) or not found
      return null;
    }

    // Now it's safe to parse
    const data = await response.json();
    // --- ⬆️ FIXED LOGIC ⬆️ ---

    const result = data?.[0]?.generated_text;
    if (result) {
      console.log("Hugging Face success.");
      const answer = result.split(prompt)[1] || result;
      return `### Hugging Face (DeepSeek) Solution\n${answer.trim()}`;
    } else {
      console.error("Hugging Face returned 200 but no valid text:", data);
      return null;
    }
  } catch (error) {
    console.error("Error connecting to Hugging Face:", error.message);
    return null;
  }
}

// === 🧮 MAIN SOLVE ROUTE (with Fallback Logic) ===
app.post("/api/solve", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "No question provided" });
  }

  console.log(`\nNew question received: "${question}"`);
  let result = null;

  // 1. Try Gemini
  result = await solveWithGemini(question);

  // 2. If Gemini fails, try WolframAlpha
  if (!result) {
    result = await solveWithWolfram(question);
  }

  // 3. If WolframAlpha fails, try Hugging Face
  if (!result) {
    result = await solveWithHuggingFace(question);
  }

  // 4. Check final result
  if (result) {
    res.json({ result });
  } else {
    console.log("All APIs failed to provide a solution.");
    res.status(500).json({
      error: "Sorry, all of our AI services are busy or could not solve this problem. Please try again later.",
    });
  }
});

// ✅ Serve frontend (for all other routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "solve.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});