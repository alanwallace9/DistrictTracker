'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Upload, ChevronLeft, ChevronRight, Star, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import type { RecordPhoto } from '@/lib/supabase';
import {
  uploadPhoto,
  deletePhoto,
  getPhotoUrl,
  reorderPhotos,
} from '@/lib/file-upload';

interface PhotoGalleryProps {
  recordId: string;
  photos: RecordPhoto[];
  userId: string;
  isEditing: boolean;
  onPhotosChange: (photos: RecordPhoto[]) => void;
}

export function PhotoGallery({
  recordId,
  photos,
  userId,
  isEditing,
  onPhotosChange,
}: PhotoGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort photos by display_order
  const sortedPhotos = [...photos].sort((a, b) => a.display_order - b.display_order);
  const primaryPhoto = sortedPhotos[0];

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const newPhotos: RecordPhoto[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const displayOrder = photos.length + i;

        const photo = await uploadPhoto(
          file,
          recordId,
          userId,
          displayOrder,
          (progress) => {
            const overallProgress = ((i + progress.percentage / 100) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          }
        );

        newPhotos.push(photo);
      }

      onPhotosChange([...photos, ...newPhotos]);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      setError(null);
      await deletePhoto(photoId);
      const updatedPhotos = photos.filter((p) => p.id !== photoId);

      // Reorder remaining photos
      const reorderedPhotos = updatedPhotos.map((photo, index) => ({
        ...photo,
        display_order: index,
      }));

      onPhotosChange(reorderedPhotos);

      // Update display order in database
      if (reorderedPhotos.length > 0) {
        await reorderPhotos(reorderedPhotos.map((p) => p.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  };

  const handleMakePrimary = async (photoIndex: number) => {
    const reorderedPhotos = [...sortedPhotos];
    const [movedPhoto] = reorderedPhotos.splice(photoIndex, 1);
    reorderedPhotos.unshift(movedPhoto);

    // Update display_order
    const updatedPhotos = reorderedPhotos.map((photo, index) => ({
      ...photo,
      display_order: index,
    }));

    onPhotosChange(updatedPhotos);
    await reorderPhotos(updatedPhotos.map((p) => p.id));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isEditing) {
      setIsDragging(true);
    }
  }, [isEditing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!isEditing) return;

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [isEditing]
  );

  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closeLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;

    if (direction === 'prev') {
      setSelectedPhotoIndex(
        selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : sortedPhotos.length - 1
      );
    } else {
      setSelectedPhotoIndex(
        selectedPhotoIndex < sortedPhotos.length - 1 ? selectedPhotoIndex + 1 : 0
      );
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      {isEditing && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Uploading photos...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop photos here, or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP • Max 2MB per photo • Up to 10 photos
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {sortedPhotos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedPhotos.map((photo, index) => {
            const photoUrl = getPhotoUrl(photo.storage_path);
            const isPrimary = index === 0;

            return (
              <Card
                key={photo.id}
                className="relative group overflow-hidden aspect-square cursor-pointer"
                onClick={() => !isEditing && openLightbox(index)}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={photoUrl}
                    alt={photo.file_name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>

                {/* Primary Badge */}
                {isPrimary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-white" />
                    Primary
                  </div>
                )}

                {/* Edit Mode Overlay */}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!isPrimary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMakePrimary(index);
                        }}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* View Mode Click Hint */}
                {!isEditing && (
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No photos uploaded yet.</p>
          {isEditing && <p className="text-sm mt-1">Upload photos using the area above.</p>}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={selectedPhotoIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          {selectedPhotoIndex !== null && sortedPhotos[selectedPhotoIndex] && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <Image
                src={getPhotoUrl(sortedPhotos[selectedPhotoIndex].storage_path)}
                alt={sortedPhotos[selectedPhotoIndex].file_name}
                fill
                className="object-contain"
                sizes="100vw"
              />

              {/* Navigation Buttons */}
              {sortedPhotos.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                    onClick={() => navigateLightbox('prev')}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
                    onClick={() => navigateLightbox('next')}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white p-4 z-10">
                <p className="text-sm">{sortedPhotos[selectedPhotoIndex].file_name}</p>
                <p className="text-xs text-gray-400">
                  {selectedPhotoIndex + 1} of {sortedPhotos.length}
                </p>
              </div>

              {/* Close Button */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={closeLightbox}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
