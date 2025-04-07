// app/api/edit-two-images/route.ts
// (Imports waise hi rahenge jaise pehle wale API route mein the)
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

// --- API Key aur Client Initialization (Pehle jaisa) ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY environment variable.");
}
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null;
const modelName = "gemini-2.0-flash-exp-image-generation"; // *** IMPORTANT: Use a model capable of this! ***
// const modelName = "gemini-1.5-flash"; // Might only describe, not generate image output
// const modelName = "YOUR_MULTI_IMAGE_EDITING_MODEL"; // Replace if you have a specific one

// --- uploadToGemini function (Pehle jaisa) ---
async function uploadToGemini(filePath: string, mimeType: string): Promise<Part> {
   if (!fileManager) throw new Error('FileManager not initialized.');
   console.log(`Uploading file: ${filePath}, MIME Type: ${mimeType}`);
   const uploadResult = await fileManager.uploadFile(filePath, { mimeType, displayName: path.basename(filePath) });
   const file = uploadResult.file;
   console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
   return { fileData: { mimeType: file.mimeType, fileUri: file.uri } };
}

// --- Generation Config/Safety Settings (Optional, pehle jaisa) ---
// ...

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

export async function POST(req: NextRequest) {
  if (!genAI || !fileManager) {
     return NextResponse.json({ error: 'Gemini AI client not initialized. Check API Key.' }, { status: 500 });
  }

  let tempFilePath1: string | null = null; // Temp path for first file
  let tempFilePath2: string | null = null; // Temp path for second file

  try {
    const formData = await req.formData();
    // *** CHANGE: Get two image files ***
    const file1 = formData.get('image1') as File | null;
    const file2 = formData.get('image2') as File | null;
    const prompt = formData.get('prompt') as string | null;

    // *** CHANGE: Validate both files ***
    if (!file1 || !file2) {
      return NextResponse.json({ error: 'Two image files are required' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    // --- Save both files temporarily ---
    const tempDir = os.tmpdir();
    const uniqueFilename1 = `${randomUUID()}-${file1.name}`;
    const uniqueFilename2 = `${randomUUID()}-${file2.name}`;
    tempFilePath1 = path.join(tempDir, uniqueFilename1);
    tempFilePath2 = path.join(tempDir, uniqueFilename2);

    const fileBuffer1 = Buffer.from(await file1.arrayBuffer());
    await fs.writeFile(tempFilePath1, fileBuffer1);
    console.log(`Temp file 1 saved to: ${tempFilePath1}`);

    const fileBuffer2 = Buffer.from(await file2.arrayBuffer());
    await fs.writeFile(tempFilePath2, fileBuffer2);
    console.log(`Temp file 2 saved to: ${tempFilePath2}`);

    const mimeType1 = file1.type || 'image/png';
    const mimeType2 = file2.type || 'image/png';

    // --- Upload both files to Gemini ---
    const imagePart1 = await uploadToGemini(tempFilePath1, mimeType1);
    const imagePart2 = await uploadToGemini(tempFilePath2, mimeType2);

    // --- Call the Generative Model with prompt and BOTH images ---
    const model = genAI.getGenerativeModel({ model: modelName, generationConfig });

    console.log('Sending request to Gemini with prompt and two images...');
    // *** CHANGE: Send prompt, image1, image2 ***
    // The exact order might matter depending on the model and prompt
    const result = await model.generateContent([prompt, imagePart1, imagePart2]);

    console.log('Received response from Gemini.');
    const response = result.response;

    // --- Process response (Expecting ONE output image) ---
    let outputImageData: string | null = null;
    let outputMimeType: string | null = null;
    // (Logic to extract output image data remains similar to single image editing)
     if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data && part.inlineData.mimeType.startsWith('image/')) {
                    outputImageData = part.inlineData.data;
                    outputMimeType = part.inlineData.mimeType;
                    console.log(`Found single image output: ${outputMimeType}`);
                    break;
                } else if (part.text) {
                     console.log("Received text part:", part.text);
                     // Handle cases where model describes the combination instead of generating an image
                 }
            }
        }
    }
     // Fallback or alternative: Check the top-level text response if no image data found
    if (!outputImageData) {
        const textResponse = response.text();
        console.log("Gemini text response:", textResponse);
        // Maybe the model described the image or gave an error?
        // If text description is the expected output for this model, handle it here.
        // For now, return error if no *image* is found.
        // return NextResponse.json({ error: 'Model did not return an image. Response: ' + textResponse }, { status: 500 });
    }


    // --- Clean up BOTH temporary files ---
    // Use finally block to ensure cleanup even on error
    // (Cleanup logic moved to finally block below)

    if (outputImageData && outputMimeType) {
      return NextResponse.json({
          imageData: outputImageData,
          mimeType: outputMimeType,
      });
    } else {
      const textResponse = response.text(); // Get text response for error context
      console.error("No image data found in Gemini response for two-image edit. Full text:", textResponse);
      return NextResponse.json({ error: 'Failed to get combined image data from Gemini. Model might not support this operation or returned text only.', details: textResponse }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error processing two-image edit request:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message || String(error) }, { status: 500 });
  } finally {
    // --- Ensure cleanup of BOTH temp files ---
    if (tempFilePath1) {
      try { await fs.unlink(tempFilePath1); console.log(`Deleted temp file 1: ${tempFilePath1}`); }
      catch (unlinkError) { console.error("Error deleting temp file 1:", unlinkError); }
    }
    if (tempFilePath2) {
      try { await fs.unlink(tempFilePath2); console.log(`Deleted temp file 2: ${tempFilePath2}`); }
      catch (unlinkError) { console.error("Error deleting temp file 2:", unlinkError); }
    }
  }
}