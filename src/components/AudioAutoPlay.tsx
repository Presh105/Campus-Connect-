import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

export function AudioAutoPlay() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    return localStorage.getItem('audio_permission') === 'granted';
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const fetchAudio = async () => {
      const { data } = await supabase
        .from('audio_clips')
        .select('audio_url')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setAudioUrl(data[0].audio_url);
        const perm = localStorage.getItem('audio_permission');
        if (perm === 'granted') {
          // Auto-play on interaction
          playAudio(data[0].audio_url);
        } else if (perm !== 'denied') {
          setShowPrompt(true);
        }
      }
    };
    fetchAudio();
  }, []);

  const playAudio = (url: string) => {
    if (played) return;
    const audio = new Audio(url);
    audio.volume = 0.3;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().then(() => {
        setPlayed(true);
        cleanup();
      }).catch(() => {});
    };

    tryPlay();

    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    const handleInteraction = () => {
      if (!played) tryPlay();
    };

    const cleanup = () => {
      events.forEach(evt => document.removeEventListener(evt, handleInteraction));
    };

    events.forEach(evt => {
      document.addEventListener(evt, handleInteraction, { once: false, passive: true });
    });

    setTimeout(cleanup, 60000);
  };

  const handleAllow = () => {
    localStorage.setItem('audio_permission', 'granted');
    setHasPermission(true);
    setShowPrompt(false);
    if (audioUrl) playAudio(audioUrl);
  };

  const handleDeny = () => {
    localStorage.setItem('audio_permission', 'denied');
    setHasPermission(false);
    setShowPrompt(false);
  };

  if (showPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-border rounded-2xl shadow-lg p-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <Volume2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Enable App Audio?</p>
            <p className="text-xs text-muted-foreground mt-1">Connect plays a short welcome sound when you open the app.</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="rounded-full" onClick={handleAllow}>
                <Volume2 className="w-3.5 h-3.5 mr-1" /> Allow
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={handleDeny}>
                <VolumeX className="w-3.5 h-3.5 mr-1" /> No thanks
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
