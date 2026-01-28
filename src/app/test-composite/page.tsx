'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface CompositeConfig {
  // Line Art positioning (center-based)
  lineArtCenterX: number;
  lineArtCenterY: number;
  lineArtScale: number; // Single scale value (height in px), maintains 3:4 aspect ratio
  
  // Text styling
  titleFontSize: number;
  titleTop: number;
  titleColor: string;
  titleLetterSpacing: number; // Letter spacing for title
  
  dateFontSize: number;
  dateTop: number;
  dateColor: string;
  dateLetterSpacing: number; // Letter spacing for date
  
  // Background
  backgroundColor: 'beige' | 'blue' | 'pink';
}

const DEFAULT_CONFIG: CompositeConfig = {
  lineArtCenterX: 2700, // Center of canvas width (5400 / 2)
  lineArtCenterY: 3200, // Slightly above center
  lineArtScale: 5400, // Height in pixels (width will be 3/4 of this to maintain 3:4 ratio)
  titleFontSize: 120,
  titleTop: 6400,
  titleColor: '#000000',
  titleLetterSpacing: 16, // Default 16px letter spacing
  dateFontSize: 80,
  dateTop: 6600,
  dateColor: '#000000',
  dateLetterSpacing: 8, // Default 8px letter spacing
  backgroundColor: 'beige',
};

export default function TestCompositePage() {
  const [config, setConfig] = useState<CompositeConfig>(DEFAULT_CONFIG);
  const [testLineArt, setTestLineArt] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('ALEXANDRA & JUSTIN');
  const [testDate, setTestDate] = useState<string>('02.02.25');
  const [isCompositing, setIsCompositing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTestLineArt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComposite = async () => {
    if (!testLineArt) {
      alert('Please upload a test line art image first!');
      return;
    }

    setIsCompositing(true);

    try {
      const response = await fetch('/api/composite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lineArtImage: testLineArt,
          config: config,
          title: testTitle,
          date: testDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to composite');
      }

      setPreviewImage(data.imageData);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      console.error('Composite error:', error);
    } finally {
      setIsCompositing(false);
    }
  };

  const updateConfig = (key: keyof CompositeConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const saveConfiguration = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'composite-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Step 4 Composite Testing
          </h1>
          <p className="text-gray-600">
            Adjust positioning and styling without wasting API calls
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Test Image */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Test Line Art</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Test Image
              </button>
              {testLineArt && (
                <div className="mt-4">
                  <p className="text-sm text-green-600">✓ Image loaded</p>
                </div>
              )}
            </div>

            {/* Background Selection */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Background</h3>
              <select
                value={config.backgroundColor}
                onChange={(e) => updateConfig('backgroundColor', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="beige">Beige</option>
                <option value="blue">Blue</option>
                <option value="pink">Pink</option>
              </select>
            </div>

            {/* Line Art Position */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Line Art Position (Center-based)</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Center X (px)</label>
                  <input
                    type="number"
                    value={config.lineArtCenterX}
                    onChange={(e) => updateConfig('lineArtCenterX', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Canvas width: 5400px (center: 2700px)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Center Y (px)</label>
                  <input
                    type="number"
                    value={config.lineArtCenterY}
                    onChange={(e) => updateConfig('lineArtCenterY', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Canvas height: 7200px (center: 3600px)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Scale (Height in px)</label>
                  <input
                    type="number"
                    value={config.lineArtScale}
                    onChange={(e) => updateConfig('lineArtScale', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maintains 3:4 aspect ratio (portrait). Width = Scale × 3/4</p>
                </div>
              </div>
            </div>

            {/* Text Configuration */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Text Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Title Text</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Title Font Size (px)</label>
                  <input
                    type="number"
                    value={config.titleFontSize}
                    onChange={(e) => updateConfig('titleFontSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Title Letter Spacing (px)</label>
                  <input
                    type="number"
                    value={config.titleLetterSpacing}
                    onChange={(e) => updateConfig('titleLetterSpacing', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tracking/spacing between letters</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Title Top (px)</label>
                  <input
                    type="number"
                    value={config.titleTop}
                    onChange={(e) => updateConfig('titleTop', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Text</label>
                  <input
                    type="text"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Font Size (px)</label>
                  <input
                    type="number"
                    value={config.dateFontSize}
                    onChange={(e) => updateConfig('dateFontSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Letter Spacing (px)</label>
                  <input
                    type="number"
                    value={config.dateLetterSpacing}
                    onChange={(e) => updateConfig('dateLetterSpacing', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tracking/spacing between letters</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Top (px)</label>
                  <input
                    type="number"
                    value={config.dateTop}
                    onChange={(e) => updateConfig('dateTop', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
              <button
                onClick={handleComposite}
                disabled={isCompositing || !testLineArt}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompositing ? 'Compositing...' : '🎨 Generate Preview'}
              </button>
              <button
                onClick={saveConfiguration}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                💾 Save Configuration
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                {previewImage && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOverlay}
                      onChange={(e) => setShowOverlay(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Show Reference Overlay</span>
                  </label>
                )}
              </div>
              <div className="bg-gray-100 rounded-lg overflow-hidden relative" style={{ minHeight: '600px' }}>
                {previewImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={previewImage}
                      alt="Composite Preview"
                      width={5400}
                      height={7200}
                      className="w-full h-auto"
                    />
                    {showOverlay && (
                      <div className="absolute inset-0 pointer-events-none">
                        <Image
                          src="/assets/reference-overlay.jpg"
                          alt="Reference Overlay"
                          width={5400}
                          height={7200}
                          className="w-full h-auto opacity-50"
                          style={{ mixBlendMode: 'normal' }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[600px]">
                    <div className="text-center text-gray-500">
                      <p className="text-lg font-medium">No preview yet</p>
                      <p className="text-sm mt-2">Upload a test image and click "Generate Preview"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
