 import { useState, useEffect, useRef } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Megaphone, Plus, Trash2, Pin, Loader2, Image } from 'lucide-react';
 import { PageHeader } from '@/components/layout/PageHeader';
 import { Card } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Switch } from '@/components/ui/switch';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
 import { useAdmin } from '@/hooks/useAdmin';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { formatDistanceToNow } from 'date-fns';
 import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
 
 interface Announcement {
   id: string;
   title: string;
   content: string | null;
   image_url: string | null;
   is_pinned: boolean;
   created_at: string;
 }
 
 export default function AdminAnnouncements() {
   const navigate = useNavigate();
   const { isAdmin, loading: roleLoading } = useAdmin();
   const { user, loading: authLoading } = useAuth();
   const [announcements, setAnnouncements] = useState<Announcement[]>([]);
   const [loading, setLoading] = useState(true);
   const [showCreate, setShowCreate] = useState(false);
   const [title, setTitle] = useState('');
   const [content, setContent] = useState('');
   const [imageUrl, setImageUrl] = useState('');
   const [isPinned, setIsPinned] = useState(false);
   const [saving, setSaving] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [deleteId, setDeleteId] = useState<string | null>(null);
   const [deleting, setDeleting] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   useEffect(() => {
     if (!authLoading && !user) navigate('/auth');
     if (!roleLoading && !isAdmin) navigate('/');
   }, [user, isAdmin, authLoading, roleLoading, navigate]);
 
   useEffect(() => {
     if (isAdmin) fetchAnnouncements();
   }, [isAdmin]);
 
   const fetchAnnouncements = async () => {
     const { data } = await supabase
       .from('school_announcements')
       .select('*')
       .order('is_pinned', { ascending: false })
       .order('created_at', { ascending: false });
     
     setAnnouncements(data || []);
     setLoading(false);
   };
 
   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !user) return;
 
     if (!file.type.startsWith('image/')) {
       toast.error('Only images are allowed');
       return;
     }
 
     setUploading(true);
     const fileName = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
     
     const { error: uploadError } = await supabase.storage
       .from('announcements')
       .upload(fileName, file);
 
     if (uploadError) {
       toast.error('Failed to upload image');
       setUploading(false);
       return;
     }
 
     const { data: urlData } = supabase.storage
       .from('announcements')
       .getPublicUrl(fileName);
 
     setImageUrl(urlData.publicUrl);
     setUploading(false);
   };
 
   const createAnnouncement = async () => {
     if (!title.trim() || !user) {
       toast.error('Please enter a title');
       return;
     }
 
     setSaving(true);
     const { error } = await supabase.from('school_announcements').insert({
       title: title.trim(),
       content: content.trim() || null,
       image_url: imageUrl || null,
       is_pinned: isPinned,
       created_by: user.id,
     });
 
     if (error) {
       toast.error('Failed to create announcement');
     } else {
       toast.success('Announcement created!');
       setShowCreate(false);
       setTitle('');
       setContent('');
       setImageUrl('');
       setIsPinned(false);
       fetchAnnouncements();
     }
     setSaving(false);
   };
 
   const togglePin = async (id: string, currentPinned: boolean) => {
     await supabase
       .from('school_announcements')
       .update({ is_pinned: !currentPinned })
       .eq('id', id);
     
     fetchAnnouncements();
   };
 
   const handleDelete = async () => {
     if (!deleteId) return;
     setDeleting(true);
 
     const { error } = await supabase
       .from('school_announcements')
       .delete()
       .eq('id', deleteId);
 
     if (error) {
       toast.error('Failed to delete announcement');
     } else {
       toast.success('Announcement deleted');
       fetchAnnouncements();
     }
     setDeleting(false);
     setDeleteId(null);
   };
 
   if (authLoading || roleLoading || !isAdmin) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background">
       <PageHeader 
         title="School Announcements" 
         subtitle="Post memos and notices"
         showBack
       />
 
       <div className="px-4 py-4 space-y-4">
         <Button 
           className="w-full rounded-xl bg-gradient-primary"
           onClick={() => setShowCreate(true)}
         >
           <Plus className="w-4 h-4 mr-2" />
           New Announcement
         </Button>
 
         {loading ? (
           <div className="space-y-3">
             {[1, 2].map((i) => (
               <Card key={i} className="p-4 animate-pulse">
                 <div className="w-3/4 h-5 bg-muted rounded mb-2" />
                 <div className="w-full h-32 bg-muted rounded" />
               </Card>
             ))}
           </div>
         ) : announcements.length === 0 ? (
           <Card className="p-8 text-center">
             <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
             <h3 className="font-semibold text-lg mb-2">No announcements</h3>
             <p className="text-muted-foreground">Create your first school announcement</p>
           </Card>
         ) : (
           announcements.map((announcement) => (
             <Card key={announcement.id} className="shadow-soft overflow-hidden">
               {announcement.image_url && (
                 <img 
                   src={announcement.image_url} 
                   alt={announcement.title}
                   className="w-full h-48 object-cover"
                 />
               )}
               <div className="p-4">
                 <div className="flex items-start justify-between gap-2">
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       {announcement.is_pinned && (
                         <Badge variant="secondary" className="text-xs">
                           <Pin className="w-3 h-3 mr-1" />
                           Pinned
                         </Badge>
                       )}
                     </div>
                     <h3 className="font-semibold text-lg">{announcement.title}</h3>
                     {announcement.content && (
                       <p className="text-muted-foreground mt-1">{announcement.content}</p>
                     )}
                     <p className="text-xs text-muted-foreground mt-2">
                       {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                     </p>
                   </div>
                   <div className="flex gap-1">
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => togglePin(announcement.id, announcement.is_pinned)}
                     >
                       <Pin className={`w-4 h-4 ${announcement.is_pinned ? 'fill-current' : ''}`} />
                     </Button>
                     <Button
                       size="sm"
                       variant="ghost"
                       className="text-destructive"
                       onClick={() => setDeleteId(announcement.id)}
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               </div>
             </Card>
           ))
         )}
 
         {/* Create Dialog */}
         <Dialog open={showCreate} onOpenChange={setShowCreate}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>New Announcement</DialogTitle>
             </DialogHeader>
             
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label>Title *</Label>
                 <Input
                   placeholder="Announcement title"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   className="rounded-xl"
                 />
               </div>
               
               <div className="space-y-2">
                 <Label>Content (optional)</Label>
                 <Textarea
                   placeholder="Additional details..."
                   value={content}
                   onChange={(e) => setContent(e.target.value)}
                   className="rounded-xl"
                 />
               </div>
               
               <div className="space-y-2">
                 <Label>Image</Label>
                 <input
                   ref={fileInputRef}
                   type="file"
                   accept="image/*"
                   onChange={handleImageUpload}
                   className="hidden"
                 />
                 {imageUrl ? (
                   <div className="relative">
                     <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                     <Button
                       size="sm"
                       variant="destructive"
                       className="absolute top-2 right-2"
                       onClick={() => setImageUrl('')}
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 ) : (
                   <Button
                     variant="outline"
                     className="w-full h-24 rounded-xl border-dashed"
                     onClick={() => fileInputRef.current?.click()}
                     disabled={uploading}
                   >
                     {uploading ? (
                       <Loader2 className="w-6 h-6 animate-spin" />
                     ) : (
                       <div className="flex flex-col items-center gap-2">
                         <Image className="w-6 h-6 text-muted-foreground" />
                         <span className="text-sm text-muted-foreground">Upload image</span>
                       </div>
                     )}
                   </Button>
                 )}
               </div>
               
               <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                 <Label>Pin to top</Label>
                 <Switch checked={isPinned} onCheckedChange={setIsPinned} />
               </div>
             </div>
             
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowCreate(false)}>
                 Cancel
               </Button>
               <Button onClick={createAnnouncement} disabled={saving}>
                 {saving ? 'Creating...' : 'Create'}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
 
         <DeleteConfirmDialog
           open={!!deleteId}
           onOpenChange={(open) => !open && setDeleteId(null)}
           onConfirm={handleDelete}
           title="Delete this announcement?"
           description="This action cannot be undone."
           loading={deleting}
         />
       </div>
     </div>
   );
 }