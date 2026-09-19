import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Music, Plus, Trash2, Upload } from 'lucide-react';

interface AudioClip {
  id: string;
  title: string;
  audio_url: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminAudio() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!roleLoading && !isAdmin) navigate('/');
  }, [user, isAdmin, authLoading, roleLoading]);

  useEffect(() => { fetchClips(); }, []);

  const fetchClips = async () => {
    const { data } = await supabase.from('audio_clips').select('*').order('created_at', { ascending: false });
    if (data) setClips(data as AudioClip[]);
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !user) return;
    
    // Validate duration (15-30s)
    const audio = new Audio(URL.createObjectURL(file));
    await new Promise(resolve => { audio.onloadedmetadata = resolve; });
    if (audio.duration < 10 || audio.duration > 35) {
      toast.error('Audio must be between 15-30 seconds');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from('audio-clips').upload(path, file);
    if (uploadError) { toast.error('Upload failed'); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('audio-clips').getPublicUrl(path);
    
    // Deactivate all existing clips first
    await supabase.from('audio_clips').update({ is_active: false } as any).neq('id', '00000000-0000-0000-0000-000000000000');

    const { error } = await supabase.from('audio_clips').insert({
      title: title.trim(),
      audio_url: urlData.publicUrl,
      is_active: true,
      created_by: user.id,
    } as any);

    if (error) toast.error('Failed to save');
    else { toast.success('Audio clip added & activated!'); setTitle(''); setFile(null); setShowAdd(false); fetchClips(); }
    setUploading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (!current) {
      // Deactivate all, then activate this one
      await supabase.from('audio_clips').update({ is_active: false } as any).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    await supabase.from('audio_clips').update({ is_active: !current } as any).eq('id', id);
    toast.success(!current ? 'Activated' : 'Deactivated');
    fetchClips();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('audio_clips').delete().eq('id', id);
    toast.success('Deleted');
    fetchClips();
  };

  if (authLoading || roleLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Audio Manager" subtitle="Upload auto-play audio clips (15-30s)" showBack />
      <div className="px-4 py-4 space-y-4">
        {!showAdd ? (
          <Button onClick={() => setShowAdd(true)} className="w-full rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Upload Audio Clip
          </Button>
        ) : (
          <Card className="p-4 space-y-3 border-primary/20">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Welcome Jingle" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Audio File (15-30 seconds, MP3/WAV) *</Label>
              <Input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} className="rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()} className="flex-1 rounded-xl">
                <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload & Activate'}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} className="rounded-xl">Cancel</Button>
            </div>
          </Card>
        )}

        {clips.map(clip => (
          <Card key={clip.id} className="p-4">
            <div className="flex items-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{clip.title}</h3>
                <audio controls src={clip.audio_url} className="w-full mt-1 h-8" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={clip.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}>
                  {clip.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleActive(clip.id, clip.is_active)}>
                    {clip.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => handleDelete(clip.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {clips.length === 0 && (
          <Card className="p-8 text-center">
            <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No audio clips yet</p>
          </Card>
        )}
      </div>
    </div>
  );
}
