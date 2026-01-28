import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const { imageData, prompt, step } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Initialize the AI client
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Convert base64 to proper format for Gemini
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Determine the mime type from the data URL
    const mimeTypeMatch = imageData.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

    // Create the full prompt that includes the image editing instruction
    const fullPrompt = `${prompt}\n\nTransform the provided image according to these instructions.`;

    // Generate content with the prompt and image
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '3:4',
          imageSize: '2K',
        },
      },
    });

    // Extract the generated image from response
    let generatedImageData: string | null = null;

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          generatedImageData = part.inlineData.data;
          break;
        }
      }
    }

    if (!generatedImageData) {
      console.error('No image in response:', JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: 'No image generated from API. Response structure unexpected.' },
        { status: 500 }
      );
    }

    // Clean up the AI output: make off-white background pure white
    // Use linear adjustment to boost whites while keeping blacks
    const imageBuffer = Buffer.from(generatedImageData, 'base64');
    const cleanedImage = await sharp(imageBuffer)
      .linear(1.1, 10) // Multiply by 1.1 and add 10 to push near-whites to pure white
      .png()
      .toBuffer();
    
    const cleanedBase64 = cleanedImage.toString('base64');

    return NextResponse.json({
      success: true,
      imageData: `data:image/png;base64,${cleanedBase64}`,
      step: step,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to transform image',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
