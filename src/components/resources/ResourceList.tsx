import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Trash2, Image as ImageIcon, File, ChevronLeft, Search, ChevronRight, FolderOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { DEPARTMENTS_ALPHABETICAL, LEVELS, SEMESTERS } from '@/lib/constants';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string;
  download_count: number;
  created_at: string;
  uploader_id: string;
  department: string | null;
  level: string | null;
  semester: string | null;
}

type View =
  | { kind: 'departments' }
  | { kind: 'levels'; department: string }
  | { kind: 'semesters'; department: string; level: string }
  | { kind: 'files'; department: string; level: string; semester: string };

export function ResourceList() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<View>({ kind: 'departments' });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('academic_resources').select('*').order('created_at', { ascending: false });
    if (!error && data) setResources(data as any);
    setLoading(false);
  };

  const handleDownload = async (r: Resource) => {
    await supabase.from('academic_resources')
      .update({ download_count: (r.download_count || 0) + 1 }).eq('id', r.id);
    setResources(prev => prev.map(x => x.id === r.id ? { ...x, download_count: (x.download_count || 0) + 1 } : x));
    window.open(r.file_url, '_blank');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('academic_resources').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); setResources(prev => prev.filter(r => r.id !== deleteId)); }
    setDeleteId(null);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  // Filter departments by search
  const filteredDepts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DEPARTMENTS_ALPHABETICAL;
    return DEPARTMENTS_ALPHABETICAL.filter(d => d.label.toLowerCase().includes(q));
  }, [search]);

  const countFor = (filter: (r: Resource) => boolean) => resources.filter(filter).length;

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => (
      <Card key={i} className="p-4 animate-pulse h-16" />))}
    </div>;
  }

  // Files view
  if (view.kind === 'files') {
    const files = resources.filter(r =>
      r.department === view.department && r.level === view.level && r.semester === view.semester);
    const deptLabel = DEPARTMENTS_ALPHABETICAL.find(d => d.value === view.department)?.label || view.department;
    const semLabel = SEMESTERS.find(s => s.value === view.semester)?.label || view.semester;
    return (
      <>
        <Button variant="ghost" size="sm" className="mb-3"
          onClick={() => setView({ kind: 'semesters', department: view.department, level: view.level })}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="text-sm text-muted-foreground mb-3">{deptLabel} • {view.level} Level • {semLabel}</p>
        {files.length === 0 ? (
          <Card className="p-8 text-center">
            <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No materials here yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {files.map(r => (
              <Card key={r.id} className="p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {getFileIcon(r.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{r.title}</h4>
                    {r.description && <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>}
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Download className="w-3 h-3" />{r.download_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleDownload(r)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    {(isAdmin || r.uploader_id === user?.id) && (
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => setDeleteId(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        <DeleteConfirmDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
          onConfirm={handleDelete} title="Delete this resource?" description="This cannot be undone." loading={deleting} />
      </>
    );
  }

  // Semesters view
  if (view.kind === 'semesters') {
    const deptLabel = DEPARTMENTS_ALPHABETICAL.find(d => d.value === view.department)?.label || view.department;
    return (
      <>
        <Button variant="ghost" size="sm" className="mb-3"
          onClick={() => setView({ kind: 'levels', department: view.department })}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="text-sm text-muted-foreground mb-3">{deptLabel} • {view.level} Level</p>
        <div className="space-y-2">
          {SEMESTERS.map(s => {
            const n = countFor(r => r.department === view.department && r.level === view.level && r.semester === s.value);
            return (
              <Card key={s.value} className="p-4 cursor-pointer shadow-soft hover:shadow-elevated transition-shadow"
                onClick={() => setView({ kind: 'files', department: view.department, level: view.level, semester: s.value })}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{n}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  }

  // Levels view
  if (view.kind === 'levels') {
    const deptLabel = DEPARTMENTS_ALPHABETICAL.find(d => d.value === view.department)?.label || view.department;
    return (
      <>
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => setView({ kind: 'departments' })}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <p className="text-sm text-muted-foreground mb-3">{deptLabel}</p>
        <div className="space-y-2">
          {LEVELS.map(l => {
            const n = countFor(r => r.department === view.department && r.level === l.value);
            return (
              <Card key={l.value} className="p-4 cursor-pointer shadow-soft hover:shadow-elevated transition-shadow"
                onClick={() => setView({ kind: 'semesters', department: view.department, level: l.value })}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{n}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  }

  // Departments view
  return (
    <>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search department..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-full" />
      </div>
      <div className="space-y-2">
        {filteredDepts.map(d => {
          const n = countFor(r => r.department === d.value);
          return (
            <Card key={d.value} className="p-4 cursor-pointer shadow-soft hover:shadow-elevated transition-shadow"
              onClick={() => setView({ kind: 'levels', department: d.value })}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.label}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{n}</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          );
        })}
        {filteredDepts.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">No department matches your search.</Card>
        )}
      </div>
    </>
  );
}
