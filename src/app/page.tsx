"use client";

import { useState, useCallback } from "react";
import {
  ImageUploader,
  CSVUploader,
  ManualInputForm,
  ProgressIndicator,
  AITransformStep,
  AutoTransformStep,
  CompositeStep,
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
  const [firstTransformImage, setFirstTransformImage] = useState<string>("");
  const [secondTransformImage, setSecondTransformImage] = useState<string>("");
  const [finalCompositeImage, setFinalCompositeImage] = useState<string>("");

  // TEST MODE: Skip directly to step 4 with test image
  const skipToStep4Test = async () => {
    try {
      // Read the test image file
      const response = await fetch('/download (8).png');
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setSecondTransformImage(base64data);
        setOrderData({
          ...INITIAL_ORDER_DATA,
          mainTitle: 'Test & Title',
          date: '01.01.00',
          backgroundColor: 'beige',
        });
        setCurrentStep(4);
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Failed to load test image:', error);
      alert('Please copy your test image to public folder as "download (8).png"');
    }
  };

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
      fullOrderNumber: order.fullOrderNumber,
      sku: order.sku,
      imageUrl: order.imageUrl,
      size: order.size,
      bleed: order.bleed,
      mainTitle: order.title,
      date: order.date,
      // Keep existing values for fields not in CSV
      backgroundColor: prev.backgroundColor,
    }));
  }, []);

  // Check if we can proceed to next step
  const canProceed = orderData.imageFile || orderData.imageUrl;

  // Handle start processing
  const handleStartProcess = useCallback(async () => {
    if (!canProceed) return;

    setIsProcessing(true);
    console.log("Starting process with data:", orderData);

    // Convert image to base64 if needed
    let imageDataUrl = orderData.imagePreviewUrl;
    
    if (orderData.imageUrl && !orderData.imageFile) {
      // Fetch the image from URL via our proxy API to avoid CORS issues
      try {
        const response = await fetch('/api/fetch-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: orderData.imageUrl }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch image');
        }

        imageDataUrl = data.imageData;
      } catch (error) {
        console.error("Failed to fetch image from URL:", error);
        alert(`Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsProcessing(false);
        return;
      }
    }

    // Update order data with the image data URL
    setOrderData((prev) => ({
      ...prev,
      imagePreviewUrl: imageDataUrl,
    }));

    // Move to step 2
    setCurrentStep(2);
    setIsProcessing(false);
  }, [canProceed, orderData]);

  // Reset to start
  const handleReset = useCallback(() => {
    setOrderData(INITIAL_ORDER_DATA);
    setFirstTransformImage("");
    setSecondTransformImage("");
    setFinalCompositeImage("");
    setCurrentStep(1);
  }, []);

  // Handle first transformation approval
  const handleFirstTransformApprove = useCallback((transformedImage: string) => {
    setFirstTransformImage(transformedImage);
    setCurrentStep(3);
  }, []);

  // Handle second transformation completion (auto-proceeds to Step 4)
  const handleSecondTransformComplete = useCallback((transformedImage: string) => {
    setSecondTransformImage(transformedImage);
    setCurrentStep(4);
  }, []);

  // Handle composite approval - after download, go to success screen then reset
  const handleCompositeApprove = useCallback((finalImage: string) => {
    setFinalCompositeImage(finalImage);
    setCurrentStep(5); // Show success message briefly
    
    // Auto-reset to step 1 after 3 seconds
    setTimeout(() => {
      handleReset();
    }, 3000);
  }, []);

  // Handle back from step 2
  const handleBackToStep1 = useCallback(() => {
    setCurrentStep(1);
  }, []);

  // AI Prompts
  const FIRST_TRANSFORM_PROMPT = "Continuous line art drawing, one single fluid beautiful line, abstract very minimalist art, blind contour sketch, aesthetic, imperfect curves, chaotic but artistic, high contrast black on white. Very abstract. IGNORE the background";
  const SECOND_TRANSFORM_PROMPT = "make some lines thicker";

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

                {/* TEST MODE BUTTON */}
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <button
                    onClick={skipToStep4Test}
                    className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium text-sm"
                  >
                    🧪 TEST: Skip to Step 4 (Eraser Test)
                  </button>
                  <p className="text-xs text-yellow-700 mt-2">
                    Copy test image to public/download (8).png first
                  </p>
                </div>

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

        {/* Step 2: First AI Transformation */}
        {currentStep === 2 && orderData.imagePreviewUrl && (
          <AITransformStep
            sourceImage={orderData.imagePreviewUrl}
            stepNumber={1}
            prompt={FIRST_TRANSFORM_PROMPT}
            onApprove={handleFirstTransformApprove}
            onBack={handleBackToStep1}
          />
        )}

        {/* Step 3: Second AI Pass (Automatic Refinement) */}
        {currentStep === 3 && firstTransformImage && (
          <AutoTransformStep
            sourceImage={firstTransformImage}
            prompt={SECOND_TRANSFORM_PROMPT}
            onComplete={handleSecondTransformComplete}
          />
        )}

        {/* Step 4: Final Composite & Export */}
        {currentStep === 4 && secondTransformImage && (
          <CompositeStep
            lineArtImage={secondTransformImage}
            title={orderData.mainTitle}
            date={orderData.date}
            backgroundColor={orderData.backgroundColor}
            size={orderData.size}
            bleed={orderData.bleed}
            fullOrderNumber={orderData.fullOrderNumber}
            onApprove={handleCompositeApprove}
            onRedo={handleReset}
          />
        )}

        {/* Step 5: Success message after download */}
        {currentStep === 5 && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-green-600 mb-2">
              Download Complete!
            </h2>
            <p className="text-gray-600 mb-2">
              Your LineArt canvas has been exported as JPG.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Size: {orderData.size} | Bleed: {orderData.bleed}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Returning to start in a few seconds...
            </p>
            <button onClick={handleReset} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Start New Order
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
