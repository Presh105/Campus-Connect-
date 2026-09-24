/**
 * Feed Algorithm
 * Combines engagement ranking with randomization and recency
 */

interface PostForScoring {
  id: string;
  created_at: string;
  comments_count: number;
  view_count: number;
  likes_yes: number;
  likes_no: number;
  profiles?: { points?: number };
}

function getRecencyScore(createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  // Exponential decay: newer posts score higher
  return Math.max(0, 100 * Math.exp(-ageHours / 24));
}

function getEngagementScore(post: PostForScoring): number {
  const totalVotes = (post.likes_yes || 0) + (post.likes_no || 0);
  return (post.comments_count || 0) * 3 + totalVotes * 2 + (post.view_count || 0) * 0.1;
}

// How active the poster is on the site overall — posting, voting, and
// commenting all earn points elsewhere in the app, so this reuses that
// existing points total rather than tracking a second activity metric.
// log-scaled so a highly active member gets a real but bounded boost —
// it can't let one super-active account dominate the whole feed.
function getAuthorActivityBoost(post: PostForScoring): number {
  const points = post.profiles?.points || 0;
  return 1 + Math.log10(points + 1) * 0.15;
}

export function scoreAndSortPosts<T extends PostForScoring>(
  posts: T[],
  addRandomness = true
): T[] {
  const scored = posts.map(post => {
    const recency = getRecencyScore(post.created_at);
    const engagement = getEngagementScore(post);
    const activityBoost = getAuthorActivityBoost(post);
    const random = addRandomness ? Math.random() * 15 : 0;
    const score = (recency * 0.4 + engagement * 0.5) * activityBoost + random;
    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.post);
}

/**
 * Save and restore feed scroll position
 */
const SCROLL_KEY = 'feed_scroll_position';

export function saveFeedScrollPosition(position: number) {
  sessionStorage.setItem(SCROLL_KEY, String(position));
}

export function restoreFeedScrollPosition(): number {
  const saved = sessionStorage.getItem(SCROLL_KEY);
  return saved ? parseInt(saved, 10) : 0;
}

export function clearFeedScrollPosition() {
  sessionStorage.removeItem(SCROLL_KEY);
}
