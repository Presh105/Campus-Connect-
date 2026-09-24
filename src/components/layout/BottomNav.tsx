import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Megaphone, User, Briefcase, TrendingUp, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { icon: Home, label: 'Feed', path: '/' },
  { icon: Briefcase, label: 'Services', path: '/services' },
  { icon: ShoppingBag, label: 'Market', path: '/marketplace' },
  { icon: TrendingUp, label: 'Predict', path: '/predictions' },
  { icon: Megaphone, label: 'News', path: '/announcements' },
  { icon: Bell, label: 'Alerts', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-elevated">
      <div className="flex items-center justify-around px-1 py-2 pb-[env(safe-area-inset-bottom,8px)] max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          const isHome = path === '/' && location.pathname === '/';
          const active = isActive || isHome;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all duration-200 min-w-0 relative",
                active 
                  ? "text-primary bg-accent" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-4 h-4", active && "animate-scale-in")} />
                {path === '/notifications' && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-destructive-foreground font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
              </div>
              <span className="text-[8px] font-medium leading-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
      }
