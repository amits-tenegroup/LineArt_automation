"use client";

import { useCallback, useState } from "react";

interface ImageUploaderProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  previewUrl?: string;
  imageUrl?: string;
}

export default function ImageUploader({
  onImageSelect,
  previewUrl,
  imageUrl,
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(imageUrl || "");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith("image/")) {
        const file = files[0];
        const preview = URL.createObjectURL(file);
        onImageSelect(file, preview);
      }
    },
    [onImageSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const preview = URL.createObjectURL(file);
        onImageSelect(file, preview);
      }
    },
    [onImageSelect]
  );

  const handleUrlLoad = useCallback(async () => {
    if (!urlInput.trim()) return;

    setIsLoadingUrl(true);
    try {
      // For now, just use the URL directly as preview
      // In production, we might want to validate/proxy this
      const response = await fetch(urlInput);
      const blob = await response.blob();
      const file = new File([blob], "image-from-url.png", { type: blob.type });
      const preview = URL.createObjectURL(blob);
      onImageSelect(file, preview);
    } catch (error) {
      console.error("Failed to load image from URL:", error);
      // Fallback: just use the URL as preview
      onImageSelect(
        new File([], "url-image"),
        urlInput
      );
    } finally {
      setIsLoadingUrl(false);
    }
  }, [urlInput, onImageSelect]);

  const displayImage = previewUrl || (imageUrl && imageUrl.length > 0 ? imageUrl : null);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Source Image</h3>

      {/* Drag and Drop Zone */}
      <div
        className={`drop-zone cursor-pointer ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        {displayImage ? (
          <div className="flex flex-col items-center">
            <img
              src={displayImage}
              alt="Preview"
              className="max-h-64 max-w-full rounded-lg shadow-md mb-4"
            />
            <p className="text-sm text-gray-600">Click or drop to replace</p>
          </div>
        ) : (
          <div className="py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-4 text-gray-600">
              Drag and drop an image, or click to select
            </p>
            <p className="mt-2 text-sm text-gray-500">
              PNG, JPG, WEBP up to 10MB
            </p>
          </div>
        )}
      </div>

      <input
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* URL Input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Or paste image URL..."
          className="input-field flex-1"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <button
          onClick={handleUrlLoad}
          disabled={!urlInput.trim() || isLoadingUrl}
          className="btn-secondary whitespace-nowrap"
        >
          {isLoadingUrl ? "Loading..." : "Load URL"}
        </button>
      </div>
    </div>
  );
}
