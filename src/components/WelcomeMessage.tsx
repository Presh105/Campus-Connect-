import { useState, useEffect } from 'react';
import { X, Megaphone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function WelcomeMessage() {
  const { user } = useAuth();
  const [message, setMessage] = useState<{ id: string; title: string; content: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchWelcome = async () => {
      const { data } = await supabase
        .from('app_messages')
        .select('id, title, content')
        .eq('type', 'welcome')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        const dismissedId = sessionStorage.getItem('dismissed_welcome');
        if (dismissedId !== data.id) {
          setMessage(data);
        }
      }
    };
    fetchWelcome();
  }, [user]);

  if (!message || dismissed) return null;

  return (
    <Card className="mx-4 mt-2 p-4 bg-primary/5 border-primary/20">
      <div className="flex items-start gap-3">
        <Megaphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-sm">{message.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{message.content}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 w-6 h-6"
          onClick={() => {
            sessionStorage.setItem('dismissed_welcome', message.id);
            setDismissed(true);
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
