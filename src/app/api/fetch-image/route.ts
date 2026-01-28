import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    // Fetch the image from the external URL
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image as a buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to base64
    const base64 = buffer.toString('base64');
    
    // Get content type from response or default to png
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Return as data URL
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      imageData: dataUrl,
    });
  } catch (error: any) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
