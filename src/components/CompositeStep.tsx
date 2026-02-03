'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ImageSize, BleedType, getCanvasDimensions } from '@/types';

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

// Calculate default config based on canvas aspect ratio
const getDefaultConfig = (size: ImageSize): CompositeConfig => {
  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(size);
  
  // Calculate positions relative to canvas dimensions
  // Line art centered horizontally, slightly above center vertically
  const lineArtCenterX = canvasWidth / 2;
  const lineArtCenterY = canvasHeight * 0.44; // 44% from top
  const lineArtScale = canvasHeight; // Full height by default
  
  // Text at bottom (93% from top for title, 96% for date)
  const titleTop = canvasHeight * 0.93;
  const dateTop = canvasHeight * 0.96;
  
  // Font sizes relative to canvas height
  const titleFontSize = Math.round(canvasHeight * 0.02); // 2% of height
  const dateFontSize = Math.round(canvasHeight * 0.013); // 1.3% of height
  
  return {
    lineArtCenterX,
    lineArtCenterY,
    lineArtScale,
    titleFontSize,
    titleTop,
    titleColor: '#000000',
    titleLetterSpacing: 40,
    dateFontSize,
    dateTop,
    dateColor: '#000000',
    dateLetterSpacing: 20,
    backgroundColor: 'beige',
  };
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
  // Get default config for the current size
  const defaultConfig = getDefaultConfig(size);
  
  const [compositeImage, setCompositeImage] = useState<string>('');
  const [isCompositing, setIsCompositing] = useState(false);
  const [error, setError] = useState<string>('');
  const [eraserMode, setEraserMode] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [isApplyingEraser, setIsApplyingEraser] = useState(false);
  const [cleanedLineArt, setCleanedLineArt] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Line art position and scale controls
  const [lineArtCenterX, setLineArtCenterX] = useState(defaultConfig.lineArtCenterX);
  const [lineArtCenterY, setLineArtCenterY] = useState(defaultConfig.lineArtCenterY);
  const [lineArtScale, setLineArtScale] = useState(defaultConfig.lineArtScale);
  const [showPositionControls, setShowPositionControls] = useState(false);
  
  const hasComposited = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const performComposite = async (lineArt: string, preview: boolean = false) => {
    setIsCompositing(true);
    setError('');

    try {
      const config: CompositeConfig = {
        ...defaultConfig,
        backgroundColor,
        lineArtCenterX,
        lineArtCenterY,
        lineArtScale,
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
          size, // Pass size to determine canvas aspect ratio
          preview, // Use lower resolution for preview
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
    performComposite(lineArtImage, true); // Use preview for initial load too (faster)
  }, [lineArtImage, title, date, backgroundColor]);

  // Auto-update composite when position/scale changes (with debounce)
  useEffect(() => {
    if (!hasComposited.current) return; // Don't run until initial composite is done

    const timer = setTimeout(() => {
      performComposite(cleanedLineArt || lineArtImage, true); // Use preview for slider updates
    }, 300); // 300ms debounce (faster since preview is lighter)

    return () => clearTimeout(timer);
  }, [lineArtCenterX, lineArtCenterY, lineArtScale]);

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

      // Calculate line art dimensions and position based on CURRENT config
      const currentLineArtHeight = lineArtScale;
      const currentLineArtWidth = Math.round(currentLineArtHeight * (3 / 4));
      const currentLineArtTop = lineArtCenterY - (currentLineArtHeight / 2);
      const currentLineArtLeft = lineArtCenterX - (currentLineArtWidth / 2);
      
      // Get canvas dimensions based on size
      const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(size);
      
      console.log('=== ERASER FRONTEND DEBUG ===');
      console.log('Size:', size);
      console.log('Canvas size:', canvasWidth, 'x', canvasHeight);
      console.log('Display canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
      console.log('Image rect:', imgRect.width, 'x', imgRect.height);
      console.log('Line art pos:', currentLineArtLeft, currentLineArtTop);
      console.log('Line art size:', currentLineArtWidth, 'x', currentLineArtHeight);

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
          canvasWidth,
          canvasHeight,
          lineArtTop: currentLineArtTop,
          lineArtLeft: currentLineArtLeft,
          lineArtWidth: currentLineArtWidth,
          lineArtHeight: currentLineArtHeight,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply eraser');
      }

      // Update with cleaned line art and re-composite (use preview for speed)
      setCleanedLineArt(data.cleanedLineArt);
      await performComposite(data.cleanedLineArt, true);
      
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
    setIsExporting(true);
    setError('');

    try {
      // Generate full-resolution export directly (no intermediate composite needed)
      const config: CompositeConfig = {
        ...defaultConfig,
        backgroundColor,
        lineArtCenterX,
        lineArtCenterY,
        lineArtScale,
      };

      const exportResponse = await fetch('/api/export-full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineArtImage: cleanedLineArt || lineArtImage,
          config,
          title,
          date,
          size,
          bleed,
          fullOrderNumber,
        }),
      });

      if (!exportResponse.ok) {
        const errorData = await exportResponse.json();
        throw new Error(errorData.error || 'Failed to export image');
      }

      // Get the blob and create download link
      const blob = await exportResponse.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      // Use fullOrderNumber as filename, fallback to timestamp
      const filename = fullOrderNumber || `lineart_${Date.now()}`;
      link.download = `${filename}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(url);

      // Call onApprove to signal completion and reset
      onApprove(compositeImage); // Use the preview image for the success message
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

        {isCompositing && !compositeImage && (
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

        {compositeImage && (
          <div className="space-y-6 relative">
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
                className={`w-full h-auto block transition-opacity duration-200 ${isCompositing ? 'opacity-50' : 'opacity-100'}`}
                style={{ imageRendering: 'auto' }}
              />
              {isCompositing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/80 rounded-lg px-4 py-2 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-gray-700">Updating...</span>
                  </div>
                </div>
              )}
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

            {/* Position Controls */}
            {!eraserMode && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Line Art Position & Scale</h3>
                  <button
                    onClick={() => setShowPositionControls(!showPositionControls)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showPositionControls ? 'Hide Controls' : 'Adjust Position'}
                  </button>
                </div>
                
                {showPositionControls && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-700 font-medium block mb-1">
                        Horizontal Position (X): {lineArtCenterX}px
                      </label>
                      <input
                        type="range"
                        min={Math.round(getCanvasDimensions(size).width * 0.2)}
                        max={Math.round(getCanvasDimensions(size).width * 0.8)}
                        value={lineArtCenterX}
                        onChange={(e) => setLineArtCenterX(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700 font-medium block mb-1">
                        Vertical Position (Y): {lineArtCenterY}px
                      </label>
                      <input
                        type="range"
                        min={Math.round(getCanvasDimensions(size).height * 0.15)}
                        max={Math.round(getCanvasDimensions(size).height * 0.85)}
                        value={lineArtCenterY}
                        onChange={(e) => setLineArtCenterY(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700 font-medium block mb-1">
                        Scale: {lineArtScale}px (height)
                      </label>
                      <input
                        type="range"
                        min={Math.round(getCanvasDimensions(size).height * 0.4)}
                        max={Math.round(getCanvasDimensions(size).height * 1.3)}
                        step="100"
                        value={lineArtScale}
                        onChange={(e) => setLineArtScale(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setLineArtCenterX(defaultConfig.lineArtCenterX);
                          setLineArtCenterY(defaultConfig.lineArtCenterY);
                          setLineArtScale(defaultConfig.lineArtScale);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Reset to Default
                      </button>
                      {isCompositing && (
                        <span className="px-4 py-2 text-sm text-blue-600">
                          Updating preview...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
