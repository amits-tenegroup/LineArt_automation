# LineArt Automation - Complete Project Guide

This document contains all the technical knowledge and solutions from building the LineArt automation application. Use this as a reference to build similar image processing applications.

---

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Image Processing**: Sharp.js, @napi-rs/canvas
- **AI**: Google Gemini API (`gemini-3-pro-image-preview`)
- **CSV Parsing**: PapaParse
- **Deployment**: Vercel
- **Version Control**: Git/GitHub

---

## Project Structure

```
LineArt_automation/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── transform/route.ts       # AI transformation (Steps 2 & 3)
│   │   │   ├── composite/route.ts       # Background + line art + text
│   │   │   ├── apply-eraser/route.ts    # Eraser tool
│   │   │   ├── fetch-image/route.ts     # CORS proxy for external images
│   │   │   └── export/route.ts          # Final export with size/bleed
│   │   ├── page.tsx                     # Main workflow orchestration
│   │   └── test-composite/page.tsx      # Testing UI for positioning
│   ├── components/
│   │   ├── ImageUploader.tsx
│   │   ├── CSVUploader.tsx
│   │   ├── ManualInputForm.tsx
│   │   ├── ProgressIndicator.tsx
│   │   ├── AITransformStep.tsx          # Step 2 with user approval
│   │   ├── AutoTransformStep.tsx        # Step 3 automatic
│   │   ├── CompositeStep.tsx            # Step 4 with eraser & export
│   │   └── index.ts
│   ├── lib/
│   │   ├── csvParser.ts                 # CSV parsing logic
│   │   └── skuDecoder.ts                # SKU pattern matching & data extraction
│   └── types/
│       └── index.ts                     # TypeScript interfaces
├── public/
│   └── assets/
│       ├── backgrounds/                  # beige.jpg, blue.jpg, pink.jpg
│       └── fonts/                        # Georgia_pro.ttf
├── .env                                  # API keys (not in git)
├── .gitignore
├── next.config.ts                        # Webpack config for native modules
└── package.json
```

---

## Core Workflow

### Step 1: Data Input
- Upload image (File or URL)
- Upload CSV or manual entry
- Filter CSV by SKU pattern (e.g., `100-35-11194-XX`)
- Extract order data, names, dates, sizes, bleed type

### Step 2: AI Transformation (User Approval)
- Send image to Gemini API
- Show result to user
- Allow regeneration or approval
- Prevent duplicate API calls with `useRef`

### Step 3: AI Refinement (Automatic)
- Second AI pass with different prompt
- Auto-proceed after completion

### Step 4: Compositing
- Combine background + line art + text
- Live position/scale controls with sliders
- Preview mode (2x smaller) for performance
- Eraser tool for cleanup
- Show export settings info

### Step 5: Export
- Generate full-resolution composite
- Resize to target print size
- Add bleed (white border)
- Export as JPG
- Download with order number as filename
- Show success screen and reset

---

## Key Technical Solutions

### 1. CSV Parsing & SKU Filtering

**Problem**: Need to extract specific orders from large CSV files and parse embedded data.

**Solution**: 
- Use regex pattern matching for SKU validation
- Extract data from HTML-formatted description fields
- Parse "Names:", "Date:", "Title:" patterns
- Combine Order ID and item ID for full order number

```typescript
// SKU pattern: 100-35-11194-XX (where XX = 62/63/64/69)
export function isLineArtSKU(sku: string): boolean {
  const pattern = /^100-35-11194-(?:62|63|64|69)$/;
  return pattern.test(sku);
}

// Extract names from description
const namesMatch = description.match(/Names:\s*([^\n]*?)(?:\s*Date:|$)/i);

// Full order number
const fullOrderNumber = itemId ? `${orderId}_${itemId}` : orderId;
```

---

### 2. AI Image Transformation

**Problem**: 
- Gemini API response structure was unclear
- Duplicate API calls in React Strict Mode
- AI outputs had off-white backgrounds

**Solutions**:

#### API Integration
```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [
    {
      role: 'user',
      parts: [
        { text: prompt },
        { 
          inlineData: { 
            mimeType: 'image/png', 
            data: base64ImageData 
          } 
        }
      ]
    }
  ],
  config: {
    responseModalities: ['IMAGE'],
    imageConfig: {
      aspectRatio: '3:4',
      imageSize: '2K',
    },
  },
});
```

#### Prevent Duplicate Calls
```typescript
const hasTransformed = useRef(false);

useEffect(() => {
  if (hasTransformed.current) return;
  hasTransformed.current = true;
  // Call API
}, []);
```

