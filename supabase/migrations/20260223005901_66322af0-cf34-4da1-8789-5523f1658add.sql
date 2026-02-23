
-- =============================================
-- INOPNC 건설현장 관리 앱 통합 데이터베이스
-- =============================================

-- 1. 역할 enum & user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'worker');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'worker',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. 프로필
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  affiliation TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. 현장 (Sites)
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  manager_name TEXT DEFAULT '',
  manager_phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '진행중' CHECK (status IN ('진행중','완료','중지')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- 4. 현장 멤버십 (site_members)
CREATE TABLE public.site_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, user_id)
);
ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;

-- 5. 작업일지 (Worklogs)
CREATE TABLE public.worklogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  dept TEXT DEFAULT '',
  work_date DATE NOT NULL,
  weather TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;

-- 6. 투입인원
CREATE TABLE public.worklog_manpower (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worklog_id UUID NOT NULL REFERENCES public.worklogs(id) ON DELETE CASCADE,
  worker_name TEXT NOT NULL,
  work_hours NUMERIC NOT NULL DEFAULT 8,
  is_custom BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false
);
ALTER TABLE public.worklog_manpower ENABLE ROW LEVEL SECURITY;

-- 7. 작업내용
CREATE TABLE public.worklog_worksets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worklog_id UUID NOT NULL REFERENCES public.worklogs(id) ON DELETE CASCADE,
  member TEXT DEFAULT '',
  process TEXT DEFAULT '',
  work_type TEXT DEFAULT '',
  block TEXT DEFAULT '',
  dong TEXT DEFAULT '',
  floor TEXT DEFAULT ''
);
ALTER TABLE public.worklog_worksets ENABLE ROW LEVEL SECURITY;

-- 8. 자재
CREATE TABLE public.worklog_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worklog_id UUID NOT NULL REFERENCES public.worklogs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 0
);
ALTER TABLE public.worklog_materials ENABLE ROW LEVEL SECURITY;

-- 9. 문서 (Documents) - 내문서/회사서류/도면/사진 통합
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  site_name TEXT DEFAULT '',
  doc_type TEXT NOT NULL CHECK (doc_type IN ('personal','company','drawing','photo')),
  title TEXT NOT NULL DEFAULT '',
  file_path TEXT DEFAULT '',
  file_url TEXT DEFAULT '',
  file_size TEXT DEFAULT '',
  file_ext TEXT DEFAULT '',
  work_date DATE,
  badge TEXT DEFAULT '',
  worklog_id UUID REFERENCES public.worklogs(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 10. 조치 그룹 (Punch Groups)
CREATE TABLE public.punch_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  site_name TEXT NOT NULL,
  contractor TEXT DEFAULT '',
  affiliation TEXT DEFAULT '',
  author TEXT DEFAULT '',
  punch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  punch_time TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','ing','done')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.punch_groups ENABLE ROW LEVEL SECURITY;

-- 11. 조치 항목 (Punch Items)
CREATE TABLE public.punch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.punch_groups(id) ON DELETE CASCADE,
  location TEXT DEFAULT '',
  issue TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT '중간' CHECK (priority IN ('높음','중간','낮음')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','ing','done')),
  assignee TEXT DEFAULT '',
  due_date DATE,
  before_photo TEXT DEFAULT '',
  after_photo TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.punch_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS (Security Definer)
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_site_member(_user_id UUID, _site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_members
    WHERE user_id = _user_id AND site_id = _site_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_worklog_site_id(_worklog_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site_id FROM public.worklogs WHERE id = _worklog_id
$$;

CREATE OR REPLACE FUNCTION public.get_punch_group_site_id(_group_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site_id FROM public.punch_groups WHERE id = _group_id
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'worker');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_worklogs_updated BEFORE UPDATE ON public.worklogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_punch_groups_updated BEFORE UPDATE ON public.punch_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_punch_items_updated BEFORE UPDATE ON public.punch_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

-- user_roles: users see own, admins see all
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- sites
CREATE POLICY "Admins full access sites" ON public.sites FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read assigned sites" ON public.sites FOR SELECT USING (public.is_site_member(auth.uid(), id));

-- site_members
CREATE POLICY "Admins manage site members" ON public.site_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members see own membership" ON public.site_members FOR SELECT USING (user_id = auth.uid());

-- worklogs
CREATE POLICY "Admins full access worklogs" ON public.worklogs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read site worklogs" ON public.worklogs FOR SELECT USING (public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Members create worklogs" ON public.worklogs FOR INSERT WITH CHECK (created_by = auth.uid() AND public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Owners edit draft worklogs" ON public.worklogs FOR UPDATE USING (created_by = auth.uid() AND status = 'draft');
CREATE POLICY "Owners delete draft worklogs" ON public.worklogs FOR DELETE USING (created_by = auth.uid() AND status = 'draft');

-- worklog_manpower
CREATE POLICY "Admins full access manpower" ON public.worklog_manpower FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read manpower" ON public.worklog_manpower FOR SELECT USING (public.is_site_member(auth.uid(), public.get_worklog_site_id(worklog_id)));
CREATE POLICY "Owners manage manpower" ON public.worklog_manpower FOR INSERT WITH CHECK (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);
CREATE POLICY "Owners update manpower" ON public.worklog_manpower FOR UPDATE USING (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);
CREATE POLICY "Owners delete manpower" ON public.worklog_manpower FOR DELETE USING (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);

-- worklog_worksets
CREATE POLICY "Admins full access worksets" ON public.worklog_worksets FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read worksets" ON public.worklog_worksets FOR SELECT USING (public.is_site_member(auth.uid(), public.get_worklog_site_id(worklog_id)));
CREATE POLICY "Owners manage worksets" ON public.worklog_worksets FOR INSERT WITH CHECK (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);
CREATE POLICY "Owners update worksets" ON public.worklog_worksets FOR UPDATE USING (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);
CREATE POLICY "Owners delete worksets" ON public.worklog_worksets FOR DELETE USING (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);

-- worklog_materials
CREATE POLICY "Admins full access materials" ON public.worklog_materials FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read materials" ON public.worklog_materials FOR SELECT USING (public.is_site_member(auth.uid(), public.get_worklog_site_id(worklog_id)));
CREATE POLICY "Owners manage materials" ON public.worklog_materials FOR INSERT WITH CHECK (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);
CREATE POLICY "Owners update materials" ON public.worklog_materials FOR UPDATE USING (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);
CREATE POLICY "Owners delete materials" ON public.worklog_materials FOR DELETE USING (
  (SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid()
);

-- documents
CREATE POLICY "Admins full access documents" ON public.documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read site documents" ON public.documents FOR SELECT USING (
  doc_type != 'company' AND (site_id IS NULL OR public.is_site_member(auth.uid(), site_id))
);
CREATE POLICY "Members upload non-company docs" ON public.documents FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND doc_type != 'company'
);
CREATE POLICY "Owners manage own documents" ON public.documents FOR UPDATE USING (uploaded_by = auth.uid());
CREATE POLICY "Owners delete own documents" ON public.documents FOR DELETE USING (uploaded_by = auth.uid());

-- punch_groups
CREATE POLICY "Admins full access punch_groups" ON public.punch_groups FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read site punches" ON public.punch_groups FOR SELECT USING (public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Members create punches" ON public.punch_groups FOR INSERT WITH CHECK (created_by = auth.uid() AND public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Members update site punches" ON public.punch_groups FOR UPDATE USING (public.is_site_member(auth.uid(), site_id));

-- punch_items
CREATE POLICY "Admins full access punch_items" ON public.punch_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read punch items" ON public.punch_items FOR SELECT USING (
  public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id))
);
CREATE POLICY "Members manage punch items" ON public.punch_items FOR INSERT WITH CHECK (
  public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id))
);
CREATE POLICY "Members update punch items" ON public.punch_items FOR UPDATE USING (
  public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id))
);
CREATE POLICY "Members delete punch items" ON public.punch_items FOR DELETE USING (
  public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id))
);

