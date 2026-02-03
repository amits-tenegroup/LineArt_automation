# LineArt Automation

Transform couple photos into beautiful line art canvases.

## Features

- Upload images or import from CSV
- AI-powered photo to line art transformation (via Google Gemini)
- Automatic compositing with customizable backgrounds
- Multiple export sizes with bleed options
- Simple approval workflow

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your API key:

```
GEMINI_API_KEY=your_api_key_here
```

4. Add your background images to `public/assets/backgrounds/`:
   - `beige.jpg`
   - `blue.jpg`
   - `pink.jpg`

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Workflow Steps

1. **Upload & Configure** - Upload image, set size/bleed/colors, enter title/date
2. **First AI Pass** - Transform photo to line art (with approval)
3. **Refinement** - Second AI pass for cleanup
4. **Composite** - Combine line art with background and text
5. **Final Approval** - Review and download

## SKU Bleed Mapping

| SKU Suffix | Bleed    | Aspect Ratio | Sizes            |
|------------|----------|--------------|------------------|
| -62        | 450px    | 3:4          | All 3:4          |
| -63        | No bleed | 3:4          | All 3:4          |
| -64        | 20px     | 2:3          | 16×24, 20×30, 24×36 |
| -69        | 20px     | 2:3          | 16×24, 20×30, 24×36 |

## Size Options

| Label | Dimensions  | Pixels (300 DPI) | Aspect Ratio |
|-------|-------------|------------------|--------------|
| XL    | 30" × 40"   | 9000 × 12000     | 3:4          |
|       | 24" × 36"   | 7200 × 10800     | 2:3          |
| L     | 24" × 32"   | 7200 × 9600      | 3:4          |
|       | 20" × 30"   | 6000 × 9000      | 2:3          |
| M     | 18" × 24"   | 5400 × 7200      | 3:4          |
|       | 16" × 24"   | 4800 × 7200      | 2:3          |
| S     | 12" × 16"   | 3600 × 4800      | 3:4          |
| XS    | 9" × 12"    | 2700 × 3600      | 3:4          |

**Note:** 2:3 aspect ratio sizes (16×24, 20×30, 24×36) are associated with SKU suffixes -64 and -69, which use 20px bleed.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Sharp (image processing)
- PapaParse (CSV parsing)

## Deployment

This app is designed to be deployed on Vercel:

```bash
npm run build
```

## License

Private - All rights reserved
