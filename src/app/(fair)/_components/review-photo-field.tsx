"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const MAX_PHOTOS = 4;
const MAX_FILE_MB = 1;

type PhotoPreview = {
  file: File;
  url: string;
};

const COMPRESSION_OPTIONS = {
  maxSizeMB: MAX_FILE_MB,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

export type ReviewPhotoFieldHandle = {
  getFiles: () => File[];
  reset: () => void;
};

type ReviewPhotoFieldProps = {
  onChange?: (files: File[]) => void;
};

export const ReviewPhotoField = forwardRef<ReviewPhotoFieldHandle, ReviewPhotoFieldProps>(
  function ReviewPhotoField({ onChange }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const photosRef = useRef<PhotoPreview[]>([]);
  useEffect(() => {
    photosRef.current = photos;
    onChange?.(photos.map((p) => p.file));
  }, [photos, onChange]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  useImperativeHandle(ref, () => ({
    getFiles: () => photosRef.current.map((p) => p.file),
    reset: () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      if (inputRef.current) inputRef.current.value = "";
    },
  }));

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    setIsCompressing(true);
    const candidates = Array.from(files).slice(0, remaining);

    const results = await Promise.all(
      candidates.map(async (file) => {
        try {
          const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
          // 압축 후에도 1MB 초과 시 업로드 불가
          if (compressed.size > MAX_FILE_MB * 1024 * 1024) {
            toast.error(`${file.name}: 압축 후에도 ${MAX_FILE_MB}MB를 초과해 첨부할 수 없습니다.`);
            return null;
          }
          return { file: compressed, url: URL.createObjectURL(compressed) };
        } catch {
          toast.error(`${file.name}: 압축에 실패했습니다.`);
          return null;
        }
      })
    );

    const next = results.filter((r): r is PhotoPreview => r !== null);
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
        className="h-8 w-fit rounded-none border-border bg-white text-xs font-black hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:text-sm"
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
});
