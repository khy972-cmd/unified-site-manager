
-- Drop and recreate policies with explicit TO authenticated

-- profiles
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- worklogs
DROP POLICY IF EXISTS "Admins full access worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Members read site worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Members create worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Owners edit draft worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Owners delete draft worklogs" ON public.worklogs;
CREATE POLICY "Admins full access worklogs" ON public.worklogs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read site worklogs" ON public.worklogs FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Members create worklogs" ON public.worklogs FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Owners edit draft worklogs" ON public.worklogs FOR UPDATE TO authenticated USING (created_by = auth.uid() AND status = 'draft');
CREATE POLICY "Owners delete draft worklogs" ON public.worklogs FOR DELETE TO authenticated USING (created_by = auth.uid() AND status = 'draft');

-- user_roles
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- sites
DROP POLICY IF EXISTS "Admins full access sites" ON public.sites;
DROP POLICY IF EXISTS "Members read assigned sites" ON public.sites;
CREATE POLICY "Admins full access sites" ON public.sites FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read assigned sites" ON public.sites FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), id));

-- site_members
DROP POLICY IF EXISTS "Admins manage site members" ON public.site_members;
DROP POLICY IF EXISTS "Members see own membership" ON public.site_members;
CREATE POLICY "Admins manage site members" ON public.site_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members see own membership" ON public.site_members FOR SELECT TO authenticated USING (user_id = auth.uid());

-- documents
DROP POLICY IF EXISTS "Admins full access documents" ON public.documents;
DROP POLICY IF EXISTS "Members read site documents" ON public.documents;
DROP POLICY IF EXISTS "Members upload non-company docs" ON public.documents;
DROP POLICY IF EXISTS "Owners manage own documents" ON public.documents;
DROP POLICY IF EXISTS "Owners delete own documents" ON public.documents;
CREATE POLICY "Admins full access documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read site documents" ON public.documents FOR SELECT TO authenticated USING (doc_type != 'company' AND (site_id IS NULL OR public.is_site_member(auth.uid(), site_id)));
CREATE POLICY "Members upload non-company docs" ON public.documents FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND doc_type != 'company');
CREATE POLICY "Owners manage own documents" ON public.documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid());
CREATE POLICY "Owners delete own documents" ON public.documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

-- punch_groups
DROP POLICY IF EXISTS "Admins full access punch_groups" ON public.punch_groups;
DROP POLICY IF EXISTS "Members read site punches" ON public.punch_groups;
DROP POLICY IF EXISTS "Members create punches" ON public.punch_groups;
DROP POLICY IF EXISTS "Members update site punches" ON public.punch_groups;
CREATE POLICY "Admins full access punch_groups" ON public.punch_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read site punches" ON public.punch_groups FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Members create punches" ON public.punch_groups FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.is_site_member(auth.uid(), site_id));
CREATE POLICY "Members update site punches" ON public.punch_groups FOR UPDATE TO authenticated USING (public.is_site_member(auth.uid(), site_id));

-- punch_items
DROP POLICY IF EXISTS "Admins full access punch_items" ON public.punch_items;
DROP POLICY IF EXISTS "Members read punch items" ON public.punch_items;
DROP POLICY IF EXISTS "Members manage punch items" ON public.punch_items;
DROP POLICY IF EXISTS "Members update punch items" ON public.punch_items;
DROP POLICY IF EXISTS "Members delete punch items" ON public.punch_items;
CREATE POLICY "Admins full access punch_items" ON public.punch_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read punch items" ON public.punch_items FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id)));
CREATE POLICY "Members manage punch items" ON public.punch_items FOR INSERT TO authenticated WITH CHECK (public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id)));
CREATE POLICY "Members update punch items" ON public.punch_items FOR UPDATE TO authenticated USING (public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id)));
CREATE POLICY "Members delete punch items" ON public.punch_items FOR DELETE TO authenticated USING (public.is_site_member(auth.uid(), public.get_punch_group_site_id(group_id)));

-- worklog detail tables
DROP POLICY IF EXISTS "Admins full access manpower" ON public.worklog_manpower;
DROP POLICY IF EXISTS "Members read manpower" ON public.worklog_manpower;
DROP POLICY IF EXISTS "Owners manage manpower" ON public.worklog_manpower;
DROP POLICY IF EXISTS "Owners update manpower" ON public.worklog_manpower;
DROP POLICY IF EXISTS "Owners delete manpower" ON public.worklog_manpower;
CREATE POLICY "Admins full access manpower" ON public.worklog_manpower FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read manpower" ON public.worklog_manpower FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), public.get_worklog_site_id(worklog_id)));
CREATE POLICY "Owners manage manpower" ON public.worklog_manpower FOR INSERT TO authenticated WITH CHECK ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
CREATE POLICY "Owners update manpower" ON public.worklog_manpower FOR UPDATE TO authenticated USING ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
CREATE POLICY "Owners delete manpower" ON public.worklog_manpower FOR DELETE TO authenticated USING ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());

DROP POLICY IF EXISTS "Admins full access worksets" ON public.worklog_worksets;
DROP POLICY IF EXISTS "Members read worksets" ON public.worklog_worksets;
DROP POLICY IF EXISTS "Owners manage worksets" ON public.worklog_worksets;
DROP POLICY IF EXISTS "Owners update worksets" ON public.worklog_worksets;
DROP POLICY IF EXISTS "Owners delete worksets" ON public.worklog_worksets;
CREATE POLICY "Admins full access worksets" ON public.worklog_worksets FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read worksets" ON public.worklog_worksets FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), public.get_worklog_site_id(worklog_id)));
CREATE POLICY "Owners manage worksets" ON public.worklog_worksets FOR INSERT TO authenticated WITH CHECK ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
CREATE POLICY "Owners update worksets" ON public.worklog_worksets FOR UPDATE TO authenticated USING ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
CREATE POLICY "Owners delete worksets" ON public.worklog_worksets FOR DELETE TO authenticated USING ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());

DROP POLICY IF EXISTS "Admins full access materials" ON public.worklog_materials;
DROP POLICY IF EXISTS "Members read materials" ON public.worklog_materials;
DROP POLICY IF EXISTS "Owners manage materials" ON public.worklog_materials;
DROP POLICY IF EXISTS "Owners update materials" ON public.worklog_materials;
DROP POLICY IF EXISTS "Owners delete materials" ON public.worklog_materials;
CREATE POLICY "Admins full access materials" ON public.worklog_materials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members read materials" ON public.worklog_materials FOR SELECT TO authenticated USING (public.is_site_member(auth.uid(), public.get_worklog_site_id(worklog_id)));
CREATE POLICY "Owners manage materials" ON public.worklog_materials FOR INSERT TO authenticated WITH CHECK ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
CREATE POLICY "Owners update materials" ON public.worklog_materials FOR UPDATE TO authenticated USING ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
CREATE POLICY "Owners delete materials" ON public.worklog_materials FOR DELETE TO authenticated USING ((SELECT created_by FROM public.worklogs WHERE id = worklog_id) = auth.uid());
