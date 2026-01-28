'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ImageSize, BleedType } from '@/types';

interface CompositeStepProps {
  lineArtImage: string;
  title: string;
  date: string;
  backgroundColor: 'beige' | 'blue' | 'pink';
  size: ImageSize;
  bleed: BleedType;
  fullOrderNumber?: string;
  onApprove: (finalImage: string) => void;
  onRedo: () => void;
}

interface CompositeConfig {
  lineArtCenterX: number;
  lineArtCenterY: number;
  lineArtScale: number;
  titleFontSize: number;
  titleTop: number;
  titleColor: string;
  titleLetterSpacing: number;
  dateFontSize: number;
  dateTop: number;
  dateColor: string;
  dateLetterSpacing: number;
  backgroundColor: 'beige' | 'blue' | 'pink';
}

const DEFAULT_CONFIG: CompositeConfig = {
  lineArtCenterX: 2700,
  lineArtCenterY: 3200,
  lineArtScale: 7200,
  titleFontSize: 145,
  titleTop: 6710,
  titleColor: '#000000',
  titleLetterSpacing: 40,
  dateFontSize: 95,
  dateTop: 6900,
  dateColor: '#000000',
  dateLetterSpacing: 20,
  backgroundColor: 'beige',
};

export default function CompositeStep({
  lineArtImage,
  title,
  date,
  backgroundColor,
  size,
  bleed,
  fullOrderNumber,
  onApprove,
  onRedo,
}: CompositeStepProps) {
  const [compositeImage, setCompositeImage] = useState<string>('');
  const [isCompositing, setIsCompositing] = useState(false);
  const [error, setError] = useState<string>('');
  const [eraserMode, setEraserMode] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isApplyingEraser, setIsApplyingEraser] = useState(false);
  const [cleanedLineArt, setCleanedLineArt] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  
  const hasComposited = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const performComposite = async (lineArt: string) => {
    setIsCompositing(true);
    setError('');

    try {
      const config: CompositeConfig = {
        ...DEFAULT_CONFIG,
        backgroundColor,
      };

      const response = await fetch('/api/composite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineArtImage: lineArt,
          config,
          title,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to composite image');
      }

      setCompositeImage(data.imageData);
    } catch (err: any) {
      console.error('Composite error:', err);
      setError(err.message || 'Failed to composite image');
    } finally {
      setIsCompositing(false);
    }
  };

  useEffect(() => {
    if (hasComposited.current) return;
    hasComposited.current = true;
    performComposite(lineArtImage);
  }, [lineArtImage, title, date, backgroundColor]);

  // Initialize canvas when entering eraser mode
  useEffect(() => {
    if (eraserMode && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      
      // Get the actual rendered image dimensions and position
      const imgRect = img.getBoundingClientRect();
      const containerRect = imageContainerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        // Position canvas exactly over the image (use Math.round for pixel-perfect alignment)
        const left = Math.round(imgRect.left - containerRect.left);
        const top = Math.round(imgRect.top - containerRect.top);
        const width = Math.round(imgRect.width);
        const height = Math.round(imgRect.height);
        
        canvas.style.left = `${left}px`;
        canvas.style.top = `${top}px`;
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [eraserMode, compositeImage]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eraserMode || !canvasRef.current) return;
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    lastPos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eraserMode || !isDrawing.current || !canvasRef.current || !lastPos.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    if (!ctx) return;

    const currentPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPos.current = currentPos;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clearMask = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const applyEraser = async () => {
    if (!canvasRef.current || !imageRef.current) return;

    setIsApplyingEraser(true);
    setError('');

    try {
      // Get the mask as a data URL
      const maskDataUrl = canvasRef.current.toDataURL('image/png');
      
      // Get the actual rendered image dimensions
      const imgRect = imageRef.current.getBoundingClientRect();

      // Calculate line art dimensions and position based on config
      const config = DEFAULT_CONFIG;
      const lineArtHeight = config.lineArtScale;
      const lineArtWidth = Math.round(lineArtHeight * (3 / 4));
      const lineArtTop = config.lineArtCenterY - (lineArtHeight / 2);
      const lineArtLeft = config.lineArtCenterX - (lineArtWidth / 2);
      
      console.log('=== ERASER FRONTEND DEBUG ===');
      console.log('Canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
      console.log('Image rect:', imgRect.width, 'x', imgRect.height);
      console.log('Line art pos:', lineArtLeft, lineArtTop);
      console.log('Line art size:', lineArtWidth, 'x', lineArtHeight);

      const response = await fetch('/api/apply-eraser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineArtImage: cleanedLineArt || lineArtImage,
          maskImage: maskDataUrl,
          displayWidth: imgRect.width,
          displayHeight: imgRect.height,
          canvasWidth: 5400,
          canvasHeight: 7200,
          lineArtTop,
          lineArtLeft,
          lineArtWidth,
          lineArtHeight,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply eraser');
      }

      // Update with cleaned line art and re-composite
      setCleanedLineArt(data.cleanedLineArt);
      await performComposite(data.cleanedLineArt);
      
      // Clear the canvas and exit eraser mode
      clearMask();
      setEraserMode(false);
    } catch (err: any) {
      console.error('Eraser error:', err);
      setError(err.message || 'Failed to apply eraser');
    } finally {
      setIsApplyingEraser(false);
    }
  };

  const handleExportAndDownload = async () => {
    if (!compositeImage) return;

    setIsExporting(true);
    setError('');

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: compositeImage,
          size,
          bleed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to export image');
      }

      // Create download link
      const link = document.createElement('a');
      link.href = data.imageData;
      
      // Use fullOrderNumber as filename, fallback to timestamp
      const filename = fullOrderNumber || `lineart_${Date.now()}`;
      link.download = `${filename}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Call onApprove to signal completion and reset
      onApprove(compositeImage);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export image');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Step 4: Final Composite
          </h2>
          <p className="text-gray-600">
            Review your final line art canvas. Use the eraser tool to remove unwanted lines.
          </p>
        </div>

        {isCompositing && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-lg">Creating your final canvas...</p>
            <p className="text-gray-500 text-sm mt-2">
              Compositing background, line art, and text
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={onRedo}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Start Over
            </button>
          </div>
        )}

        {compositeImage && !isCompositing && (
          <div className="space-y-6">
            {/* Eraser Controls */}
            {eraserMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900">Eraser Tool Active</h3>
                  <button
                    onClick={() => {
                      setEraserMode(false);
                      clearMask();
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-blue-800 font-medium block mb-1">
                      Brush Size: {brushSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={clearMask}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applyEraser}
                    disabled={isApplyingEraser}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isApplyingEraser ? 'Applying...' : 'Apply Eraser'}
                  </button>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  Draw over areas you want to remove from the line art
                </p>
              </div>
            )}

            {/* Preview */}
            <div 
              ref={imageContainerRef}
              className="bg-gray-100 rounded-lg overflow-hidden relative"
              style={{ cursor: eraserMode ? 'crosshair' : 'default' }}
            >
              <img
                ref={imageRef}
                src={compositeImage}
                alt="Final Composite"
                className="w-full h-auto block"
                style={{ imageRendering: 'auto' }}
              />
              {eraserMode && (
                <canvas
                  ref={canvasRef}
                  className="absolute pointer-events-auto"
                  style={{ 
                    left: 0,
                    top: 0,
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">Export Settings</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Size: <strong>{size}</strong> @ 300dpi | Bleed: <strong>{bleed}</strong>
                  </p>
                  {fullOrderNumber && (
                    <p className="text-sm text-blue-600 mt-1">
                      Filename: <strong>{fullOrderNumber}.jpg</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!eraserMode && (
              <div className="flex gap-4">
                <button
                  onClick={() => setEraserMode(true)}
                  className="flex-1 px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                >
                  Use Eraser Tool
                </button>
                <button
                  onClick={onRedo}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Redo Process
                </button>
                <button
                  onClick={handleExportAndDownload}
                  disabled={isExporting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isExporting ? 'Exporting...' : 'Approve & Download'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
