import Papa from "papaparse";
import { parseLineArtOrder } from "./skuDecoder";
import { BleedType, ImageSize } from "@/types";

export interface ParsedOrder {
  orderId: string;
  fullOrderNumber: string; // Format: OrderID_Id (e.g., "350406249_481088")
  sku: string;
  imageUrl: string;
  size: ImageSize;
  bleed: BleedType;
  title: string;
  date: string;
}

/**
 * Parse CSV file and extract LineArt orders
 */
export async function parseCSVFile(file: File): Promise<ParsedOrder[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const orders: ParsedOrder[] = [];
        
        for (const row of results.data as Record<string, string>[]) {
          const parsed = parseLineArtOrder(row);
          if (parsed) {
            orders.push(parsed);
          }
        }
        
        resolve(orders);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse CSV text content and extract LineArt orders
 */
export function parseCSVText(csvText: string): ParsedOrder[] {
  const results = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const orders: ParsedOrder[] = [];
  
  for (const row of results.data as Record<string, string>[]) {
    const parsed = parseLineArtOrder(row);
    if (parsed) {
      orders.push(parsed);
    }
  }
  
  return orders;
}

/**
 * Find a specific order by ID or SKU in the parsed orders
 */
export function findOrderByIdOrSku(
  orders: ParsedOrder[],
  searchTerm: string
): ParsedOrder | null {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return orders.find(
    (order) =>
      order.orderId.toLowerCase() === normalizedSearch ||
      order.sku.toLowerCase() === normalizedSearch ||
      order.orderId.toLowerCase().includes(normalizedSearch) ||
      order.sku.toLowerCase().includes(normalizedSearch)
  ) || null;
}
