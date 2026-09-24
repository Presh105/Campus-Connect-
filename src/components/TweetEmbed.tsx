import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (el?: HTMLElement) => void;
        createTweet: (id: string, el: HTMLElement, opts?: Record<string, unknown>) => Promise<unknown>;
      };
    };
  }
}

let widgetsScriptPromise: Promise<void> | null = null;

function loadTwitterWidgetsScript(): Promise<void> {
  if (window.twttr) return Promise.resolve();
  if (widgetsScriptPromise) return widgetsScriptPromise;
  widgetsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('twitter-widgets-js');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'twitter-widgets-js';
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load X/Twitter embed script'));
    document.body.appendChild(script);
  });
  return widgetsScriptPromise;
}

function extractTweetId(url: string): string | null {
  const match = url.match(/status(?:es)?\/(\d+)/);
  return match ? match[1] : null;
}

interface TweetEmbedProps {
  url: string;
}

// Renders a real X/Twitter post using X's own official embed widget
// (not a third-party proxy, which can go down or get blocked).
export function TweetEmbed({ url }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const tweetId = extractTweetId(url);

  useEffect(() => {
    let cancelled = false;
    if (!tweetId || !containerRef.current) { setStatus('error'); return; }

    setStatus('loading');
    containerRef.current.innerHTML = '';

    loadTwitterWidgetsScript()
      .then(() => {
        if (cancelled || !window.twttr || !containerRef.current) return;
        return window.twttr.widgets.createTweet(tweetId, containerRef.current, {
          theme: 'light',
          dnt: true,
        });
      })
      .then((el) => {
        if (cancelled) return;
        setStatus(el ? 'ready' : 'error');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => { cancelled = true; };
  }, [url, tweetId]);

  if (!tweetId) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/70 text-sm p-4 text-center">
        Couldn't read this X/Twitter link.
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-white flex items-start justify-center p-2">
      <div ref={containerRef} className="w-full max-w-[550px]" />
      {status === 'loading' && (
        <p className="absolute inset-x-0 top-4 text-center text-xs text-muted-foreground">Loading post…</p>
      )}
      {status === 'error' && (
        <p className="absolute inset-x-0 top-4 text-center text-xs text-destructive px-4">
          This post couldn't be loaded (it may have been deleted, made private, or X is blocking embeds right now).
        </p>
      )}
    </div>
  );
      }
