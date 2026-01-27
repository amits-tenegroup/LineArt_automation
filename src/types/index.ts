// Image size options
export type ImageSize = "30x40" | "24x32" | "18x24" | "12x16" | "9x12";

// Bleed options
export type BleedType = "none" | "450px" | "20px";

// Background color options
export type BackgroundColor = "beige" | "blue" | "pink";

// SKU suffix to bleed mapping
export const SKU_BLEED_MAP: Record<string, BleedType> = {
  "62": "450px",
  "63": "none",
  "64": "20px",
  "69": "20px",
};

// Size display labels
export const SIZE_LABELS: Record<ImageSize, string> = {
  "30x40": '30" × 40" (XL)',
  "24x32": '24" × 32" (L)',
  "18x24": '18" × 24" (M)',
  "12x16": '12" × 16" (S)',
  "9x12": '9" × 12" (XS)',
};

// Size in pixels at 300 DPI
export const SIZE_PIXELS: Record<ImageSize, { width: number; height: number }> = {
  "30x40": { width: 9000, height: 12000 },
  "24x32": { width: 7200, height: 9600 },
  "18x24": { width: 5400, height: 7200 },
  "12x16": { width: 3600, height: 4800 },
  "9x12": { width: 2700, height: 3600 },
};

// Bleed in pixels
export const BLEED_PIXELS: Record<BleedType, number> = {
  "none": 0,
  "450px": 450,
  "20px": 20,
};

// Order data from CSV or manual input
export interface OrderData {
  orderId?: string;
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

// CSV row structure (relevant fields)
export interface CSVRow {
  "Order ID": string;
  SKU: string;
  "Image URL": string;
  "Item description": string;
  [key: string]: string;
}

// Workflow state
export type WorkflowStep = 1 | 2 | 3 | 4 | 5;

export interface WorkflowState {
  currentStep: WorkflowStep;
  orderData: OrderData;
  originalImage: string | null;
  aiResult1: string | null;
  aiResult2: string | null;
  finalComposite: string | null;
  isProcessing: boolean;
  error: string | null;
}

// Initial order data
export const INITIAL_ORDER_DATA: OrderData = {
  orderId: "",
  sku: "",
  imageUrl: "",
  imageFile: null,
  imagePreviewUrl: "",
  size: "18x24",
  bleed: "none",
  mainTitle: "",
  date: "",
  backgroundColor: "beige",
};
