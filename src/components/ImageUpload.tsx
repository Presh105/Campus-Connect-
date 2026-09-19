import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket: 'posts' | 'tasks' | 'listings' | 'chat-files' | 'avatars';
  userId: string;
  onUpload: (url: string, fileType?: string) => void;
  accept?: string;
  className?: string;
  preview?: boolean;
  allowFiles?: boolean;
}

export function ImageUpload({ 
  bucket, 
  userId, 
  onUpload, 
  accept = 'image/*',
  className = '',
  preview = true,
  allowFiles = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Determine file type
      const isImage = file.type.startsWith('image/');
      const fileType = isImage ? 'image' : 'file';

      if (preview && isImage) {
        setPreviewUrl(publicUrl);
      } else if (!isImage) {
        setFileName(file.name);
      }

      onUpload(publicUrl, fileType);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setPreviewUrl(null);
    setFileName(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onUpload('');
  };

  const acceptTypes = allowFiles 
    ? 'image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx'
    : accept;

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />

      {previewUrl ? (
        <div className="relative inline-block">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-xl"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full w-8 h-8"
            onClick={clearUpload}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-sm truncate flex-1">{fileName}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full w-8 h-8"
            onClick={clearUpload}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 rounded-xl border-dashed flex flex-col gap-2"
        >
          {uploading ? (
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <>
              {allowFiles ? (
                <Upload className="w-6 h-6 text-muted-foreground" />
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {allowFiles ? 'Upload image or file' : 'Upload image'}
              </span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
