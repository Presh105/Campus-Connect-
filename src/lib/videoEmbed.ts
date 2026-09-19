// Convert a pasted social video URL into a platform + embeddable URL.
export type EmbedPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'x' | 'telegram' | 'unknown';

export interface EmbedInfo { platform: EmbedPlatform; embedUrl: string; canEmbed: boolean; }

export function detectAndEmbed(raw: string): EmbedInfo {
  const url = (raw || '').trim();
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // YouTube
    if (host.includes('youtube.com') || host === 'youtu.be') {
      let id = '';
      if (host === 'youtu.be') id = u.pathname.slice(1);
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
      else id = u.searchParams.get('v') || '';
      if (id) return { platform: 'youtube', embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`, canEmbed: true };
    }

    // TikTok — official embed widget
    if (host.includes('tiktok.com')) {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return { platform: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}?lang=en`, canEmbed: true };
      return { platform: 'tiktok', embedUrl: url, canEmbed: false };
    }

    // Instagram — /embed works for reels and posts when path is /reel/{id} or /p/{id}
    if (host.includes('instagram.com')) {
      const clean = u.pathname.replace(/\/+$/, '');
      const m = clean.match(/^\/(reel|p|tv)\/([^/]+)/);
      if (m) return { platform: 'instagram', embedUrl: `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned`, canEmbed: true };
      return { platform: 'instagram', embedUrl: url, canEmbed: false };
    }

    // Facebook — official plugin
    if (host.includes('facebook.com') || host.includes('fb.watch')) {
      const enc = encodeURIComponent(url);
      return { platform: 'facebook', embedUrl: `https://www.facebook.com/plugins/video.php?href=${enc}&show_text=false&autoplay=false`, canEmbed: true };
    }

    // X / Twitter — use platform widget via twitframe (works for tweets containing video)
    if (host.includes('twitter.com') || host.includes('x.com')) {
      const enc = encodeURIComponent(url.replace('x.com', 'twitter.com'));
      return { platform: 'x', embedUrl: `https://twitframe.com/show?url=${enc}`, canEmbed: true };
    }

    // Telegram — official embed via ?embed=1
    if (host === 't.me' || host.endsWith('.t.me')) {
      const sep = u.search ? '&' : '?';
      return { platform: 'telegram', embedUrl: `${url}${sep}embed=1&mode=tme`, canEmbed: true };
    }
  } catch { /* fallthrough */ }
  return { platform: 'unknown', embedUrl: url, canEmbed: false };
}
