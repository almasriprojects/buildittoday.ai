-- Structured design tokens per business_category, harvested from real
-- award-winning reference sites (via the local SiteReplicate tool) and
-- reviewed for quality before being written here. Replaces the free-text-only
-- design_principles column as the source for generate-design-html.

alter table public.category_design_references add column if not exists design_tokens jsonb;
alter table public.category_design_references add column if not exists layout_analysis jsonb;
alter table public.category_design_references add column if not exists motion_notes jsonb;
