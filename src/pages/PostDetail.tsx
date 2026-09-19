import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Clock, User, Send, Trash2, Reply, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { notifyPostOwner } from '@/hooks/useNotify';
import { PageHeader } from '@/components/layout/PageHeader';
import { CopyableId } from '@/components/CopyableId';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { DEPARTMENTS } from '@/lib/constants';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';

interface Post {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  image_urls: string[] | null;
  is_anonymous: boolean;
  comments_count: number;
  view_count: number;
  created_at: string;
  user_id: string;
  short_id: string | null;
  profiles?: {
    full_name: string;
    department: string;
    avatar_url: string | null;
    is_anonymous: boolean;
    system_id: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_anonymous: boolean;
  image_url: string | null;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    is_anonymous: boolean;
    system_id: string | null;
  };
}

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isAdmin } = useAdmin();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [uniqueCommenters, setUniqueCommenters] = useState(0);
  const [voteData, setVoteData] = useState<{ yes: number; no: number; userVote: boolean | null }>({ yes: 0, no: 0, userVote: null });

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
      incrementViewCount();
      fetchVotes();
    }
  }, [postId, user]);

  const fetchVotes = async () => {
    if (!postId) return;
    const { data } = await supabase.from('post_votes').select('vote, user_id').eq('post_id', postId);
    if (data) {
      let yes = 0, no = 0;
      let userVote: boolean | null = null;
      data.forEach(v => { if (v.vote) yes++; else no++; if (v.user_id === user?.id) userVote = v.vote; });
      setVoteData({ yes, no, userVote });
    }
  };

  const handleVote = async (vote: boolean) => {
    if (!user || !post) return;
    if (voteData.userVote === vote) {
      await supabase.from('post_votes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else if (voteData.userVote !== null) {
      await supabase.from('post_votes').update({ vote }).eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('post_votes').insert({ post_id: post.id, user_id: user.id, vote });
      notifyPostOwner(post.id, user.id, profile?.full_name || null, profile?.is_anonymous || false, 'voted on');
    }
    fetchVotes();
  };

  const incrementViewCount = async () => {
    if (!postId || !user) return;
    await supabase.from('content_views').upsert(
      { content_type: 'post', content_id: postId, user_id: user.id },
      { onConflict: 'content_type,content_id,user_id' }
    );
    const { count } = await supabase.from('content_views').select('*', { count: 'exact', head: true }).eq('content_type', 'post').eq('content_id', postId);
    if (count !== null) {
      await supabase.from('posts').update({ view_count: count }).eq('id', postId);
    }
  };

  const fetchPost = async () => {
    const { data: postData, error } = await supabase
      .from('posts').select('*').eq('id', postId).single();

    if (error || !postData) { navigate('/'); return; }

    const { data: profileData } = await supabase
      .from('profiles').select('user_id, full_name, department, avatar_url, is_anonymous, system_id')
      .eq('user_id', postData.user_id).single();

    setPost({ ...postData, profiles: profileData || undefined } as Post);
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data: commentsData, error } = await supabase
      .from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true });

    if (!error && commentsData) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      setUniqueCommenters(userIds.length);
      
      const { data: profilesData } = await supabase
        .from('profiles').select('user_id, full_name, avatar_url, is_anonymous, system_id')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      setComments(commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || undefined
      })));
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post || !newComment.trim()) return;

    setSubmitting(true);
    const isAnonymousUser = profile?.is_anonymous || false;

    let commentContent = newComment.trim();
    if (replyingTo) commentContent = `@${replyingTo.name} ${commentContent}`;

    const { error } = await supabase.from('comments').insert({
      post_id: post.id, user_id: user.id, content: commentContent, is_anonymous: isAnonymousUser,
    });

    if (error) {
      toast.error('Failed to post comment');
    } else {
      // Update unique commenter count
      const { data: allComments } = await supabase.from('comments').select('user_id').eq('post_id', post.id);
      const uniqueCount = allComments ? new Set(allComments.map(c => c.user_id)).size : 0;
      await supabase.from('posts').update({ comments_count: uniqueCount }).eq('id', post.id);
      
      setNewComment('');
      setReplyingTo(null);
      fetchComments();
      setPost(prev => prev ? { ...prev, comments_count: uniqueCount } : null);
      toast.success('Comment posted!');
      // Notify post owner
      notifyPostOwner(post.id, user.id, profile?.full_name || null, profile?.is_anonymous || false, 'commented on');
    }
    setSubmitting(false);
  };

  const getDepartmentLabel = (value: string) => DEPARTMENTS.find(d => d.value === value)?.label || value;

  const handleDeletePost = async () => {
    if (!post) return;
    setDeleting(true);
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    setDeleting(false);
    if (error) toast.error('Failed to delete post');
    else { toast.success('Post deleted'); navigate('/'); }
    setDeletePostOpen(false);
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId || !post) return;
    setDeleting(true);
    const { error } = await supabase.from('comments').delete().eq('id', deleteCommentId);
    setDeleting(false);
    if (error) { toast.error('Failed to delete comment'); }
    else {
      toast.success('Comment deleted');
      setComments(prev => prev.filter(c => c.id !== deleteCommentId));
      // Recalculate unique commenters
      const remaining = comments.filter(c => c.id !== deleteCommentId);
      const uniqueCount = new Set(remaining.map(c => c.user_id)).size;
      setUniqueCommenters(uniqueCount);
      await supabase.from('posts').update({ comments_count: uniqueCount }).eq('id', post.id);
      setPost(prev => prev ? { ...prev, comments_count: uniqueCount } : null);
    }
    setDeleteCommentId(null);
  };

  const handleReply = (comment: Comment) => {
    const displayName = shouldShowAnonymous(comment) ? 'Anonymous' : (comment.profiles?.full_name || 'User');
    setReplyingTo({ id: comment.id, name: displayName });
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  const shouldShowAnonymous = (item: { is_anonymous: boolean; profiles?: { is_anonymous: boolean } }) => {
    return item.is_anonymous || item.profiles?.is_anonymous;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!post) return null;

  const isOwnPost = post.user_id === user?.id;
  const postIsAnonymous = shouldShowAnonymous(post);
  const allImages = [...(post.image_url ? [post.image_url] : []), ...(post.image_urls || [])];

  return (
    <div className="min-h-screen bg-background no-screenshot">
      <PageHeader title="Post" showBack />

      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 shadow-soft select-none">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-border">
              {postIsAnonymous ? (
                <AvatarFallback className="bg-muted"><User className="w-5 h-5 text-muted-foreground" /></AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={post.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">{post.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{postIsAnonymous ? 'Anonymous' : post.profiles?.full_name || 'Member'}</span>
                {post.profiles?.system_id && <CopyableId id={post.profiles.system_id} prefix="" className="text-[10px]" />}
                {!postIsAnonymous && post.profiles?.department && (
                  <Badge variant="secondary" className="text-xs">{getDepartmentLabel(post.profiles.department)}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                {post.short_id && <CopyableId id={post.short_id} className="ml-2" />}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>
          </div>

          {allImages.length > 0 && (
            <div className="mt-3 space-y-2">
              {allImages.map((url, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden">
                  <img src={url} alt="" className="w-full object-contain max-h-[500px]" draggable={false} />
                </div>
              ))}
            </div>
          )}

          {/* Voting */}
          {(() => {
            const total = voteData.yes + voteData.no;
            const yesPct = total > 0 ? Math.round((voteData.yes / total) * 100) : 0;
            const noPct = total > 0 ? Math.round((voteData.no / total) * 100) : 0;
            return (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <button onClick={() => handleVote(true)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${voteData.userVote === true ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground hover:bg-success/10'}`}>
                  <ThumbsUp className="w-3.5 h-3.5" /> Yes
                </button>
                <button onClick={() => handleVote(false)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${voteData.userVote === false ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground hover:bg-destructive/10'}`}>
                  <ThumbsDown className="w-3.5 h-3.5" /> No
                </button>
                {total > 0 && (
                  <div className="flex items-center gap-2 ml-auto text-xs">
                    <span className="text-success font-medium">{yesPct}%</span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all" style={{ width: `${yesPct}%` }} />
                    </div>
                    <span className="text-destructive font-medium">{noPct}%</span>
                    <span className="text-muted-foreground opacity-60">({total})</span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{uniqueCommenters} commenters</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span className="text-sm font-medium">{post.view_count || 0}</span>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => setDeletePostOpen(true)}
                className="text-destructive hover:text-destructive/80 transition-colors" title="Delete post">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </Card>

        {/* Comments */}
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Comments ({comments.length})</h4>
          
          {comments.length === 0 ? (
            <Card className="p-6 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No comments yet</p>
            </Card>
          ) : (
            comments.map((comment) => {
              const commentIsAnonymous = shouldShowAnonymous(comment);
              return (
                <Card key={comment.id} className="p-3 shadow-soft">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      {commentIsAnonymous ? (
                        <AvatarFallback className="bg-muted"><User className="w-4 h-4 text-muted-foreground" /></AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{comment.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {commentIsAnonymous ? 'Anonymous' : comment.profiles?.full_name || 'Member'}
                          </span>
                          {comment.profiles?.system_id && <CopyableId id={comment.profiles.system_id} prefix="" className="text-[10px]" />}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleReply(comment)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Reply">
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          {(isAdmin || comment.user_id === user?.id) && (
                            <button onClick={() => setDeleteCommentId(comment.id)} className="text-destructive hover:text-destructive/80 transition-colors p-1" title="Delete comment">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground mt-1 whitespace-pre-line">{comment.content}</p>
                      {comment.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden">
                          <img src={comment.image_url} alt="" className="max-h-48 object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Comment Input */}
        {user && (
          <form onSubmit={submitComment} className="bg-background/95 backdrop-blur-sm py-3 space-y-2 border-t border-border mt-4">
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">
                  Replying to <span className="font-medium text-foreground">@{replyingTo.name}</span>
                </span>
                <button type="button" onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">×</button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="rounded-xl min-h-[40px] max-h-[100px]"
                maxLength={2000}
              />
              <Button type="submit" size="icon" disabled={!newComment.trim() || submitting} className="rounded-full shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}
      </div>

      <DeleteConfirmDialog open={deletePostOpen} onOpenChange={setDeletePostOpen} onConfirm={handleDeletePost} title="Delete this post?" description="This will permanently delete the post and all its comments." loading={deleting} />
      <DeleteConfirmDialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)} onConfirm={handleDeleteComment} title="Delete this comment?" description="This will permanently delete the comment." loading={deleting} />
    </div>
  );
}