#### Clean Up White Background
```typescript
// Use linear adjustment to make off-white pure white
const cleanedImage = await sharp(imageBuffer)
  .linear(1.1, 10) // Multiply by 1.1 and add 10
  .png()
  .toBuffer();
```

---

### 3. Image Compositing

**Problem**: 
- Need to composite multiple layers at specific positions
- Line art can be larger than canvas
- Text rendering with custom fonts and letter spacing

**Solutions**:

#### Preview Mode for Performance
```typescript
// Scale factor: 0.5 for preview (2x smaller), 1 for full resolution
const scale = preview ? 0.5 : 1;
const canvasWidth = Math.round(5400 * scale);
const canvasHeight = Math.round(7200 * scale);

// Scale all config values
const scaledConfig = {
  lineArtCenterX: Math.round(config.lineArtCenterX * scale),
  lineArtCenterY: Math.round(config.lineArtCenterY * scale),
  lineArtScale: Math.round(config.lineArtScale * scale),
  // ... etc
};
```

#### Handle Line Art Larger Than Canvas
```typescript
// Calculate the visible portion of the line art within the canvas
const cropLeft = Math.max(0, -lineArtLeft);
const cropTop = Math.max(0, -lineArtTop);
const visibleLeft = Math.max(0, lineArtLeft);
const visibleTop = Math.max(0, lineArtTop);
const visibleWidth = Math.min(lineArtWidth - cropLeft, canvasWidth - visibleLeft);
const visibleHeight = Math.min(lineArtHeight - cropTop, canvasHeight - visibleTop);

// Extract visible portion and composite
const croppedLineArt = await sharp(resizedLineArt)
  .extract({ left: cropLeft, top: cropTop, width: visibleWidth, height: visibleHeight })
  .toBuffer();

const processedLineArt = await sharp({
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
```

#### Text Rendering with Custom Fonts
```typescript
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

// Register font once
const fontPath = path.join(process.cwd(), 'public', 'assets', 'fonts', 'Georgia_pro.ttf');
GlobalFonts.registerFromPath(fontPath, 'Georgia Pro');

// Draw text with letter spacing
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext('2d');
ctx.font = `bold ${fontSize}px "Georgia Pro"`;
ctx.letterSpacing = `${letterSpacing}px`;
ctx.textAlign = 'center';
ctx.fillStyle = '#000000';
ctx.fillText(title.toUpperCase(), canvasWidth / 2, titleTop);
```

---

### 4. Eraser Tool

**Problem**: 
- Drawing mask on display must map to full-resolution line art
- Coordinates must account for position, scale, and aspect ratio differences
- Next.js Image component doesn't provide exact rendered dimensions

**Solutions**:

#### Use Standard IMG Tag for Precise Positioning
```typescript
// Use img instead of Next.js Image
const imageRef = useRef<HTMLImageElement>(null);

// Get exact rendered dimensions
const imgRect = imageRef.current.getBoundingClientRect();
canvas.width = Math.round(imgRect.width);
canvas.height = Math.round(imgRect.height);
```

#### Coordinate Mapping
```typescript
// Frontend: Calculate line art position based on current slider values
const currentLineArtHeight = lineArtScale;
const currentLineArtWidth = Math.round(currentLineArtHeight * (3 / 4));
const currentLineArtTop = lineArtCenterY - (currentLineArtHeight / 2);
const currentLineArtLeft = lineArtCenterX - (currentLineArtWidth / 2);

// Backend: Account for actual aspect ratio vs assumed 3:4
const actualLineArtAspect = originalWidth / originalHeight;
const actualLineArtWidth = lineArtHeight * actualLineArtAspect;
const assumedWidth = lineArtWidth; // From frontend (3:4 ratio)
const widthDifference = assumedWidth - actualLineArtWidth;
const actualLineArtLeft = lineArtLeft + (widthDifference / 2);

// Scale from canvas to original
const scaleX = originalWidth / actualLineArtWidth;
const scaleY = originalHeight / lineArtHeight;
```

