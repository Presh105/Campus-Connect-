import { supabase } from '@/integrations/supabase/client';

export async function notifyUser(
  targetUserId: string,
  title: string,
  message: string,
  type: string,
  referenceId?: string,
  referenceType?: string
) {
  await supabase.from('notifications').insert({
    user_id: targetUserId,
    title,
    message,
    type,
    reference_id: referenceId || null,
    reference_type: referenceType || null,
  });
}

export async function notifyPostOwner(
  postId: string,
  actorUserId: string,
  actorName: string | null,
  isAnonymous: boolean,
  action: string // 'commented on' | 'voted on' | 'liked'
) {
  // Get the post owner
  const { data: post } = await supabase
    .from('posts')
    .select('user_id, title')
    .eq('id', postId)
    .single();

  if (!post || post.user_id === actorUserId) return; // Don't notify self

  const who = isAnonymous ? 'Someone' : actorName || 'A member';
  const shortTitle = post.title.length > 50 ? post.title.substring(0, 50) + '...' : post.title;

  await notifyUser(
    post.user_id,
    `${who} ${action} your post`,
    `"${shortTitle}"`,
    action.includes('comment') ? 'comment' : action.includes('vote') ? 'vote' : 'like',
    postId,
    'post'
  );
}
