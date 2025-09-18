import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Summarization Logic (from CLI tool) ---
async function summarizeUrl(url) {
  // 1. Fetch URL content
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const html = await response.text();

  // 2. Extract text using jsdom
  const dom = new JSDOM(html);
  dom.window.document.querySelectorAll('script, style').forEach(el => el.remove());
  const textContent = dom.window.document.body.textContent || "";
  const cleanText = textContent.replace(/\s\s+/g, ' ').trim();

  if (!cleanText) {
    throw new Error('Could not extract text content from the URL.');
  }

  // 3. Summarize using Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const prompt = `以下の文章を5行の日本語で簡潔に要約してください。

${cleanText}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// --- Express Server Setup ---
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve files from the 'public' directory

// --- API Endpoint ---
app.post('/summarize', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`Received request to summarize: ${url}`);

  try {
    const summary = await summarizeUrl(url);
    console.log(`Successfully summarized: ${url}`);
    res.json({ summary });
  } catch (error) {
    console.error('Summarization failed:', error.message);
    // Check for specific API quota error
    if (error.message.includes('429')) {
        return res.status(429).json({ error: 'API quota exceeded. Please try again later.' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
