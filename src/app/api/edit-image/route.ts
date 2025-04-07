// app/api/edit-image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  Part,
} from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'node:fs/promises'; // Use promise-based fs
import path from 'node:path';
import os from 'node:os';
import mime from 'mime-types';
import { randomUUID } from 'node:crypto'; // For unique filenames

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY environment variable.");
  // Don't throw error during build time if env var isn't set yet
  // throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;
// const genAI = new GoogleGenerativeAI(apiKey);
// const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Uploads the given file to Gemini.
 */
async function uploadToGemini(filePath: string, mimeType: string): Promise<Part> {
  if (!fileManager) {
    throw new Error('FileManager not initialized. Check API Key.');
  }
  console.log(`Uploading file: ${filePath}, MIME Type: ${mimeType}`);
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName: path.basename(filePath),
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  // Return the Part object needed for the generateContent request
  return { fileData: { mimeType: file.mimeType, fileUri: file.uri } };
}

// IMPORTANT: Choose the right model.
// 'gemini-1.5-flash' is good for multimodal understanding but might not *edit* images directly.
// 'gemini-pro-vision' is similar.
// The model mentioned in the original snippet 'gemini-2.0-flash-exp-image-generation'
// might be experimental or specific for image generation/editing.
// Using 'gemini-1.5-flash' as a placeholder for multimodal input.
// Adjust if you have access to a specific image editing model.
// const modelName = "gemini-1.5-pro"; // Or "gemini-pro-vision", or the specific generation model if available
const modelName = "gemini-2.0-flash-exp-image-generation";

// const generationConfig = {
//   temperature: 0.8, // Adjust as needed
//   topP: 0.95, // Adjust as needed
//   topK: 40, // Adjust as needed
//   maxOutputTokens: 8192,
//   responseMimeType: "image/png", // Request image output if model supports it
// };
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: [
    "image",
    "text",
  ],
  responseMimeType: "text/plain",
};

// Safety settings (optional, adjust as needed)
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];


export async function POST(req: NextRequest) {
  if (!genAI || !fileManager) {
     return NextResponse.json({ error: 'Gemini AI client not initialized. Check API Key.' }, { status: 500 });
  }

  let tempFilePath: string | null = null; // Keep track of temp file path

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    // 1. Save the uploaded file temporarily
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const uniqueFilename = `${randomUUID()}-${file.name}`;
    tempFilePath = path.join(tempDir, uniqueFilename);
    await fs.writeFile(tempFilePath, fileBuffer);
    console.log(`Temporary file saved to: ${tempFilePath}`);

    const mimeType = file.type || mime.lookup(tempFilePath) || 'application/octet-stream';

    // 2. Upload the temporary file to Gemini
    const imagePart = await uploadToGemini(tempFilePath, mimeType);

    // 3. Call the Generative Model
    const model = genAI.getGenerativeModel({
        model: modelName, // Use the appropriate model
        generationConfig, // Uncomment if needed
        // safetySettings, // Uncomment if needed
    });

    console.log(`Sending request to Gemini... ${modelName}`);
    const result = await model.generateContent([prompt, imagePart]); // Send prompt and image

    // console.log(`\n\n\n\nReceived response from Gemini. ${JSON.stringify(result.response)}\n\n\n\n`);
    const response = result.response;

    // 4. Process the response
    // Check if the response contains image data. The structure might vary
    // depending on the model and how it returns images (inlineData vs. text description).
    // This part heavily depends on the specific model's output format for images.
    // Assuming the model returns inlineData similar to the original script:

    let outputImageData: string | null = null; // Base64 data
    let outputMimeType: string | null = null;

     // If the model directly supports image output and returns it in parts:
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                 // Check if the part contains inline image data
                if (part.inlineData && part.inlineData.data && part.inlineData.mimeType.startsWith('image/')) {
                    outputImageData = part.inlineData.data; // Base64 encoded data
                    outputMimeType = part.inlineData.mimeType;
                    console.log(`Found image output: ${outputMimeType}`);
                    break; // Assuming only one image output for now
                }
                 // Check if the part is text (fallback or description)
                 else if (part.text) {
                     console.log("Received text part:", part.text);
                     // Handle text response if needed (e.g., model describes the edit instead of performing it)
                 }
            }
        }
    }

    // Fallback or alternative: Check the top-level text response if no image data found
    if (!outputImageData) {
        const textResponse = response.text();
        console.log("Gemini text response:", textResponse);
         // Maybe the model described the image or gave an error?
         // You might need to parse this text if the model doesn't return direct image data.
         // For now, we'll return an error if no image is found.
         // return NextResponse.json({ error: 'Model did not return an image. Response: ' + textResponse }, { status: 500 });
    }


    // 5. Clean up the temporary file
    if (tempFilePath) {
      await fs.unlink(tempFilePath);
      console.log(`Deleted temporary file: ${tempFilePath}`);
    }

    if (outputImageData && outputMimeType) {
         // 6. Return the result (base64 image data)
        return NextResponse.json({
            imageData: outputImageData,
            mimeType: outputMimeType,
        });
    } else {
         // Handle cases where no image was returned
        const textResponse = response.text();
        console.error("No image data found in Gemini response. Full text:", textResponse);
        return NextResponse.json({ error: 'Failed to get image data from Gemini. Model might not support direct image editing/output in this way or returned text.', details: textResponse }, { status: 500 });
    }


  } catch (error: any) {
    console.error('Error processing image edit request:', error);
    // Clean up temp file even if error occurs
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`Deleted temporary file after error: ${tempFilePath}`);
      } catch (unlinkError) {
        console.error("Error deleting temporary file during error handling:", unlinkError);
      }
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message || String(error) }, { status: 500 });
  }
}