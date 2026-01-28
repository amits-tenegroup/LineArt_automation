import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

interface CompositeConfig {
  lineArtCenterX: number;
  lineArtCenterY: number;
  lineArtScale: number; // Height in pixels, maintains 3:4 aspect ratio (matching AI output)
  titleFontSize: number;
  titleTop: number;
  titleColor: string;
  titleLetterSpacing: number;
  dateFontSize: number;
  dateTop: number;
  dateColor: string;
  dateLetterSpacing: number;
  backgroundColor: 'beige' | 'blue' | 'pink';
}

// Register the font once
const fontPath = path.join(process.cwd(), 'public', 'assets', 'fonts', 'Georgia_pro.ttf');
if (fs.existsSync(fontPath)) {
  GlobalFonts.registerFromPath(fontPath, 'Georgia Pro');
}

export async function POST(request: NextRequest) {
  console.log('=== COMPOSITE API CALLED ===');
  try {
    const { lineArtImage, config, title, date, preview } = await request.json();

    if (!lineArtImage) {
      return NextResponse.json(
        { error: 'No line art image provided' },
        { status: 400 }
      );
    }

    const typedConfig = config as CompositeConfig;

    // Scale factor: 0.5 for preview (2x smaller), 1 for full resolution
    const scale = preview ? 0.5 : 1;

    // Canvas dimensions (18" x 24" at 300 DPI, scaled for preview)
    const canvasWidth = Math.round(5400 * scale);
    const canvasHeight = Math.round(7200 * scale);

    // Scale all config values for preview
    const scaledConfig = {
      ...typedConfig,
      lineArtCenterX: Math.round(typedConfig.lineArtCenterX * scale),
      lineArtCenterY: Math.round(typedConfig.lineArtCenterY * scale),
      lineArtScale: Math.round(typedConfig.lineArtScale * scale),
      titleFontSize: Math.round(typedConfig.titleFontSize * scale),
      titleTop: Math.round(typedConfig.titleTop * scale),
      titleLetterSpacing: Math.round(typedConfig.titleLetterSpacing * scale),
      dateFontSize: Math.round(typedConfig.dateFontSize * scale),
      dateTop: Math.round(typedConfig.dateTop * scale),
      dateLetterSpacing: Math.round(typedConfig.dateLetterSpacing * scale),
    };

    // Load background image
    const backgroundPath = path.join(
      process.cwd(),
      'public',
      'assets',
      'backgrounds',
      `${typedConfig.backgroundColor}.jpg`
    );

    if (!fs.existsSync(backgroundPath)) {
      return NextResponse.json(
        { error: `Background image not found: ${typedConfig.backgroundColor}.jpg` },
        { status: 400 }
      );
    }

    // Load and resize background to canvas size
    let background = sharp(backgroundPath).resize(canvasWidth, canvasHeight, {
      fit: 'cover',
    });

    // Process line art image
    const base64Data = lineArtImage.replace(/^data:image\/\w+;base64,/, '');
    const lineArtBuffer = Buffer.from(base64Data, 'base64');

    // Calculate width and height maintaining 3:4 aspect ratio (matching AI output)
    // Scale represents the height, width is 3/4 of height
    const lineArtHeight = scaledConfig.lineArtScale;
    const lineArtWidth = Math.round(lineArtHeight * (3 / 4));

    // Calculate top-left position from center point
    const lineArtTop = Math.round(scaledConfig.lineArtCenterY - (lineArtHeight / 2));
    const lineArtLeft = Math.round(scaledConfig.lineArtCenterX - (lineArtWidth / 2));

    // Resize line art to the desired scale
    const resizedLineArt = await sharp(lineArtBuffer)
      .resize(lineArtWidth, lineArtHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toBuffer();

    // Calculate the visible portion of the line art within the canvas
    const cropLeft = Math.max(0, -lineArtLeft);
    const cropTop = Math.max(0, -lineArtTop);
    const visibleLeft = Math.max(0, lineArtLeft);
    const visibleTop = Math.max(0, lineArtTop);
    const visibleWidth = Math.min(lineArtWidth - cropLeft, canvasWidth - visibleLeft);
    const visibleHeight = Math.min(lineArtHeight - cropTop, canvasHeight - visibleTop);

    // Only process if there's something visible
    let processedLineArt: Buffer;
    if (visibleWidth > 0 && visibleHeight > 0) {
      // Extract the visible portion of the line art
      const croppedLineArt = await sharp(resizedLineArt)
        .extract({
          left: cropLeft,
          top: cropTop,
          width: visibleWidth,
          height: visibleHeight,
        })
        .toBuffer();

      // Create a canvas-sized white layer and composite the cropped line art
      processedLineArt = await sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
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
      // No visible line art, create empty transparent layer
      processedLineArt = await sharp({
        create: {
          width: canvasWidth,
          height: canvasHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        },
      })
        .png()
        .toBuffer();
    }

    // Create text overlay using canvas with custom font
    let textOverlay: Buffer | null = null;
    
    if (title || date) {
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Make canvas transparent
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Set text properties
      ctx.textAlign = 'center';
      ctx.fillStyle = scaledConfig.titleColor;

      // Draw title (in uppercase)
      if (title) {
        const titleUpper = title.toUpperCase();
        console.log('Drawing title:', titleUpper);
        ctx.font = `bold ${scaledConfig.titleFontSize}px "Georgia Pro"`;
        ctx.letterSpacing = `${scaledConfig.titleLetterSpacing}px`;
        console.log('Font set to:', ctx.font, 'Letter spacing:', ctx.letterSpacing);
        
        // Draw the text centered with built-in letter spacing
        ctx.fillText(titleUpper, canvasWidth / 2, scaledConfig.titleTop);
      }

      // Draw date
      if (date) {
        ctx.font = `${scaledConfig.dateFontSize}px "Georgia Pro"`;
        ctx.letterSpacing = `${scaledConfig.dateLetterSpacing}px`;
        
        // Draw the text centered with built-in letter spacing
        ctx.fillText(date, canvasWidth / 2, scaledConfig.dateTop);
      }

      textOverlay = canvas.toBuffer('image/png');
    }

    // Composite all layers
    const compositeOperations: any[] = [
      {
        input: processedLineArt,
        top: 0,
        left: 0,
        blend: 'multiply', // This keeps only the blacks
      },
    ];

    // Add text overlay if exists
    if (textOverlay) {
      compositeOperations.push({
        input: textOverlay,
        top: 0,
        left: 0,
        blend: 'over',
      });
    }

    const result = await background
      .composite(compositeOperations)
      .png()
      .toBuffer();

    // Convert to base64
    const base64Result = result.toString('base64');

    return NextResponse.json({
      success: true,
      imageData: `data:image/png;base64,${base64Result}`,
    });
  } catch (error: any) {
    console.error('Composite Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to composite image',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
