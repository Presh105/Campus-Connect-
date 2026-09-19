-- Allow admins to delete any posts
CREATE POLICY "Admins can delete any posts"
ON public.posts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any comments
CREATE POLICY "Admins can delete any comments"
ON public.comments
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any listings
CREATE POLICY "Admins can delete any listings"
ON public.listings
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any tasks
CREATE POLICY "Admins can delete any tasks"
ON public.tasks
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any events (predictions)
CREATE POLICY "Admins can delete any events"
ON public.events
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any chat messages
CREATE POLICY "Admins can delete chat messages"
ON public.chat_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete any private messages
CREATE POLICY "Admins can delete private messages"
ON public.private_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'));