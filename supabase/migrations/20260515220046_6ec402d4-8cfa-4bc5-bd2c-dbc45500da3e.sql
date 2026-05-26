
CREATE POLICY "Reviews require confirmed exchange"
ON public.reviews AS RESTRICTIVE FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.seller_id = reviews.seller_id
      AND b.reserved_by = auth.uid()
      AND b.status = 'given'
  )
);
