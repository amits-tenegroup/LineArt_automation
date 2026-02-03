import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Size dimensions at 300 DPI
const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '30x40': { width: 9000, height: 12000 },
  '24x36': { width: 7200, height: 10800 },
  '24x32': { width: 7200, height: 9600 },
  '20x30': { width: 6000, height: 9000 },
  '18x24': { width: 5400, height: 7200 },
  '16x24': { width: 4800, height: 7200 },
  '12x16': { width: 3600, height: 4800 },
  '9x12': { width: 2700, height: 3600 },
};

// Bleed sizes in pixels
const BLEED_SIZES: Record<string, number> = {
  'none': 0,
  '450px': 450,
  '20px': 20,
};

export const maxDuration = 60; // Allow 60 seconds for export (vercel serverless function timeout)

export async function POST(request: NextRequest) {
  try {
    const { imageData, size, bleed, streamResponse } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing image data' },
        { status: 400 }
      );
    }

    // Get target dimensions
    const targetSize = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS['18x24'];
    const bleedPx = BLEED_SIZES[bleed] || 0;

    console.log('=== EXPORT API ===');
    console.log('Target size:', size, targetSize);
    console.log('Bleed:', bleed, bleedPx, 'px');

    // Convert from base64
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Step 1: Resize to target size (without bleed)
    let processedImage = await sharp(imageBuffer)
      .resize(targetSize.width, targetSize.height, {
        fit: 'fill',
      })
      .toBuffer();

    // Step 2: Add bleed if needed (white border)
    if (bleedPx > 0) {
      const finalWidth = targetSize.width + (bleedPx * 2);
      const finalHeight = targetSize.height + (bleedPx * 2);

      console.log('Adding bleed:', bleedPx, 'px on each side');
      console.log('Final dimensions:', finalWidth, 'x', finalHeight);

      processedImage = await sharp({
        create: {
          width: finalWidth,
          height: finalHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([
          {
            input: processedImage,
            top: bleedPx,
            left: bleedPx,
          },
        ])
        .jpeg({ quality: 95 })
        .toBuffer();
    } else {
      // Just convert to JPEG
      processedImage = await sharp(processedImage)
        .jpeg({ quality: 95 })
        .toBuffer();
    }

    // If client requested streaming/direct download, return as blob
    if (streamResponse) {
      return new Response(new Uint8Array(processedImage), {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="lineart_${Date.now()}.jpg"`,
          'Content-Length': processedImage.length.toString(),
        },
      });
    }

    // Otherwise convert to base64 for JSON response (smaller previews only)
    const finalBase64 = processedImage.toString('base64');

    return NextResponse.json({
      success: true,
      imageData: `data:image/jpeg;base64,${finalBase64}`,
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to export image',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
