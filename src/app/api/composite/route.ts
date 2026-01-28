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
    const { lineArtImage, config, title, date } = await request.json();

    if (!lineArtImage) {
      return NextResponse.json(
        { error: 'No line art image provided' },
        { status: 400 }
      );
    }

    const typedConfig = config as CompositeConfig;

    // Canvas dimensions (18" x 24" at 300 DPI)
    const canvasWidth = 5400;
    const canvasHeight = 7200;

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
    const lineArtHeight = typedConfig.lineArtScale;
    const lineArtWidth = Math.round(lineArtHeight * (3 / 4));

    // Resize line art - the multiply blend mode will handle white backgrounds naturally
    const processedLineArt = await sharp(lineArtBuffer)
      .resize(lineArtWidth, lineArtHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .toBuffer();

    // Calculate top-left position from center point
    const lineArtTop = Math.round(typedConfig.lineArtCenterY - (lineArtHeight / 2));
    const lineArtLeft = Math.round(typedConfig.lineArtCenterX - (lineArtWidth / 2));

    // Create text overlay using canvas with custom font
    let textOverlay: Buffer | null = null;
    
    if (title || date) {
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');

      // Make canvas transparent
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Set text properties
      ctx.textAlign = 'center';
      ctx.fillStyle = typedConfig.titleColor;

      // Draw title
      if (title) {
        console.log('Drawing title:', title);
        ctx.font = `bold ${typedConfig.titleFontSize}px "Georgia Pro"`;
        ctx.letterSpacing = `${typedConfig.titleLetterSpacing}px`; // Use config value
        console.log('Font set to:', ctx.font, 'Letter spacing:', ctx.letterSpacing);
        
        // Draw the text centered with built-in letter spacing
        ctx.fillText(title, canvasWidth / 2, typedConfig.titleTop);
      }

      // Draw date
      if (date) {
        ctx.font = `${typedConfig.dateFontSize}px "Georgia Pro"`;
        ctx.letterSpacing = `${typedConfig.dateLetterSpacing}px`; // Use config value
        
        // Draw the text centered with built-in letter spacing
        ctx.fillText(date, canvasWidth / 2, typedConfig.dateTop);
      }

      textOverlay = canvas.toBuffer('image/png');
    }

    // Composite all layers
    const compositeOperations: any[] = [
      {
        input: processedLineArt,
        top: lineArtTop,
        left: lineArtLeft,
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
