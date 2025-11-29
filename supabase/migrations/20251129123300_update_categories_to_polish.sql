-- migration: update categories to polish names
-- purpose: align category names with llm prompt expectations for better matching
-- affected tables: categories
-- special considerations:
--   - updates existing english category names to polish equivalents
--   - maintains category ids to preserve referential integrity with expenses table
--   - adds comprehensive polish category coverage for receipt processing

-- update existing categories to polish names
-- this ensures llm suggestions match database values exactly
update public.categories set name = 'żywność' where name = 'groceries';
update public.categories set name = 'transport' where name = 'transport';
update public.categories set name = 'media' where name = 'utilities';
update public.categories set name = 'rozrywka' where name = 'entertainment';
update public.categories set name = 'zdrowie' where name = 'healthcare';
update public.categories set name = 'edukacja' where name = 'education';
update public.categories set name = 'odzież' where name = 'clothing';
update public.categories set name = 'restauracje' where name = 'dining';
update public.categories set name = 'mieszkanie' where name = 'housing';
update public.categories set name = 'ubezpieczenia' where name = 'insurance';
update public.categories set name = 'higiena' where name = 'personal care';
update public.categories set name = 'prezenty' where name = 'gifts';
update public.categories set name = 'podróże' where name = 'travel';
update public.categories set name = 'subskrypcje' where name = 'subscriptions';
update public.categories set name = 'inne' where name = 'other';

-- add comment documenting the change
comment on table public.categories is 'dictionary table for predefined expense categories (polish names for llm compatibility)';