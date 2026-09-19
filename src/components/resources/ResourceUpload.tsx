import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEPARTMENTS_ALPHABETICAL, LEVELS, SEMESTERS } from '@/lib/constants';

interface ResourceUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
  defaultDepartment?: string;
  defaultLevel?: string;
  defaultSemester?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function ResourceUpload({ onSuccess, onCancel, defaultDepartment, defaultLevel, defaultSemester }: ResourceUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState(defaultDepartment || '');
  const [level, setLevel] = useState(defaultLevel || '');
  const [semester, setSemester] = useState(defaultSemester || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { toast.error('File size must be less than 50MB'); return; }
    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUpload = async () => {
    if (!user || !selectedFile || !title.trim()) { toast.error('Please fill in all required fields'); return; }
    if (!department || !level || !semester) { toast.error('Please choose department, level and semester'); return; }
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('academic-resources')
        .upload(fileName, selectedFile, { contentType: selectedFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('academic-resources').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('academic_resources').insert({
        uploader_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        file_url: urlData.publicUrl,
        file_type: selectedFile.type,
        file_name: selectedFile.name,
        department,
        level,
        semester,
      } as any);
      if (dbError) throw dbError;
      toast.success('Resource uploaded successfully!');
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message ? `Upload failed: ${error.message}` : 'Failed to upload resource');
      console.error('Resource upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4 shadow-soft">
      <h3 className="font-semibold text-lg mb-4">Upload Study Material</h3>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" placeholder="e.g., CSC 101 Past Questions 2024"
            value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-2">
            <Label>Department *</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose department" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {DEPARTMENTS_ALPHABETICAL.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semester *</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Semester" /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" placeholder="Add details about this material..."
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="rounded-xl resize-none" rows={2} />
        </div>

        <div className="space-y-2">
          <Label>File *</Label>
          <input ref={fileInputRef} type="file"
            onChange={handleFileSelect} className="hidden" />
          {selectedFile ? (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full h-24 rounded-xl border-dashed"
              onClick={() => fileInputRef.current?.click()}>
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to select file</span>
              </div>
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel} disabled={uploading}>Cancel</Button>
          <Button className="flex-1 rounded-xl bg-gradient-primary" onClick={handleUpload}
            disabled={uploading || !selectedFile || !title.trim()}>
            {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>)
              : (<><Upload className="w-4 h-4 mr-2" /> Upload</>)}
          </Button>
        </div>
      </div>
    </Card>
  );
}
