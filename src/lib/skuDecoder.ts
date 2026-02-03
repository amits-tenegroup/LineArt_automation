import { BleedType, ImageSize, SKU_BLEED_MAP } from "@/types";

/**
 * Decode SKU to extract bleed type
 * SKU format: 100-35-XXXXX-62/63/64/69
 * -62: 450px bleed
 * -63: no bleed
 * -64: 20px bleed
 * -69: 20px bleed
 */
export function decodeBleedFromSKU(sku: string): BleedType {
  const parts = sku.split("-");
  const suffix = parts[parts.length - 1];
  
  return SKU_BLEED_MAP[suffix] || "none";
}

/**
 * Extract size from item description
 * Looks for patterns like: 18" x 24", 30" x 40", etc.
 */
export function extractSizeFromDescription(description: string): ImageSize | null {
  // Common size patterns in the description
  const sizePatterns: { pattern: RegExp; size: ImageSize }[] = [
    { pattern: /30[""]?\s*[x×]\s*40[""]?/i, size: "30x40" },
    { pattern: /24[""]?\s*[x×]\s*36[""]?/i, size: "24x36" },
    { pattern: /24[""]?\s*[x×]\s*32[""]?/i, size: "24x32" },
    { pattern: /20[""]?\s*[x×]\s*30[""]?/i, size: "20x30" },
    { pattern: /18[""]?\s*[x×]\s*24[""]?/i, size: "18x24" },
    { pattern: /16[""]?\s*[x×]\s*24[""]?/i, size: "16x24" },
    { pattern: /12[""]?\s*[x×]\s*16[""]?/i, size: "12x16" },
    { pattern: /9[""]?\s*[x×]\s*12[""]?/i, size: "9x12" },
    { pattern: /8[""]?\s*[x×]\s*10[""]?/i, size: "9x12" }, // Map 8x10 to 9x12
  ];

  for (const { pattern, size } of sizePatterns) {
    if (pattern.test(description)) {
      return size;
    }
  }

  // Check for size labels
  if (description.includes("XL") || description.includes("supersized")) {
    return "30x40";
  }
  if (description.includes("L -") || description.includes("big love")) {
    return "24x32";
  }
  if (description.includes("M -") || description.includes("go-to size")) {
    return "18x24";
  }
  if (description.includes("S -") || description.includes("small step")) {
    return "12x16";
  }
  if (description.includes("XS") || description.includes("tiny")) {
    return "9x12";
  }

  return null;
}

/**
 * Extract names from item description
 * Looks for "Names:" pattern
 */
export function extractNamesFromDescription(description: string): string {
  // Look for Names: pattern
  const namesMatch = description.match(/Names:\s*([^\n]*?)(?:\s*Date:|$)/i);
  if (namesMatch) {
    return namesMatch[1].trim();
  }

  // Fallback: Look for Title: pattern
  const titleMatch = description.match(/Title:\s*([^]*?)(?:Art color:|Frame color:|Size:|$)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Look for First text line / Second text line patterns
  const firstLineMatch = description.match(/First text line:\s*([^]*?)(?:Second text line:|Frame color:|$)/i);
  const secondLineMatch = description.match(/Second text line:\s*([^]*?)(?:Frame color:|Size:|$)/i);
  
  if (firstLineMatch || secondLineMatch) {
    const parts = [];
    if (firstLineMatch) parts.push(firstLineMatch[1].trim());
    if (secondLineMatch) parts.push(secondLineMatch[1].trim());
    return parts.join(" - ");
  }

  return "";
}

/**
 * Extract date from item description
 * Looks for "Date:" pattern
 */
export function extractDateFromDescription(description: string): string {
  // Look for Date: pattern
  const dateMatch = description.match(/Date:\s*([^\n]*?)(?:\s*Color:|$)/i);
  if (dateMatch) {
    return dateMatch[1].trim();
  }

  return "";
}

/**
 * Extract image URL from item description
 * Looks for href='...' pattern in the HTML
 */
export function extractImageUrlFromDescription(description: string): string | null {
  const hrefMatch = description.match(/href='([^']+)'/);
  if (hrefMatch) {
    return hrefMatch[1];
  }
  
  const srcMatch = description.match(/src='([^']+)'/);
  if (srcMatch) {
    return srcMatch[1];
  }

  return null;
}

/**
 * Check if SKU matches the LineArt product pattern
 * Pattern: 100-35-11194-XX where XX is 62/63/64/69
 */
export function isLineArtSKU(sku: string): boolean {
  // Exact pattern: 100-35-11194-62/63/64/69
  const pattern = /^100-35-11194-(?:62|63|64|69)$/;
  return pattern.test(sku);
}

/**
 * Filter and parse a CSV row for LineArt orders
 */
export function parseLineArtOrder(row: Record<string, string>): {
  orderId: string;
  fullOrderNumber: string;
  sku: string;
  imageUrl: string;
  size: ImageSize;
  bleed: BleedType;
  title: string;
  date: string;
} | null {
  const sku = row["SKU"] || "";
  
  // Check if it's a valid LineArt SKU - exact match required
  if (!isLineArtSKU(sku)) return null;

  const description = row["Item description"] || "";
  const imageUrl = extractImageUrlFromDescription(description) || row["Image URL"] || "";
  const size = extractSizeFromDescription(description) || "18x24";
  const bleed = decodeBleedFromSKU(sku);
  const title = extractNamesFromDescription(description);
  const date = extractDateFromDescription(description);

  const orderId = row["Order ID"] || "";
  const itemId = row["Id"] || "";
  const fullOrderNumber = itemId ? `${orderId}_${itemId}` : orderId;

  return {
    orderId,
    fullOrderNumber,
    sku,
    imageUrl,
    size,
    bleed,
    title,
    date,
  };
}
