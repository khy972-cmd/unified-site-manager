-- Harden site and lodging permissions

-- Ensure site_lodgings exists for lodging feature
CREATE TABLE IF NOT EXISTS public.site_lodgings (
  site_id uuid PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  lodge_address text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_lodgings ENABLE ROW LEVEL SECURITY;

-- Sites: write is admin only
DROP POLICY IF EXISTS "Admins full access sites" ON public.sites;
DROP POLICY IF EXISTS "Members read assigned sites" ON public.sites;
DROP POLICY IF EXISTS "Sites read by admin or member" ON public.sites;
DROP POLICY IF EXISTS "Sites insert admin only" ON public.sites;
DROP POLICY IF EXISTS "Sites update admin only" ON public.sites;
DROP POLICY IF EXISTS "Sites delete admin only" ON public.sites;

CREATE POLICY "Sites read by admin or member"
ON public.sites
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_site_member(auth.uid(), id)
);

CREATE POLICY "Sites insert admin only"
ON public.sites
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sites update admin only"
ON public.sites
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sites delete admin only"
ON public.sites
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lodging: partner denied, admin/member only
DROP POLICY IF EXISTS "Site lodgings select admin_or_member_not_partner" ON public.site_lodgings;
DROP POLICY IF EXISTS "Site lodgings insert admin_or_member_not_partner" ON public.site_lodgings;
DROP POLICY IF EXISTS "Site lodgings update admin_or_member_not_partner" ON public.site_lodgings;
DROP POLICY IF EXISTS "Site lodgings upsert admin_or_member_not_partner" ON public.site_lodgings;

CREATE POLICY "Site lodgings select admin_or_member_not_partner"
ON public.site_lodgings
FOR SELECT
TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'partner')
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_site_member(auth.uid(), site_id)
  )
);

CREATE POLICY "Site lodgings insert admin_or_member_not_partner"
ON public.site_lodgings
FOR INSERT
TO authenticated
WITH CHECK (
  NOT public.has_role(auth.uid(), 'partner')
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_site_member(auth.uid(), site_id)
  )
);

CREATE POLICY "Site lodgings update admin_or_member_not_partner"
ON public.site_lodgings
FOR UPDATE
TO authenticated
USING (
  NOT public.has_role(auth.uid(), 'partner')
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_site_member(auth.uid(), site_id)
  )
)
WITH CHECK (
  NOT public.has_role(auth.uid(), 'partner')
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_site_member(auth.uid(), site_id)
  )
);
