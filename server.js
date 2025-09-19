import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Summarization Logic (with detailed logging) ---
async function summarizeUrl(url) {
  try {
    // 1. Fetch URL content
    console.log('Step 1: Fetching URL content...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    console.log('Step 1 successful: URL content fetched.');

    // 2. Extract text using jsdom
    console.log('Step 2: Extracting text with jsdom...');
    const dom = new JSDOM(html);
    dom.window.document.querySelectorAll('script, style').forEach(el => el.remove());
    const textContent = dom.window.document.body.textContent || "";
    const cleanText = textContent.replace(/\s\s+/g, ' ').trim();
    console.log(`Step 2 successful: Text extracted. Length: ${cleanText.length}`);

    if (!cleanText) {
      throw new Error('Could not extract text content from the URL.');
    }

    // 3. Summarize using Gemini API
    console.log('Step 3: Initializing Gemini API...');
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('Step 3 successful: Gemini API initialized.');

    // Truncate text to avoid overly long prompts
    const maxPromptLength = 15000; // Set a reasonable character limit
    const truncatedText = cleanText.substring(0, maxPromptLength);
    const prompt = `以下の文章を5行の日本語で簡潔に要約してください。\n\n${truncatedText}`;

    console.log(`Step 4: Calling Gemini API to generate content (prompt length: ${truncatedText.length})...`);
    const result = await model.generateContent(prompt);
    console.log('Step 4 successful: Received response from Gemini API.');
    
    const summary = result.response.text();
    console.log('Step 5: Summary generated successfully.');
    return summary;

  } catch (error) {
    console.error('Error within summarizeUrl function:', error);
    throw error; // Re-throw the error to be caught by the endpoint handler
  }
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
    // Log the full error object for better diagnostics
    console.error('Summarization failed in endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
