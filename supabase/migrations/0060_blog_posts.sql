-- 0060: CMS-managed blog (archive + single post pages, admin Blog tab).
-- Posts are global (agency_id NULL = platform content, like global creatives).
-- Body is markdown rendered by the shared lib renderer (headings feed the
-- single-post table of contents). Drafts stay invisible until published.
-- Idempotent.
create table if not exists app.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  cover_image text,
  category text not null default 'General',
  tags text[] not null default '{}',
  author_name text not null default '',
  author_role text not null default '',
  author_avatar text,
  read_minutes int not null default 5 check (read_minutes > 0),
  featured boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  body_markdown text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table app.blog_posts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'blog_public_read' and tablename = 'blog_posts') then
    create policy blog_public_read on app.blog_posts for select using (published = true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'blog_admin_write' and tablename = 'blog_posts') then
    create policy blog_admin_write on app.blog_posts for all using (true) with check (true);
  end if;
end $$;

create index if not exists blog_posts_published_idx
  on app.blog_posts(published, published_at desc nulls last, created_at desc);
create index if not exists blog_posts_category_idx
  on app.blog_posts(category) where published = true;
