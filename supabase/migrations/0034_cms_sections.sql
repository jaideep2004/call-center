-- 0034: CMS sections (lifecycle #20-21)
-- Admin-managed content blocks. The public homepage reads active sections by
-- slug; homepage component wiring is owned by the homepage session.

create table if not exists app.cms_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  content jsonb not null default '{}',
  active boolean not null default true,
  updated_by uuid references app.memberships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.cms_sections enable row level security;
create policy allow_all on app.cms_sections using (true) with check (true);

insert into app.cms_sections (slug, title, content) values
('faq', 'FAQ', '{"items": []}'::jsonb),
('testimonials', 'Testimonials', '{"items": []}'::jsonb),
('privacy', 'Privacy Policy', '{"body": ""}'::jsonb),
('terms', 'Terms of Service', '{"body": ""}'::jsonb)
on conflict (slug) do nothing;
