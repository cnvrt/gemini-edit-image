// src/app/api/process-command/route.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest/NextResponse

// --- Environment Variables and Constants ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Store your API key in .env.local
const MODEL_NAME = "gemini-pro"; // Use the appropriate model

// --- Input Validation ---
async function isValidRequest(request: NextRequest): Promise<{ valid: boolean; command?: string; error?: string }> {
    try {
        const body = await request.json(); // Parse JSON body from Request object
        if (body && typeof body.command === 'string' && body.command.trim().length > 0) {
            return { valid: true, command: body.command.trim() };
        } else {
            return { valid: false, error: 'Invalid request body. "command" string is required.' };
        }
    } catch (error) {
        return { valid: false, error: 'Invalid JSON body.' };
    }
}

// --- Gemini Prompt Design (CRUCIAL PART - Same as before) ---
function createGeminiPrompt(userCommand: string): string {
    // *** Paste the exact same prompt function from the previous example here ***
    return `
Analyze the following user command (which might be in Hindi, English, or Hinglish) related to tasks and financial transactions. Extract the relevant information and return ONLY a valid JSON object with the following structure:

{
  "type": "TASK" | "TRANSACTION" | "UNKNOWN",
  "status": "COMPLETE" | "PENDING" | "NEEDS_TIME" | "UNKNOWN",
  "description": "string",
  "time": "YYYY-MM-DDTHH:mm:ssZ" | null,
  "isCompleted": boolean,
  "amount": number | null,
  "isIncome": boolean | null,
  "person": "string" | null,
  "currency": "INR" | null,
  "followUpQuestion": "string" | null
}

Important Rules:
- If it's clearly a task (e.g., "roti banayi", "doctor ke paas jana hai"), set type to TASK.
- If it clearly involves money ('rupay', 'rs', 'bheje', 'aaye'), set type to TRANSACTION.
- If unsure about type, set to UNKNOWN.
- Analyze tense carefully for 'isCompleted' and 'status'.
- Time Extraction: Be precise. Return ISO 8601 UTC or null.
- Amount Extraction: Extract only the number.
- Description: Make it meaningful.
- JSON Only: Respond ONLY with the JSON object.

User Command: "${userCommand}"

JSON Response:
`;
}


// --- Function to Safely Parse Gemini's JSON Response (Same as before) ---
function safeJsonParse(jsonString: string): any | null {
    try {
        const cleanedString = jsonString.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanedString);
    } catch (error) {
        console.error("Failed to parse JSON from Gemini:", error);
        console.error("Original Gemini Response String:", jsonString);
        return null;
    }
}

// --- API Route Handler for POST requests ---
export async function POST(request: NextRequest) {

    if (!GEMINI_API_KEY) {
        console.error("Gemini API Key not configured.");
        // Use NextResponse for App Router
        return NextResponse.json({ message: 'API key not configured on server.' }, { status: 500 });
    }

    // Validate request body
    const validationResult = await isValidRequest(request);
    if (!validationResult.valid) {
        return NextResponse.json({ message: validationResult.error }, { status: 400 });
    }
    const userCommand = validationResult.command!; // We know it's valid here

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // --- Safety Settings and Generation Config (Same as before) ---
        const generationConfig = {
            temperature: 0.3,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        };
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const prompt = createGeminiPrompt(userCommand);
        const parts = [{ text: prompt }];

        console.log("Sending prompt to Gemini for command:", userCommand);

        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig,
            safetySettings,
        });

        // --- Process Gemini Response (Similar logic, adapt error checking if needed) ---
         if (!result || !result.response) {
             console.error("Gemini response structure invalid:", result);
             throw new Error("Invalid response structure from Gemini.");
         }
         const response = result.response;
         if (response.promptFeedback?.blockReason) {
             console.warn("Gemini blocked prompt:", response.promptFeedback.blockReason);
             return NextResponse.json({ message: `Request blocked due to safety settings: ${response.promptFeedback.blockReason}` }, { status: 400 });
         }
         if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
             console.warn("No valid candidates in Gemini response:", response);
             throw new Error("No content candidates received from Gemini.");
         }
         // Optional: Check finishReason
         // if (response.candidates[0].finishReason !== 'STOP') { ... }

        const geminiTextResponse = response.text();
        console.log("Raw Gemini Text Response:", geminiTextResponse);

        const parsedJson = safeJsonParse(geminiTextResponse);

        if (parsedJson) {
            console.log("Successfully parsed JSON:", parsedJson);
            // Use NextResponse.json to send response
            return NextResponse.json(parsedJson, { status: 200 });
        } else {
            console.error("Failed to parse JSON response from Gemini for command:", userCommand);
            return NextResponse.json({ message: 'Failed to process AI response format.' }, { status: 500 });
        }

    } catch (error) {
        console.error("Error calling Gemini API or processing command:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ message: 'Error processing command via AI.', error: errorMessage }, { status: 500 });
    }
}

// Optional: Add handlers for other methods like GET if needed
// export async function GET(request: NextRequest) {
//     return NextResponse.json({ message: 'GET method not supported for this endpoint.' }, { status: 405 });
// }