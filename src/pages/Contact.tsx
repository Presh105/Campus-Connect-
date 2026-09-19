import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Globe, FileText, Shield, MessageCircle, ExternalLink } from 'lucide-react';

interface ContactItem {
  id: string;
  type: string;
  title: string;
  content: string;
  purpose: string | null;
  duration: string | null;
  is_active: boolean;
}

export default function Contact({ embedded }: { embedded?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminProfiles, setAdminProfiles] = useState<{ user_id: string; full_name: string; system_id: string | null }[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from('contact_info').select('*').eq('is_active', true).order('sort_order', { ascending: true });
      setItems(data || []);
      setLoading(false);
    };
    fetchItems();
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').in('role', ['admin', 'moderator']);
    if (roles && roles.length > 0) {
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('user_id, full_name, system_id').in('user_id', userIds);
      setAdminProfiles(profiles || []);
    }
  };

  const [paymentInstructions, setPaymentInstructions] = useState<string | null>(null);
  useEffect(() => {
    const fetchInstructions = async () => {
      const { data } = await supabase
        .from('app_messages').select('content')
        .eq('type', 'payment_instruction').eq('is_active', true)
        .order('created_at', { ascending: false }).limit(1).single();
      if (data) setPaymentInstructions(data.content);
    };
    fetchInstructions();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment_account': return CreditCard;
      case 'social_link': return Globe;
      case 'instruction': return FileText;
      default: return Shield;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'payment_account': return 'Payment Account';
      case 'social_link': return 'Social Link';
      case 'instruction': return 'Instructions';
      default: return type;
    }
  };

  const isClickableLink = (content: string) => {
    return /^https?:\/\//i.test(content.trim()) || /^wa\.me\//i.test(content.trim());
  };

  const getFullUrl = (content: string) => {
    const trimmed = content.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^wa\.me\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  };

  const content = (
    <div className="px-4 py-4 space-y-4">
        {/* Payment instructions */}
        {paymentInstructions && (
          <Card className="p-4 bg-warning/10 border-warning/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground text-sm">⚠️ Read Before Making Payment</h4>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{paymentInstructions}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Contact Admin/Moderator Section */}
        {adminProfiles.length > 0 && (
          <Card className="p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Contact Admin/Moderator</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Reach out to an admin via in-app chat or WhatsApp for support.</p>
            <div className="space-y-2">
              {adminProfiles.map(admin => (
                <div key={admin.user_id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <div>
                    <p className="font-medium text-sm">{admin.full_name}</p>
                    {admin.system_id && <p className="text-xs text-muted-foreground">{admin.system_id}</p>}
                  </div>
                  <Button size="sm" variant="outline" className="rounded-full"
                    onClick={() => navigate(`/chat/private/${admin.user_id}`)}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Card key={i} className="p-4 animate-pulse"><div className="w-3/4 h-5 bg-muted rounded" /></Card>)}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No contact information yet</h3>
            <p className="text-muted-foreground">Admin will add payment accounts and links here.</p>
          </Card>
        ) : (
          items.map(item => {
            const Icon = getIcon(item.type);
            const linkable = isClickableLink(item.content);
            return (
              <Card key={item.id} className="p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <Badge variant="outline" className="text-xs">{getTypeLabel(item.type)}</Badge>
                    </div>
                    {linkable ? (
                      <a href={getFullUrl(item.content)} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1 break-all">
                        {item.content} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{item.content}</p>
                    )}
                    {item.purpose && <p className="text-xs text-muted-foreground mt-2"><strong>Purpose:</strong> {item.purpose}</p>}
                    {item.duration && <p className="text-xs text-muted-foreground"><strong>Duration:</strong> {item.duration}</p>}
                  </div>
                </div>
              </Card>
            );
          })
        )}
    </div>
  );

  if (embedded) return content;

  return (
    <AppLayout>
      <PageHeader title="Contact & Payment" subtitle="Official payment accounts & links" showBack />
      {content}
    </AppLayout>
  );
}
