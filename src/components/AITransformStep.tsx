'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface AITransformStepProps {
  sourceImage: string;
  stepNumber: 1 | 2;
  prompt: string;
  onApprove: (transformedImage: string) => void;
  onBack: () => void;
}

export const AITransformStep: React.FC<AITransformStepProps> = ({
  sourceImage,
  stepNumber,
  prompt,
  onApprove,
  onBack,
}) => {
  const [transformedImage, setTransformedImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const hasTransformed = useRef<boolean>(false);

  const performTransformation = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: sourceImage,
          prompt: prompt,
          step: stepNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transform image');
      }

      setTransformedImage(data.imageData);
    } catch (err: any) {
      setError(err.message || 'An error occurred during transformation');
      console.error('Transform error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-start transformation when component mounts - only once
  useEffect(() => {
    // Prevent double-calling in React Strict Mode (development)
    if (hasTransformed.current) return;
    
    hasTransformed.current = true;
    performTransformation();
  }, []);

  const handleRegenerate = () => {
    // Reset the ref so regenerate can work multiple times
    hasTransformed.current = false;
    performTransformation();
  };

  const handleApprove = () => {
    if (transformedImage) {
      onApprove(transformedImage);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {stepNumber === 1 ? 'First AI Transformation' : 'Second AI Pass (Refinement)'}
        </h2>
        <p className="text-gray-600">
          {stepNumber === 1
            ? 'Converting your photo to line art...'
            : 'Refining the line art...'}
        </p>
      </div>

      {/* Image Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Image */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Original Image
          </h3>
          <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <Image
              src={sourceImage}
              alt="Original"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Transformed Image */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {stepNumber === 1 ? 'Line Art Result' : 'Refined Result'}
          </h3>
          <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 font-medium">
                    {stepNumber === 1 ? 'Creating line art...' : 'Refining...'}
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                  <div className="text-red-500 text-5xl">⚠️</div>
                  <p className="text-red-600 font-medium">{error}</p>
                </div>
              </div>
            ) : transformedImage ? (
              <Image
                src={transformedImage}
                alt="Transformed"
                fill
                className="object-contain"
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          disabled={isLoading}
        >
          ← Back to Step 1
        </button>

        <button
          onClick={handleRegenerate}
          disabled={isLoading || !error && !transformedImage}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : '🔄 Regenerate'}
        </button>

        <button
          onClick={handleApprove}
          disabled={isLoading || !transformedImage}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓ Approve & Continue
        </button>
      </div>
    </div>
  );
};

export default AITransformStep;
