"use client";

import { useState, useCallback } from "react";
import {
  ImageUploader,
  CSVUploader,
  ManualInputForm,
  ProgressIndicator,
} from "@/components";
import {
  OrderData,
  WorkflowStep,
  INITIAL_ORDER_DATA,
} from "@/types";
import { ParsedOrder } from "@/lib/csvParser";

type InputMode = "manual" | "csv";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [orderData, setOrderData] = useState<OrderData>(INITIAL_ORDER_DATA);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle image selection
  const handleImageSelect = useCallback((file: File, previewUrl: string) => {
    setOrderData((prev) => ({
      ...prev,
      imageFile: file,
      imagePreviewUrl: previewUrl,
    }));
  }, []);

  // Handle order data changes from manual form
  const handleOrderDataChange = useCallback((changes: Partial<OrderData>) => {
    setOrderData((prev) => ({ ...prev, ...changes }));
  }, []);

  // Handle CSV order selection
  const handleCSVOrderSelect = useCallback((order: ParsedOrder) => {
    setOrderData((prev) => ({
      ...prev,
      orderId: order.orderId,
      sku: order.sku,
      imageUrl: order.imageUrl,
      size: order.size,
      bleed: order.bleed,
      mainTitle: order.title,
      // Keep existing values for fields not in CSV
      date: prev.date,
      backgroundColor: prev.backgroundColor,
    }));
  }, []);

  // Check if we can proceed to next step
  const canProceed =
    (orderData.imageFile || orderData.imageUrl) &&
    orderData.mainTitle.trim() !== "";

  // Handle start processing
  const handleStartProcess = useCallback(async () => {
    if (!canProceed) return;

    setIsProcessing(true);
    // TODO: Implement Step 2 - First AI transformation
    console.log("Starting process with data:", orderData);

    // For now, just move to step 2 placeholder
    setCurrentStep(2);
    setIsProcessing(false);
  }, [canProceed, orderData]);

  // Reset to start
  const handleReset = useCallback(() => {
    setOrderData(INITIAL_ORDER_DATA);
    setCurrentStep(1);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            LineArt Automation
          </h1>
          <p className="text-sm text-gray-600">
            Transform couple photos into beautiful line art canvases
          </p>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <ProgressIndicator currentStep={currentStep} />
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Image Upload & CSV */}
            <div className="space-y-6">
              {/* Image Uploader */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  previewUrl={orderData.imagePreviewUrl}
                  imageUrl={orderData.imageUrl}
                />
              </div>

              {/* Input Mode Toggle */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex gap-4 mb-4">
                  <button
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      inputMode === "manual"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setInputMode("manual")}
                  >
                    Manual Entry
                  </button>
                  <button
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      inputMode === "csv"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setInputMode("csv")}
                  >
                    Import CSV
                  </button>
                </div>

                {inputMode === "csv" && (
                  <CSVUploader onOrderSelect={handleCSVOrderSelect} />
                )}
              </div>
            </div>

            {/* Right Column - Order Details */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <ManualInputForm
                  orderData={orderData}
                  onChange={handleOrderDataChange}
                />
              </div>

              {/* Summary & Actions */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Order Summary
                </h3>

                <div className="space-y-2 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span className="font-medium">{orderData.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bleed:</span>
                    <span className="font-medium">{orderData.bleed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Background:</span>
                    <span className="font-medium capitalize">
                      {orderData.backgroundColor}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Title:</span>
                    <span className="font-medium">
                      {orderData.mainTitle || "(not set)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {orderData.date || "(not set)"}
                    </span>
                  </div>
                  {orderData.orderId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-medium">{orderData.orderId}</span>
                    </div>
                  )}
                </div>

                {/* Validation Messages */}
                {!orderData.imageFile && !orderData.imageUrl && (
                  <p className="text-amber-600 text-sm mb-4">
                    Please upload an image or provide an image URL
                  </p>
                )}
                {!orderData.mainTitle && (
                  <p className="text-amber-600 text-sm mb-4">
                    Please enter the main title (names)
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="btn-secondary flex-1"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleStartProcess}
                    disabled={!canProceed || isProcessing}
                    className="btn-primary flex-1"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      "Start Process"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for Steps 2-5 */}
        {currentStep > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Step {currentStep} - Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              This step will be implemented next.
            </p>
            <button onClick={handleReset} className="btn-secondary">
              Back to Start
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
