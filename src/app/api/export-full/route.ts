import { NextRequest } from 'next/server';
import sharp from 'sharp';

// Size dimensions at 300 DPI
const SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '30x40': { width: 9000, height: 12000 },
  '24x32': { width: 7200, height: 9600 },
  '18x24': { width: 5400, height: 7200 },
  '12x16': { width: 3600, height: 4800 },
  '9x12': { width: 2700, height: 3600 },
};

// Bleed sizes in pixels
const BLEED_SIZES: Record<string, number> = {
  'none': 0,
  '450px': 450,
  '20px': 20,
};

// Background colors
const BACKGROUND_COLORS: Record<string, { r: number; g: number; b: number }> = {
  beige: { r: 245, g: 240, b: 230 },
  blue: { r: 200, g: 220, b: 240 },
  pink: { r: 255, g: 220, b: 230 },
};

export const maxDuration = 60; // Allow 60 seconds for this operation

export async function POST(request: NextRequest) {
  try {
    const {
      lineArtImage,
      config,
      title,
      date,
      size,
      bleed,
      fullOrderNumber,
    } = await request.json();

    if (!lineArtImage) {
      return new Response(JSON.stringify({ error: 'Missing line art image' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('=== FULL EXPORT API ===');
    console.log('Size:', size);
    console.log('Bleed:', bleed);

    // Step 1: Generate full-resolution composite (5400x7200)
    const CANVAS_WIDTH = 5400;
    const CANVAS_HEIGHT = 7200;
    const bgColor = BACKGROUND_COLORS[config.backgroundColor] || BACKGROUND_COLORS.beige;

    // Prepare line art
    const lineArtBase64 = lineArtImage.replace(/^data:image\/\w+;base64,/, '');
    const lineArtBuffer = Buffer.from(lineArtBase64, 'base64');
    const lineArtMetadata = await sharp(lineArtBuffer).metadata();

    const lineArtHeight = config.lineArtScale;
    const lineArtWidth = Math.round(lineArtHeight * (3 / 4));
    const lineArtTop = config.lineArtCenterY - lineArtHeight / 2;
    const lineArtLeft = config.lineArtCenterX - lineArtWidth / 2;

    const resizedLineArt = await sharp(lineArtBuffer)
      .resize(lineArtWidth, lineArtHeight, { fit: 'fill' })
      .toBuffer();

    // Create text overlays using SVG
    const titleSvg = `
      <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
        <text
          x="50%"
          y="${config.titleTop}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${config.titleFontSize}"
          font-weight="bold"
          letter-spacing="${config.titleLetterSpacing}"
          fill="${config.titleColor}"
        >${title.toUpperCase()}</text>
      </svg>
    `;

    const dateSvg = `
      <svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
        <text
          x="50%"
          y="${config.dateTop}"
          text-anchor="middle"
          font-family="Arial, sans-serif"
          font-size="${config.dateFontSize}"
          letter-spacing="${config.dateLetterSpacing}"
          fill="${config.dateColor}"
        >${date}</text>
      </svg>
    `;

    const titleBuffer = Buffer.from(titleSvg);
    const dateBuffer = Buffer.from(dateSvg);

    // Composite everything
    let compositeImage = await sharp({
      create: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        channels: 3,
        background: bgColor,
      },
    })
      .composite([
        {
          input: resizedLineArt,
          top: Math.round(lineArtTop),
          left: Math.round(lineArtLeft),
        },
        {
          input: titleBuffer,
          top: 0,
          left: 0,
        },
        {
          input: dateBuffer,
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();

    // Step 2: Resize to target size based on canvas size parameter
    const targetSize = SIZE_DIMENSIONS[size] || SIZE_DIMENSIONS['18x24'];
    const bleedPx = BLEED_SIZES[bleed] || 0;

    console.log('Target dimensions:', targetSize);
    console.log('Bleed:', bleedPx, 'px');

    let finalImage = await sharp(compositeImage)
      .resize(targetSize.width, targetSize.height, { fit: 'fill' })
      .toBuffer();

    // Step 3: Add bleed if needed
    if (bleedPx > 0) {
      const finalWidth = targetSize.width + bleedPx * 2;
      const finalHeight = targetSize.height + bleedPx * 2;

      finalImage = await sharp({
        create: {
          width: finalWidth,
          height: finalHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([
          {
            input: finalImage,
            top: bleedPx,
            left: bleedPx,
          },
        ])
        .jpeg({ quality: 95 })
        .toBuffer();
    } else {
      finalImage = await sharp(finalImage).jpeg({ quality: 95 }).toBuffer();
    }

    // Return as downloadable file
    const filename = fullOrderNumber || `lineart_${Date.now()}`;
    
    return new Response(new Uint8Array(finalImage), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}.jpg"`,
        'Content-Length': finalImage.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Full export error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate export',
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