#### Pixel-Level Erasing
```typescript
// Load line art as raw RGBA buffer
const lineArtRaw = await sharp(lineArtBuffer).ensureAlpha().raw().toBuffer();

// For each canvas pixel where user drew (red > 50)
for (let canvasY = 0; canvasY < canvasHeight; canvasY++) {
  for (let canvasX = 0; canvasX < canvasWidth; canvasX++) {
    const maskIndex = (canvasY * canvasWidth + canvasX) * 4;
    const red = maskFullSize[maskIndex];
    
    if (red < 50) continue;
    
    // Map to original line art coordinates
    const relativeX = canvasX - actualLineArtLeft;
    const relativeY = canvasY - lineArtTop;
    const origX = Math.round(relativeX * scaleX);
    const origY = Math.round(relativeY * scaleY);
    
    // Set pixel to white
    const lineArtIndex = (origY * originalWidth + origX) * 4;
    lineArtRaw[lineArtIndex] = 255;     // R
    lineArtRaw[lineArtIndex + 1] = 255; // G
    lineArtRaw[lineArtIndex + 2] = 255; // B
    lineArtRaw[lineArtIndex + 3] = 255; // A
  }
}
```

---

### 5. Live Position/Scale Controls

**Problem**: 
- Updates were slow (6-8 seconds per change)
- Image disappeared during processing

**Solutions**:

#### Debounced Auto-Update
```typescript
// Auto-update when sliders change
useEffect(() => {
  const timer = setTimeout(() => {
    performComposite(lineArtImage, true); // Use preview mode
  }, 300); // 300ms debounce
  
  return () => clearTimeout(timer);
}, [lineArtCenterX, lineArtCenterY, lineArtScale]);
```

#### Keep Image Visible During Update
```typescript
// Show old image dimmed while loading new one
<img
  src={compositeImage}
  className={`transition-opacity duration-200 ${isCompositing ? 'opacity-50' : 'opacity-100'}`}
/>
{isCompositing && (
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="bg-white/80 rounded-lg px-4 py-2">
      <span>Updating...</span>
    </div>
  </div>
)}
```

---

### 6. Export System

**Problem**: 
- Need different output sizes with optional bleed
- Preview quality not suitable for final export

**Solution**:

```typescript
// 1. Generate full-resolution composite (not preview)
const compositeResponse = await fetch('/api/composite', {
  body: JSON.stringify({
    lineArtImage,
    config,
    title,
    date,
    preview: false, // Full resolution!
  }),
});

// 2. Resize and add bleed
const SIZE_DIMENSIONS = {
  '18x24': { width: 5400, height: 7200 },
  '24x32': { width: 7200, height: 9600 },
  // ... etc
};

const BLEED_SIZES = {
  'none': 0,
  '20px': 20,
  '450px': 450,
};

// Resize to target size
let processedImage = await sharp(imageBuffer)
  .resize(targetWidth, targetHeight, { fit: 'fill' })
  .toBuffer();

// Add bleed (white border)
if (bleedPx > 0) {
  const finalWidth = targetWidth + (bleedPx * 2);
  const finalHeight = targetHeight + (bleedPx * 2);
  
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
}

// 3. Download with order number as filename
const filename = `${fullOrderNumber}.jpg`;
```

---

## Critical Configuration Files

### next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .node files from @napi-rs/canvas
    config.module.rules.push({
      test: /\.node$/,
      loader: 'node-loader',
    });

    // Externalize @napi-rs/canvas on server
    if (isServer) {
      config.externals.push('@napi-rs/canvas');
    }

    return config;
  },
};

export default nextConfig;
```

### package.json (key dependencies)
```json
{
  "dependencies": {
    "@google/genai": "latest",
    "@napi-rs/canvas": "latest",
    "next": "15.x",
    "papaparse": "^5.x",
    "react": "19.x",
    "sharp": "^0.33.x"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/papaparse": "^5",
    "@types/react": "^19",
    "node-loader": "^2.0.0",
    "tailwindcss": "^3.4",
    "typescript": "^5"
  }
}
```

### .env
```env
GEMINI_API_KEY=your_api_key_here
```

### .gitignore (important additions)
```
# Environment variables
.env
.env.local

# Next.js
.next/
out/

# Dependencies
node_modules/

