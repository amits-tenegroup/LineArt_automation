import { NextRequest } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { getCanvasDimensions, ImageSize } from '@/types';

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

// Background colors
const BACKGROUND_COLORS: Record<string, { r: number; g: number; b: number }> = {
  beige: { r: 245, g: 240, b: 230 },
  blue: { r: 200, g: 220, b: 240 },
  pink: { r: 255, g: 220, b: 230 },
};

// Register the font
const fontPath = path.join(process.cwd(), 'public', 'assets', 'fonts', 'Georgia_pro.ttf');
if (fs.existsSync(fontPath)) {
  GlobalFonts.registerFromPath(fontPath, 'Georgia Pro');
}

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

    const imageSize = (size || '18x24') as ImageSize;
    
    console.log('=== FULL EXPORT API ===');
    console.log('Size:', size);
    console.log('Bleed:', bleed);

    // Step 1: Get canvas dimensions based on size's aspect ratio
    const { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, aspectRatio } = getCanvasDimensions(imageSize);
    
    console.log('Canvas dimensions:', CANVAS_WIDTH, 'x', CANVAS_HEIGHT, 'Aspect:', aspectRatio);
    
    const bgColor = BACKGROUND_COLORS[config.backgroundColor] || BACKGROUND_COLORS.beige;

    // Load background image
    const backgroundPath = path.join(
      process.cwd(),
      'public',
      'assets',
      'backgrounds',
      `${config.backgroundColor}.jpg`
    );

    if (!fs.existsSync(backgroundPath)) {
      return new Response(
        JSON.stringify({ error: `Background image not found: ${config.backgroundColor}.jpg` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Load and resize background
    // For 2:3 aspect ratio (SKU -64, -69), stretch to fit without cropping
    // For 3:4 aspect ratio, use cover to maintain aspect ratio
    const background = await sharp(backgroundPath)
      .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { 
        fit: aspectRatio === '2:3' ? 'fill' : 'cover' 
      })
      .toBuffer();

    // Prepare line art
    const lineArtBase64 = lineArtImage.replace(/^data:image\/\w+;base64,/, '');
    const lineArtBuffer = Buffer.from(lineArtBase64, 'base64');

    const lineArtHeight = config.lineArtScale;
    const lineArtWidth = Math.round(lineArtHeight * (3 / 4));
    const lineArtTop = Math.round(config.lineArtCenterY - lineArtHeight / 2);
    const lineArtLeft = Math.round(config.lineArtCenterX - lineArtWidth / 2);

    const resizedLineArt = await sharp(lineArtBuffer)
      .resize(lineArtWidth, lineArtHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toBuffer();

    // Calculate visible portion
    const cropLeft = Math.max(0, -lineArtLeft);
    const cropTop = Math.max(0, -lineArtTop);
    const visibleLeft = Math.max(0, lineArtLeft);
    const visibleTop = Math.max(0, lineArtTop);
    const visibleWidth = Math.min(lineArtWidth - cropLeft, CANVAS_WIDTH - visibleLeft);
    const visibleHeight = Math.min(lineArtHeight - cropTop, CANVAS_HEIGHT - visibleTop);

    let processedLineArt: Buffer;
    if (visibleWidth > 0 && visibleHeight > 0) {
      const croppedLineArt = await sharp(resizedLineArt)
        .extract({
          left: cropLeft,
          top: cropTop,
          width: visibleWidth,
          height: visibleHeight,
        })
        .toBuffer();

      processedLineArt = await sharp({
        create: {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        },
      })
        .composite([
          {
            input: croppedLineArt,
            top: visibleTop,
            left: visibleLeft,
            blend: 'over',
          },
        ])
        .png()
        .toBuffer();
    } else {
      processedLineArt = await sharp({
        create: {
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        },
      })
        .png()
        .toBuffer();
    }

    // Create text overlay using canvas
    let textOverlay: Buffer | null = null;
    
    if (title || date) {
      const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.textAlign = 'center';
      ctx.fillStyle = config.titleColor;

      if (title) {
        const titleUpper = title.toUpperCase();
        ctx.font = `bold ${config.titleFontSize}px "Georgia Pro"`;
        ctx.letterSpacing = `${config.titleLetterSpacing}px`;
        ctx.fillText(titleUpper, CANVAS_WIDTH / 2, config.titleTop);
      }

      if (date) {
        ctx.font = `${config.dateFontSize}px "Georgia Pro"`;
        ctx.letterSpacing = `${config.dateLetterSpacing}px`;
        ctx.fillText(date, CANVAS_WIDTH / 2, config.dateTop);
      }

      textOverlay = canvas.toBuffer('image/png');
    }

    // Composite all layers
    const compositeOperations: any[] = [
      {
        input: processedLineArt,
        top: 0,
        left: 0,
        blend: 'multiply',
      },
    ];

    if (textOverlay) {
      compositeOperations.push({
        input: textOverlay,
        top: 0,
        left: 0,
        blend: 'over',
      });
    }

    let compositeImage = await sharp(background)
      .composite(compositeOperations)
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
        .withMetadata({
          density: 300,
        })
        .jpeg({ quality: 95 })
        .toBuffer();
    } else {
      finalImage = await sharp(finalImage)
        .withMetadata({
          density: 300,
        })
        .jpeg({ quality: 95 })
        .toBuffer();
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
