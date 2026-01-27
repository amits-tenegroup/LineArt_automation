"use client";

import { useCallback, useState } from "react";
import { parseCSVFile, ParsedOrder } from "@/lib/csvParser";

interface CSVUploaderProps {
  onOrderSelect: (order: ParsedOrder) => void;
}

export default function CSVUploader({ onOrderSelect }: CSVUploaderProps) {
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      setFileName(file.name);
      setIsLoading(true);
      setError(null);

      try {
        const parsedOrders = await parseCSVFile(file);
        setOrders(parsedOrders);

        if (parsedOrders.length === 0) {
          setError(
            "No LineArt orders found in CSV. Looking for SKUs ending in -62, -63, -64, or -69."
          );
        }
      } catch (err) {
        setError(`Failed to parse CSV: ${err}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const filteredOrders = orders.filter(
    (order) =>
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Import from CSV</h3>

      {/* File Upload */}
      <div className="flex items-center gap-4">
        <label className="btn-secondary cursor-pointer">
          <span>{fileName || "Choose CSV File"}</span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        {fileName && (
          <span className="text-sm text-gray-600">
            {orders.length} LineArt orders found
          </span>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Parsing CSV...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Order List */}
      {orders.length > 0 && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search by Order ID, SKU, or Title..."
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredOrders.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No matching orders</p>
            ) : (
              filteredOrders.map((order, index) => (
                <div
                  key={`${order.orderId}-${index}`}
                  className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => onOrderSelect(order)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium text-gray-900">
                        #{order.orderId}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {order.sku}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {order.size} | {order.bleed}
                    </span>
                  </div>
                  {order.title && (
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {order.title}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
