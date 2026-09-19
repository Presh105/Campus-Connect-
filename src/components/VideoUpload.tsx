import { useState, useRef, ChangeEvent } from 'react';
import { Video, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoUploadProps {
  bucket: string;
  userId: string;
  onUpload: (url: string) => void;
  maxDuration?: number; // in seconds
}

export function VideoUpload({ bucket, userId, onUpload, maxDuration = 6 }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > maxDuration) {
          toast.error(`Video must be ${maxDuration} seconds or less`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      video.onerror = () => {
        toast.error('Invalid video file');
        resolve(false);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be less than 50MB');
      return;
    }

    // Validate duration
    const isValidDuration = await validateVideo(file);
    if (!isValidDuration) return;

    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload video');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    setPreview(publicUrl);
    onUpload(publicUrl);
    setUploading(false);
    toast.success('Video uploaded!');
  };

  const removeVideo = () => {
    setPreview(null);
    onUpload('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative rounded-lg overflow-hidden">
          <video 
            src={preview} 
            className="w-full max-h-48 object-cover rounded-lg"
            controls
            playsInline
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full w-8 h-8"
            onClick={removeVideo}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Video className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Upload video (max {maxDuration}s)</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