-- =============================================
-- INDEXES for performance & search
-- =============================================
CREATE INDEX idx_worklogs_site_id ON public.worklogs(site_id);
CREATE INDEX idx_worklogs_site_name ON public.worklogs(site_name);
CREATE INDEX idx_worklogs_work_date ON public.worklogs(work_date);
CREATE INDEX idx_worklogs_status ON public.worklogs(status);
CREATE INDEX idx_worklogs_created_by ON public.worklogs(created_by);
CREATE INDEX idx_documents_site_id ON public.documents(site_id);
CREATE INDEX idx_documents_doc_type ON public.documents(doc_type);
CREATE INDEX idx_documents_site_name ON public.documents(site_name);
CREATE INDEX idx_punch_groups_site_id ON public.punch_groups(site_id);
CREATE INDEX idx_punch_groups_site_name ON public.punch_groups(site_name);
CREATE INDEX idx_punch_items_group_id ON public.punch_items(group_id);
CREATE INDEX idx_site_members_user_id ON public.site_members(user_id);
CREATE INDEX idx_site_members_site_id ON public.site_members(site_id);

-- Full-text search columns
ALTER TABLE public.sites ADD COLUMN search_vector tsvector 
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(address,'') || ' ' || coalesce(manager_name,''))) STORED;
ALTER TABLE public.worklogs ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(site_name,'') || ' ' || coalesce(dept,''))) STORED;
ALTER TABLE public.documents ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(site_name,'') || ' ' || coalesce(file_ext,''))) STORED;
ALTER TABLE public.punch_groups ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(site_name,'') || ' ' || coalesce(contractor,'') || ' ' || coalesce(author,''))) STORED;

CREATE INDEX idx_sites_search ON public.sites USING gin(search_vector);
CREATE INDEX idx_worklogs_search ON public.worklogs USING gin(search_vector);
CREATE INDEX idx_documents_search ON public.documents USING gin(search_vector);
CREATE INDEX idx_punch_groups_search ON public.punch_groups USING gin(search_vector);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('drawings', 'drawings', false);

-- Storage policies
CREATE POLICY "Auth users upload docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('documents','photos','drawings') AND auth.role() = 'authenticated');
CREATE POLICY "Auth users read own docs" ON storage.objects FOR SELECT USING (bucket_id IN ('documents','photos','drawings') AND auth.role() = 'authenticated');
CREATE POLICY "Auth users delete own docs" ON storage.objects FOR DELETE USING (bucket_id IN ('documents','photos','drawings') AND auth.role() = 'authenticated');
