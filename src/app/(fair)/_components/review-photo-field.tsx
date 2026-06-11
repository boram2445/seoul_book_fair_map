"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const MAX_PHOTOS = 4;

type PhotoPreview = {
  file: File;
  url: string;
};

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export function ReviewPhotoField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Ref keeps the latest photos array accessible in the unmount cleanup,
  // avoiding stale closure issues with useEffect's dependency array.
  const photosRef = useRef<PhotoPreview[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    setIsCompressing(true);
    const candidates = Array.from(files).slice(0, remaining);

    const next: PhotoPreview[] = await Promise.all(
      candidates.map(async (file) => {
        try {
          const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
          return { file: compressed, url: URL.createObjectURL(compressed) };
        } catch {
          // Fallback to original file if compression fails
          return { file, url: URL.createObjectURL(file) };
        }
      })
    );

    setPhotos((prev) => [...prev, ...next]);
    setIsCompressing(false);
  }

  function handleRemove(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  return (
    <div className="grid gap-2">
      <Label className="text-xs font-black text-brand-rust">사진</Label>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <div key={photo.url} className="relative h-24 w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`첨부 사진 ${index + 1}`}
                className="h-full w-full border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-0 top-0 flex h-5 w-5 cursor-pointer items-center justify-center bg-brand-ink text-white"
                aria-label="사진 삭제"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileChange}
        // Reset input value so re-selecting the same file fires onChange again
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={photos.length >= MAX_PHOTOS || isCompressing}
        className="w-fit rounded-none border-border bg-white font-black hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCompressing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            압축 중…
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            사진 추가 ({photos.length}/{MAX_PHOTOS})
          </>
        )}
      </Button>
    </div>
  );
}
