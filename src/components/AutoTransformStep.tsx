'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface AutoTransformStepProps {
  sourceImage: string;
  prompt: string;
  onComplete: (transformedImage: string) => void;
}

export const AutoTransformStep: React.FC<AutoTransformStepProps> = ({
  sourceImage,
  prompt,
  onComplete,
}) => {
  const [transformedImage, setTransformedImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('Initializing...');
  const hasTransformed = useRef<boolean>(false);

  const performTransformation = async () => {
    setIsLoading(true);
    setError('');
    setProgress('Sending to Gemini AI...');

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: sourceImage,
          prompt: prompt,
          step: 2,
        }),
      });

      setProgress('Processing response...');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transform image');
      }

      setProgress('Transformation complete!');
      setTransformedImage(data.imageData);
      setIsLoading(false);

      // Auto-proceed after a brief moment to show the result
      setTimeout(() => {
        onComplete(data.imageData);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred during transformation');
      setIsLoading(false);
      console.error('Transform error:', err);
    }
  };

  // Auto-start transformation when component mounts - only once
  useEffect(() => {
    if (hasTransformed.current) return;
    
    hasTransformed.current = true;
    performTransformation();
  }, []);

  const handleRetry = () => {
    hasTransformed.current = false;
    performTransformation();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Second AI Pass - Refinement
        </h2>
        <p className="text-gray-600">
          Automatically refining the line art...
        </p>
      </div>

      {/* Image Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Image */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Step 2 Result
          </h3>
          <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            <Image
              src={sourceImage}
              alt="Step 2 Result"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Refined Image */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Refined Result
          </h3>
          <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 font-medium text-lg">
                    {progress}
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
              <>
                <Image
                  src={transformedImage}
                  alt="Refined"
                  fill
                  className="object-contain"
                />
                <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Complete
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Status Message */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              </svg>
            </div>
            <p className="text-blue-800 text-sm font-medium">
              Processing automatically - no action required
            </p>
          </div>
        </div>
      )}

      {/* Error State with Retry */}
      {error && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              🔄 Retry Transformation
            </button>
          </div>
        </div>
      )}

      {/* Success State */}
      {transformedImage && !isLoading && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 text-sm font-medium">
              Refinement complete! Moving to next step...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoTransformStep;
