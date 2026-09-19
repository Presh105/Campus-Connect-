import { useState, useEffect } from 'react';
import { AlertTriangle, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Rule {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  display_locations: string[];
}

interface RulesBannerProps {
  location: 'feed' | 'marketplace' | 'tasks' | 'events' | 'predictions' | 'chat' | 'groups' | 'announcements';
}

export function RulesBanner({ location }: RulesBannerProps) {
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    fetchRules();
  }, [location]);

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('pinned_rules')
      .select('id, title, content, is_active, display_locations')
      .eq('is_active', true)
      .contains('display_locations', [location]);

    if (!error && data) {
      setRules(data);
    }
  };

  if (rules.length === 0) return null;

  return (
    <div className="mx-4 mb-4 space-y-2">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-warning/20 to-warning/5 border border-warning/30 shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              {rule.title}
            </h4>
            <p className="text-sm text-foreground/80 mt-1 leading-relaxed whitespace-pre-wrap">
              {rule.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
