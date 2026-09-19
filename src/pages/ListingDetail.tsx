import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, MessageCircle, Clock, AlertTriangle, ShieldAlert, ExternalLink, Eye } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { MARKETPLACE_CATEGORIES } from '@/lib/constants';
import { useContentView } from '@/hooks/useContentView';

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
  is_sold: boolean;
  is_sponsored?: boolean;
  likes_count: number;
  view_count: number;
  created_at: string;
  seller_id: string;
  whatsapp_link: string | null;
  short_id: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    is_anonymous: boolean;
  };
}

export default function ListingDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [showBuyWarning, setShowBuyWarning] = useState(false);

  useContentView('listing', listingId);

  useEffect(() => {
    if (listingId) {
      fetchListing();
      if (user) checkLikeStatus();
    }
  }, [listingId, user]);

  const fetchListing = async () => {
    const { data: listingData, error } = await supabase
      .from('listings').select('*').eq('id', listingId).single();

    if (error || !listingData) { navigate('/marketplace'); return; }

    const { data: profileData } = await supabase
      .from('profiles').select('user_id, full_name, avatar_url, is_anonymous')
      .eq('user_id', listingData.seller_id).single();

    setListing({ ...listingData, profiles: profileData || undefined });
    setLoading(false);
  };

  const checkLikeStatus = async () => {
    if (!user) return;
    const { data } = await supabase.from('listing_likes').select('id').eq('listing_id', listingId).eq('user_id', user.id).single();
    setHasLiked(!!data);
  };

  const handleLike = async () => {
    if (!user || !listing) { toast.error('Please sign in'); return; }
    if (listing.seller_id === user.id) { toast.error('You cannot like your own listing'); return; }

    if (hasLiked) {
      await supabase.from('listing_likes').delete().eq('listing_id', listing.id).eq('user_id', user.id);
      const { count } = await supabase.from('listing_likes').select('*', { count: 'exact', head: true }).eq('listing_id', listing.id);
      await supabase.from('listings').update({ likes_count: count || 0 }).eq('id', listing.id);
      setHasLiked(false);
      setListing(prev => prev ? { ...prev, likes_count: count || 0 } : null);
    } else {
      await supabase.from('listing_likes').insert({ listing_id: listing.id, user_id: user.id });
      const { count } = await supabase.from('listing_likes').select('*', { count: 'exact', head: true }).eq('listing_id', listing.id);
      await supabase.from('listings').update({ likes_count: count || 0 }).eq('id', listing.id);
      setHasLiked(true);
      setListing(prev => prev ? { ...prev, likes_count: count || 0 } : null);
    }
  };

  const handleBuyClick = () => {
    if (!user) { toast.error('Please sign in'); navigate('/auth'); return; }
    setShowBuyWarning(true);
  };

  const proceedToChat = () => {
    if (listing) navigate(`/chat/${listing.seller_id}`);
    setShowBuyWarning(false);
  };

  const proceedToWhatsApp = () => {
    if (listing?.whatsapp_link) {
      window.open(listing.whatsapp_link, '_blank');
    }
    setShowBuyWarning(false);
  };

  const getCategoryLabel = (value: string) => {
    return MARKETPLACE_CATEGORIES.find(c => c.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!listing) return null;

  const isOwnListing = listing.seller_id === user?.id;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Product Details" showBack />

      <div className="px-4 py-4 space-y-4">
        {/* Product Image - Point 22: Full image, no crop */}
        <Card className="overflow-hidden shadow-soft">
          <div className="bg-muted relative">
            {listing.image_url ? (
              <img src={listing.image_url} alt={listing.title} className="w-full object-contain max-h-[500px]" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center">
                <ShoppingBag className="w-20 h-20 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute top-3 right-3 flex gap-2">
              {listing.is_sponsored && <Badge className="bg-warning/90 text-warning-foreground">Sponsored</Badge>}
              <Badge className="bg-card/90 text-foreground">{getCategoryLabel(listing.category)}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4 shadow-soft">
          <h1 className="font-display text-xl font-bold text-foreground">{listing.title}</h1>
          <p className="text-3xl font-bold text-primary mt-2">₦{listing.price.toLocaleString()}</p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.view_count || 0} views</span>
            {listing.short_id && <span>ID: #{listing.short_id}</span>}
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2">Description</h3>
    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
      {listing.description.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>
        ) : part
      )}
    </p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-border">
                <AvatarImage src={listing.profiles?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {listing.profiles?.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{listing.profiles?.full_name || 'Seller'}</p>
                <p className="text-xs text-muted-foreground">Seller</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <button 
              onClick={handleLike} disabled={isOwnListing}
              className={`flex items-center gap-1.5 transition-colors ${isOwnListing ? 'text-muted-foreground/50 cursor-not-allowed' : hasLiked ? 'text-secondary' : 'text-muted-foreground hover:text-secondary'}`}
            >
              <Heart className={`w-5 h-5 ${hasLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{listing.likes_count}</span>
            </button>

            {!isOwnListing && !listing.is_sold && (
              <Button onClick={handleBuyClick} className="rounded-full bg-gradient-primary shadow-primary">
                <MessageCircle className="w-4 h-4 mr-2" /> Contact Seller
              </Button>
            )}
            {listing.is_sold && <Badge variant="destructive">Sold Out</Badge>}
          </div>
        </Card>
      </div>

      {/* Buy Warning Dialog - Points 15, 16 */}
      <Dialog open={showBuyWarning} onOpenChange={setShowBuyWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <ShieldAlert className="w-5 h-5" /> Safety Warning
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-semibold mb-1">⚠️ Do NOT send money directly to the seller!</p>
                    <p className="text-muted-foreground">
                      Money must be sent to the app. Payment will be released to the seller only after you confirm delivery. This protects both parties from scam.
                    </p>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>• Meet in a public place</li>
                  <li>• Inspect the item before confirming delivery</li>
                  <li>• Never pay through unknown links</li>
                  <li>• Report suspicious sellers to admin</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2">
            <Button variant="outline" onClick={() => setShowBuyWarning(false)}>Cancel</Button>
            <Button onClick={proceedToChat} className="bg-gradient-primary w-full">
              <MessageCircle className="w-4 h-4 mr-2" /> Chat In-App (Maximum Security)
            </Button>
            {listing?.whatsapp_link && (
              <Button onClick={proceedToWhatsApp} variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" /> Open WhatsApp Business
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