# Test files
public/download*.png
```

---

## Common Issues & Solutions

### Issue: "Module parse failed: Unexpected character '@'"
**Cause**: @napi-rs/canvas contains .node files  
**Solution**: Configure webpack in next.config.ts (see above)

### Issue: "CORS error when fetching image URL"
**Cause**: Browser blocks cross-origin requests  
**Solution**: Create server-side proxy at `/api/fetch-image`

### Issue: Eraser doesn't align with line art
**Cause**: Coordinate mismatch between display and full resolution  
**Solution**: 
1. Use standard `img` tag (not Next.js Image)
2. Calculate actual aspect ratio in backend
3. Adjust left position based on width difference

### Issue: Slow slider updates
**Cause**: Processing at full 5400×7200 resolution  
**Solution**: 
1. Add preview mode (2x smaller)
2. Only use full resolution on export

### Issue: Image disappears during updates
**Cause**: Conditional rendering based on `isCompositing`  
**Solution**: Keep image visible, just dim opacity

### Issue: Duplicate AI API calls
**Cause**: React Strict Mode runs useEffect twice  
**Solution**: Use `useRef` flag to track if already called

### Issue: Off-white backgrounds in AI output
**Cause**: AI doesn't generate pure white  
**Solution**: Apply `sharp().linear(1.1, 10)` after AI generation

---

## Performance Optimizations

1. **Preview Mode**: Composite at 2700×3600 for real-time updates, full resolution only on export
2. **Debouncing**: 300ms delay on slider changes to batch API calls
3. **Conditional Updates**: Only re-composite when position/scale changes, not on every render
4. **Image Cropping**: Only process visible portion of line art when it extends beyond canvas
5. **Direct Pixel Manipulation**: Eraser modifies raw buffer instead of layer compositing

---

## TypeScript Interfaces

```typescript
export type ImageSize = '9x12' | '12x16' | '18x24' | '24x32' | '30x40';
export type BleedType = 'none' | '20px' | '450px';
export type BackgroundColor = 'beige' | 'blue' | 'pink';

export interface OrderData {
  orderId?: string;
  fullOrderNumber?: string; // Format: OrderID_Id
  sku?: string;
  imageUrl?: string;
  imageFile?: File | null;
  imagePreviewUrl?: string;
  size: ImageSize;
  bleed: BleedType;
  mainTitle: string;
  date: string;
  backgroundColor: BackgroundColor;
}

export interface ParsedOrder {
  orderId: string;
  fullOrderNumber: string;
  sku: string;
  imageUrl: string;
  size: ImageSize;
  bleed: BleedType;
  title: string;
  date: string;
}

export interface CompositeConfig {
  lineArtCenterX: number;
  lineArtCenterY: number;
  lineArtScale: number; // Height in pixels, maintains 3:4 aspect ratio
  titleFontSize: number;
  titleTop: number;
  titleColor: string;
  titleLetterSpacing: number;
  dateFontSize: number;
  dateTop: number;
  dateColor: string;
  dateLetterSpacing: number;
  backgroundColor: BackgroundColor;
}
```

---

## Testing Checklist

- [ ] CSV upload filters correct SKUs
- [ ] CSV extracts names, dates, sizes correctly
- [ ] Manual input works without CSV
- [ ] External image URLs load via proxy
- [ ] AI transformation produces clean white backgrounds
- [ ] Second AI pass applies correctly
- [ ] Composite shows all layers correctly
- [ ] Position sliders update live (300ms debounce)
- [ ] Scale slider maintains aspect ratio
- [ ] Eraser tool aligns at different scales
- [ ] Eraser works when line art extends beyond canvas
- [ ] Preview mode is faster than full resolution
- [ ] Export generates full resolution
- [ ] Bleed is added correctly (none/20px/450px)
- [ ] JPG downloads with correct filename
- [ ] Success screen appears and auto-resets
- [ ] Works on Vercel deployment

---

## Deployment to Vercel

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy (automatic on push)
5. Verify native modules work (@napi-rs/canvas)

---

## Git Workflow Summary

```bash
# Initial setup
git init
git add .
git commit -m "Initial commit: Step 1 UI setup"
git branch -M main
git remote add origin <repo-url>
git push -u origin main

# During development
git add <files>
git commit -m "Descriptive message"
git push

# To revert to a specific commit
git checkout <commit-hash>
```

---

## Example Prompts for Building Similar Apps

When starting a new project, provide the AI with:

1. **This entire document** (PROJECT_GUIDE.md)
2. **Your new workflow**: "The workflow has X steps: Step 1..."
3. **Different requirements**: "Instead of line art, this processes..."
4. **SKU pattern**: "Filter CSV for SKU pattern: XXX-XX-XXXXX-XX"
5. **Data extraction needs**: "Extract fields: ..., ..., ..."

The AI will adapt this proven architecture to your new requirements.

---

## Repository
GitHub: https://github.com/amitmann1985/LineArt_automation

## Commits History
- `d8b34ce` - Step 1 UI setup
- `594e7d4` - Steps 2-4 with AI & eraser
- `a209dd0` - Step 5 export with JPG
- `9e1da50` - Live controls & performance
- `62fff24` - Convert title to uppercase

---

**End of Guide - Ready to build your next image processing automation!**
