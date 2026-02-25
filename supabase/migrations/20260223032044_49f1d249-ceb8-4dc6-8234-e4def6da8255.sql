
-- Partner deployments: tracks daily worker deployment per site for partner companies
CREATE TABLE public.partner_deployments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_user_id uuid NOT NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  site_name text NOT NULL DEFAULT '',
  deploy_date date NOT NULL DEFAULT CURRENT_DATE,
  people_count integer NOT NULL DEFAULT 0,
  note text DEFAULT '',
  contractor text DEFAULT '',
  affiliation text DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_deployments ENABLE ROW LEVEL SECURITY;

-- Partners can read their own deployments
CREATE POLICY "Partners read own deployments"
ON public.partner_deployments
FOR SELECT
USING (partner_user_id = auth.uid());

-- Partners can create own deployments
CREATE POLICY "Partners create own deployments"
ON public.partner_deployments
FOR INSERT
WITH CHECK (partner_user_id = auth.uid());

-- Partners can update own deployments
CREATE POLICY "Partners update own deployments"
ON public.partner_deployments
FOR UPDATE
USING (partner_user_id = auth.uid());

-- Partners can delete own deployments
CREATE POLICY "Partners delete own deployments"
ON public.partner_deployments
FOR DELETE
USING (partner_user_id = auth.uid());

-- Admins full access
CREATE POLICY "Admins full access partner_deployments"
ON public.partner_deployments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for partner + date queries
CREATE INDEX idx_partner_deployments_user_date ON public.partner_deployments (partner_user_id, deploy_date);
CREATE INDEX idx_partner_deployments_site ON public.partner_deployments (site_id);

-- Trigger for updated_at
CREATE TRIGGER update_partner_deployments_updated_at
BEFORE UPDATE ON public.partner_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
