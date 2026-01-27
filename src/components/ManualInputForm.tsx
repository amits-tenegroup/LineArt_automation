"use client";

import {
  OrderData,
  ImageSize,
  BleedType,
  BackgroundColor,
  SIZE_LABELS,
} from "@/types";

interface ManualInputFormProps {
  orderData: OrderData;
  onChange: (data: Partial<OrderData>) => void;
}

export default function ManualInputForm({
  orderData,
  onChange,
}: ManualInputFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Order Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Image Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Size
          </label>
          <select
            className="select-field"
            value={orderData.size}
            onChange={(e) => onChange({ size: e.target.value as ImageSize })}
          >
            {Object.entries(SIZE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Bleed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bleed
          </label>
          <select
            className="select-field"
            value={orderData.bleed}
            onChange={(e) => onChange({ bleed: e.target.value as BleedType })}
          >
            <option value="none">No Bleed</option>
            <option value="450px">450px (all sides)</option>
            <option value="20px">20px (all sides)</option>
          </select>
        </div>

        {/* Background Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background Color
          </label>
          <div className="flex gap-3">
            {(["beige", "blue", "pink"] as BackgroundColor[]).map((color) => (
              <button
                key={color}
                type="button"
                className={`w-12 h-12 rounded-lg border-2 transition-all ${
                  orderData.backgroundColor === color
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-300"
                }`}
                style={{
                  backgroundColor:
                    color === "beige"
                      ? "#d4c4b5"
                      : color === "blue"
                      ? "#b8c5d6"
                      : "#d6b8c5",
                }}
                onClick={() => onChange({ backgroundColor: color })}
                title={color.charAt(0).toUpperCase() + color.slice(1)}
              />
            ))}
          </div>
        </div>

        {/* Order ID (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order ID (optional)
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g., 350406249"
            value={orderData.orderId || ""}
            onChange={(e) => onChange({ orderId: e.target.value })}
          />
        </div>
      </div>

      {/* Main Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Main Title (Names)
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g., ALEXANDRA & JUSTIN"
          value={orderData.mainTitle}
          onChange={(e) => onChange({ mainTitle: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          This will appear at the bottom of the canvas
        </p>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g., 02.02.25"
          value={orderData.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          Format it as you want it to appear (e.g., 02.02.25 or February 2, 2025)
        </p>
      </div>
    </div>
  );
}
