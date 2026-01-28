import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const {
      lineArtImage,
      maskImage,
      displayWidth,
      displayHeight,
      canvasWidth,
      canvasHeight,
      lineArtTop,
      lineArtLeft,
      lineArtWidth,
      lineArtHeight,
    } = await request.json();

    if (!lineArtImage || !maskImage) {
      return NextResponse.json(
        { error: 'Missing required image data' },
        { status: 400 }
      );
    }

    // Convert both images from base64
    const lineArtBase64 = lineArtImage.replace(/^data:image\/\w+;base64,/, '');
    const lineArtBuffer = Buffer.from(lineArtBase64, 'base64');

    const maskBase64 = maskImage.replace(/^data:image\/\w+;base64,/, '');
    const maskBuffer = Buffer.from(maskBase64, 'base64');

    // Get original line art as raw RGBA
    const lineArtMetadata = await sharp(lineArtBuffer).metadata();
    const originalWidth = lineArtMetadata.width!;
    const originalHeight = lineArtMetadata.height!;

    const lineArtRaw = await sharp(lineArtBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Get mask dimensions
    const maskMeta = await sharp(maskBuffer).metadata();
    const maskWidth = maskMeta.width!;
    const maskHeight = maskMeta.height!;

    console.log('=== ERASER DEBUG ===');
    console.log('Line art original size:', originalWidth, 'x', originalHeight);
    console.log('Canvas size:', canvasWidth, 'x', canvasHeight);
    console.log('Line art position:', lineArtLeft, lineArtTop);
    console.log('Line art display size:', lineArtWidth, 'x', lineArtHeight);
    console.log('Mask (display) size:', maskWidth, 'x', maskHeight);
    console.log('Display size passed:', displayWidth, 'x', displayHeight);

    // Calculate actual scale from mask to canvas
    const maskScaleX = canvasWidth / maskWidth;
    const maskScaleY = canvasHeight / maskHeight;
    console.log('Mask scale:', maskScaleX, 'x', maskScaleY);

    // Resize mask from display size to full canvas size (5400x7200)
    const maskFullSize = await sharp(maskBuffer)
      .resize(canvasWidth, canvasHeight, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();

    // Calculate the ACTUAL line art dimensions on canvas based on its real aspect ratio
    // The line art is scaled to fit lineArtHeight, width is proportional
    const actualLineArtAspect = originalWidth / originalHeight;
    const actualLineArtWidth = lineArtHeight * actualLineArtAspect;
    
    // Calculate the offset between assumed width (3:4) and actual width
    // Frontend assumes 3:4 ratio, but actual ratio might differ
    const assumedWidth = lineArtWidth; // What frontend calculated (height * 3/4)
    const widthDifference = assumedWidth - actualLineArtWidth;
    
    // Adjust the left position to account for the width difference (centered adjustment)
    const actualLineArtLeft = lineArtLeft + (widthDifference / 2);
    
    console.log('Actual line art aspect:', actualLineArtAspect);
    console.log('Assumed width:', assumedWidth, 'Actual width:', actualLineArtWidth, 'Diff:', widthDifference);
    console.log('Passed lineArtLeft:', lineArtLeft, 'Adjusted actualLineArtLeft:', actualLineArtLeft);

    // Calculate the scale from canvas space to line art original space
    const scaleX = originalWidth / actualLineArtWidth;
    const scaleY = originalHeight / lineArtHeight;

    let eraseCount = 0;

    // For each pixel in the canvas, check if it's in the line art area
    // and if the user drew there (red channel > 0)
    for (let canvasY = 0; canvasY < canvasHeight; canvasY++) {
      for (let canvasX = 0; canvasX < canvasWidth; canvasX++) {
        // Get the mask pixel value (RGBA, 4 bytes per pixel)
        const maskIndex = (canvasY * canvasWidth + canvasX) * 4;
        const red = maskFullSize[maskIndex];

        // If user didn't draw here, skip
        if (red < 50) continue;

        // Check if this canvas pixel is within the line art bounds
        const relativeX = canvasX - actualLineArtLeft;
        const relativeY = canvasY - lineArtTop;

        if (relativeX >= 0 && relativeX < actualLineArtWidth &&
            relativeY >= 0 && relativeY < lineArtHeight) {
          // Map to original line art coordinates
          const origX = Math.round(relativeX * scaleX);
          const origY = Math.round(relativeY * scaleY);

          if (origX >= 0 && origX < originalWidth && origY >= 0 && origY < originalHeight) {
            // Set this pixel to white in the line art
            const lineArtIndex = (origY * originalWidth + origX) * 4;
            lineArtRaw[lineArtIndex] = 255;     // R
            lineArtRaw[lineArtIndex + 1] = 255; // G
            lineArtRaw[lineArtIndex + 2] = 255; // B
            lineArtRaw[lineArtIndex + 3] = 255; // A
            eraseCount++;
          }
        }
      }
    }

    console.log('Pixels erased:', eraseCount);

    // Convert back to PNG
    const cleanedLineArt = await sharp(lineArtRaw, {
      raw: {
        width: originalWidth,
        height: originalHeight,
        channels: 4,
      },
    })
      .png()
      .toBuffer();

    const cleanedBase64 = cleanedLineArt.toString('base64');

    return NextResponse.json({
      success: true,
      cleanedLineArt: `data:image/png;base64,${cleanedBase64}`,
    });
  } catch (error: any) {
    console.error('Eraser application error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to apply eraser',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
