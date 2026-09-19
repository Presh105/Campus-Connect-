 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Ban, Search, User, X } from 'lucide-react';
 import { PageHeader } from '@/components/layout/PageHeader';
 import { Card } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Checkbox } from '@/components/ui/checkbox';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
 import { Textarea } from '@/components/ui/textarea';
 import { useAdmin } from '@/hooks/useAdmin';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { formatDistanceToNow } from 'date-fns';
 
 interface Profile {
   user_id: string;
   full_name: string;
   department: string;
   level: string;
 }
 
 interface BanRecord {
   id: string;
   user_id: string;
   banned_from: string;
   reason: string | null;
   created_at: string;
 }
 
 const BAN_OPTIONS = [
   { value: 'posts', label: 'Creating Posts' },
   { value: 'tasks', label: 'Creating/Accepting Tasks' },
   { value: 'listings', label: 'Creating Listings' },
   { value: 'events', label: 'Creating Events' },
   { value: 'games', label: 'Playing Games' },
   { value: 'predictions', label: 'Making Predictions' },
   { value: 'chat', label: 'Private Messaging' },
 ];
 
 export default function AdminUserBans() {
   const navigate = useNavigate();
   const { isAdmin, loading: roleLoading } = useAdmin();
   const { user, loading: authLoading } = useAuth();
   const [searchQuery, setSearchQuery] = useState('');
   const [profiles, setProfiles] = useState<Profile[]>([]);
   const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
   const [userBans, setUserBans] = useState<BanRecord[]>([]);
   const [selectedBans, setSelectedBans] = useState<string[]>([]);
   const [banReason, setBanReason] = useState('');
   const [loading, setLoading] = useState(false);
   const [saving, setSaving] = useState(false);
 
   useEffect(() => {
     if (!authLoading && !user) navigate('/auth');
     if (!roleLoading && !isAdmin) navigate('/');
   }, [user, isAdmin, authLoading, roleLoading, navigate]);
 
   const searchUsers = async (query: string) => {
     if (query.length < 2) {
       setProfiles([]);
       return;
     }
     
     setLoading(true);
     const { data } = await supabase
       .from('profiles')
       .select('user_id, full_name, department, level')
       .ilike('full_name', `%${query}%`)
       .limit(10);
     
     setProfiles(data || []);
     setLoading(false);
   };
 
   const fetchUserBans = async (userId: string) => {
     const { data } = await supabase
       .from('user_bans')
       .select('*')
       .eq('user_id', userId);
     
     setUserBans(data || []);
     setSelectedBans(data?.map(b => b.banned_from) || []);
   };
 
   const selectUser = async (profile: Profile) => {
     setSelectedUser(profile);
     await fetchUserBans(profile.user_id);
   };
 
   const toggleBan = (banType: string) => {
     setSelectedBans(prev => 
       prev.includes(banType) 
         ? prev.filter(b => b !== banType)
         : [...prev, banType]
     );
   };
 
   const saveBans = async () => {
     if (!selectedUser || !user) return;
     
     setSaving(true);
     
     // Remove old bans
     await supabase
       .from('user_bans')
       .delete()
       .eq('user_id', selectedUser.user_id);
     
     // Add new bans
     if (selectedBans.length > 0) {
       const bansToInsert = selectedBans.map(ban => ({
         user_id: selectedUser.user_id,
         banned_from: ban,
         reason: banReason || null,
         banned_by: user.id,
       }));
       
       const { error } = await supabase.from('user_bans').insert(bansToInsert);
       
       if (error) {
         toast.error('Failed to save bans');
         setSaving(false);
         return;
       }
     }
     
     toast.success('User restrictions updated');
     setSaving(false);
     setSelectedUser(null);
     setBanReason('');
     setSelectedBans([]);
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
         title="User Restrictions" 
         subtitle="Ban users from specific features"
         showBack
       />
 
       <div className="px-4 py-4 space-y-4">
         {/* Search */}
         <Card className="p-4 shadow-soft">
           <Label className="mb-2 block">Search for a user to manage restrictions</Label>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search by name..."
               value={searchQuery}
               onChange={(e) => {
                 setSearchQuery(e.target.value);
                 searchUsers(e.target.value);
               }}
               className="pl-10 rounded-xl"
             />
           </div>
           
           {loading && (
             <div className="mt-4 text-center text-muted-foreground">Searching...</div>
           )}
           
           {profiles.length > 0 && (
             <div className="mt-4 space-y-2">
               {profiles.map((profile) => (
                 <Card 
                   key={profile.user_id} 
                   className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                   onClick={() => selectUser(profile)}
                 >
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                       <User className="w-5 h-5 text-muted-foreground" />
                     </div>
                     <div>
                       <p className="font-medium">{profile.full_name}</p>
                       <p className="text-xs text-muted-foreground">
                         {profile.department.replace('_', ' ')} • Level {profile.level}
                       </p>
                     </div>
                   </div>
                 </Card>
               ))}
             </div>
           )}
         </Card>
 
         {/* Ban Dialog */}
         <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
           <DialogContent className="max-w-md">
             <DialogHeader>
               <DialogTitle>Manage Restrictions for {selectedUser?.full_name}</DialogTitle>
             </DialogHeader>
             
             <div className="py-4 space-y-4">
               <p className="text-sm text-muted-foreground">
                 Select features to ban this user from:
               </p>
               
               <div className="space-y-3">
                 {BAN_OPTIONS.map((option) => (
                   <div 
                     key={option.value} 
                     className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50"
                   >
                     <Checkbox
                       id={option.value}
                       checked={selectedBans.includes(option.value)}
                       onCheckedChange={() => toggleBan(option.value)}
                     />
                     <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                       {option.label}
                     </Label>
                   </div>
                 ))}
               </div>
               
               <div className="space-y-2">
                 <Label>Reason (optional)</Label>
                 <Textarea
                   placeholder="Why are you banning this user?"
                   value={banReason}
                   onChange={(e) => setBanReason(e.target.value)}
                 />
               </div>
             </div>
             
             <DialogFooter>
               <Button variant="outline" onClick={() => setSelectedUser(null)}>
                 Cancel
               </Button>
               <Button onClick={saveBans} disabled={saving}>
                 {saving ? 'Saving...' : 'Save Restrictions'}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
     </div>
   );
 }