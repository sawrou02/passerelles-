
CREATE OR REPLACE FUNCTION public.notify_followers_new_book()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message, link)
  SELECT f.follower_id, 'new_book',
         NEW.seller_name || ' a publié un nouveau livre : ' || NEW.title,
         '/livre/' || NEW.id::text
  FROM public.follows f
  WHERE f.following_id = NEW.seller_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_followers_new_book
AFTER INSERT ON public.books
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_new_book();
