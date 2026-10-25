-- expense category for materials and stock (electricians, contractors, makers)
alter table public.crm_expenses drop constraint crm_expenses_category_check;
alter table public.crm_expenses add constraint crm_expenses_category_check check (category in ('software', 'subcontractor', 'materials', 'equipment', 'office', 'vehicle', 'professional', 'training', 'fees', 'other'));
