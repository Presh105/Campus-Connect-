import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Eye, EyeOff, AlertTriangle, Wallet, Video } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { Input } from '@/components/ui/input';
import { detectAndEmbed } from '@/lib/videoEmbed';
import { useBanCheck } from '@/hooks/useBanCheck';

function extractTitle(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^(.+?[.!?])\s/);
  if (match) return match[1].slice(0, 200);
  const firstLine = trimmed.split('\n')[0];
  return firstLine.slice(0, 200);
}

export default function CreatePost() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { isBanned, loading: banLoading } = useBanCheck('posts');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');
  const videoEmbed = videoPreviewUrl ? detectAndEmbed(videoPreviewUrl) : null;
  const [payoutMethod, setPayoutMethod] = useState<'mtn' | 'glo' | 'airtel' | 'cash'>('mtn');

  const containsLinks = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|org|net|edu|gov|io|co|me|app|dev)[^\s]*)/gi;
    return urlPattern.test(text);
  };
  const hasLinks = containsLinks(content);

  useEffect(() => {
    if (!banLoading && isBanned) { toast.error('You are banned from creating posts'); navigate('/'); }
  }, [isBanned, banLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please sign in to create a post'); return; }
    if (!content.trim()) { toast.error('Please write something to share'); return; }
    if (hasLinks && !isAdmin) { toast.error('Links are not allowed in posts. Only admins can post links.'); return; }
    setLoading(true);
    if (!isAdmin) {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { count } = await supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since.toISOString());
      // Note: points are only awarded for the first 5 posts/day (handled by DB trigger). Posting afterwards is allowed but unrewarded.
      if ((count || 0) >= 5) { toast.message('Heads up: you\'ve hit your 5-post points cap for today. This post will still go live, just no points added.'); }
    }
    const title = extractTitle(content);
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      title,
      content: content.trim(),
      is_anonymous: isAnonymous,
      image_url: imageUrl || null,
      has_links: hasLinks,
      approval_status: 'approved',
      payout_method: payoutMethod,
    } as any);
    if (error) { toast.error('Failed to create post'); if (import.meta.env.DEV) console.error(error); }
    else { toast.success('Post created successfully!'); navigate('/'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Create Post" subtitle="Share with your community" showBack />
      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {hasLinks && !isAdmin && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>Links are not allowed in posts. Only administrators can post links.</AlertDescription>
            </Alert>
          )}
          <Card className="p-4 shadow-soft">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content" className="font-bold text-foreground">What's on your mind?</Label>
                <Textarea id="content" placeholder="Write your post here..." value={content} onChange={(e) => setContent(e.target.value)} maxLength={10000} className="rounded-xl min-h-[200px] resize-none" />
                <p className="text-xs text-muted-foreground">The first sentence will be used as the post headline.</p>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-foreground">Image (optional)</Label>
                {user && <ImageUpload bucket="posts" userId={user.id} onUpload={(url) => setImageUrl(url)} />}
              </div>

              <div className="space-y-2 p-3 bg-muted/40 border border-dashed border-border rounded-xl">
                <Label className="font-bold text-foreground flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Try a video embed (preview only)</Label>
                <p className="text-xs text-muted-foreground">
                  Paste any YouTube, TikTok, Instagram, Facebook or X link to see how it would look embedded. We auto-detect the platform and play it without leaving Connect.
                  Embedded videos here are <strong>preview-only</strong> and do <strong>not earn points</strong>. To turn videos into a points reward, the admin posts them in <em>Services → Watch &amp; Earn Session</em>.
                </p>
                <Input value={videoPreviewUrl} onChange={(e) => setVideoPreviewUrl(e.target.value)} placeholder="https://youtube.com/... or tiktok / ig / fb / x link" className="rounded-xl" />
                {videoEmbed && videoEmbed.platform !== 'unknown' && (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe src={videoEmbed.embedUrl} title="preview" className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                  </div>
                )}
                {videoEmbed && videoEmbed.platform === 'unknown' && videoPreviewUrl && (
                  <p className="text-[11px] text-destructive">Unsupported link — use YouTube, TikTok, Instagram, Facebook, or X.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-foreground flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Reward payout method</Label>
                <Select value={payoutMethod} onValueChange={(v) => setPayoutMethod(v as any)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN airtime</SelectItem>
                    <SelectItem value="glo">GLO airtime</SelectItem>
                    <SelectItem value="airtel">Airtel airtime</SelectItem>
                    <SelectItem value="cash">Cash (slower)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">If your post gets monetized, you'll receive your reward in this form. Cash payouts take longer.</p>
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-muted rounded-xl">
                <div className="flex items-center gap-3">
                  {isAnonymous ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-primary" />}
                  <div>
                    <p className="font-bold text-foreground">Post Anonymously</p>
                    <p className="text-xs text-muted-foreground">{isAnonymous ? 'Your identity will be hidden' : 'Everyone can see your name'}</p>
                  </div>
                </div>
                <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
              </div>
            </div>
          </Card>
          <Button type="submit" disabled={loading || (hasLinks && !isAdmin)} className="w-full h-12 rounded-xl bg-gradient-primary shadow-primary font-bold">
            <Send className="w-4 h-4 mr-2" /> {loading ? 'Publishing...' : 'Publish Post'}
          </Button>
        </form>
      </div>
    </div>
  );
}

