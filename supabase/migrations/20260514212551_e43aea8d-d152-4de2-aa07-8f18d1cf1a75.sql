
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL,
  reporter_id UUID NOT NULL,
  raison TEXT NOT NULL,
  description TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (book_id, reporter_id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users view own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins view all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete reports"
  ON public.reports FOR DELETE TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reports_statut ON public.reports(statut);
CREATE INDEX idx_reports_book_id ON public.reports(book_id);
