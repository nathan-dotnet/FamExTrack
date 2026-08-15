
create type public.app_role as enum ('parent','son');
create type public.plan_status as enum ('draft','submitted','under_review','approved','partially_approved','rejected');
create type public.item_status as enum ('pending','approved','reduced','rejected');
create type public.expense_status as enum ('pending_review','approved','rejected','pending_exception','exception_approved','exception_rejected');
create type public.request_status as enum ('pending','approved','partially_approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  parent_id uuid references public.profiles(id) on delete set null,
  link_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_parent()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'parent')
$$;

create or replace function public.is_my_son(_son_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _son_id and p.parent_id = auth.uid() and p.link_status = 'linked'
  )
$$;

create or replace function public.can_see_son(_son_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _son_id = auth.uid() or public.is_my_son(_son_id)
$$;

create or replace function public.parent_of(_son uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select parent_id from public.profiles where id = _son
$$;

create policy "profiles readable by self and parents" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_parent());
create policy "profiles insert self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles update by parent" on public.profiles for update to authenticated
  using (public.is_parent()) with check (public.is_parent());
create policy "roles readable by self and parents" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_parent());

create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.is_parent() then
    new.parent_id := old.parent_id;
    new.link_status := old.link_status;
  end if;
  return new;
end $$;
create trigger profiles_guard_trg before update on public.profiles
for each row execute function public.profiles_guard();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text not null default '',
  subject_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  amount numeric(18,2),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit readable by parent or subject" on public.audit_logs for select to authenticated
  using (public.is_parent() or subject_id = auth.uid() or actor_id = auth.uid());

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null default '',
  kind text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications own select" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.log_audit(_subject uuid, _action text, _entity text, _entity_id uuid, _amount numeric, _details jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare _name text;
begin
  select coalesce(nullif(full_name,''), email) into _name from public.profiles where id = auth.uid();
  insert into public.audit_logs(actor_id, actor_name, subject_id, action, entity, entity_id, amount, details)
  values (auth.uid(), coalesce(_name,'system'), _subject, _action, _entity, _entity_id, _amount, coalesce(_details,'{}'::jsonb));
end $$;

create or replace function public.notify(_user uuid, _title text, _message text, _kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if _user is null then return; end if;
  insert into public.notifications(user_id, title, message, kind) values (_user, _title, coalesce(_message,''), coalesce(_kind,'info'));
end $$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories readable" on public.categories for select to authenticated using (true);
create policy "categories parent insert" on public.categories for insert to authenticated with check (public.is_parent());
create policy "categories parent update" on public.categories for update to authenticated using (public.is_parent()) with check (public.is_parent());
create policy "categories parent delete" on public.categories for delete to authenticated using (public.is_parent());

insert into public.categories(name, sort_order) values
  ('Tuition',1),('Food',2),('Transportation',3),('School Supplies',4),('Bills',5),('Other',6);

create table public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  son_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  status public.plan_status not null default 'draft',
  parent_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (son_id, month)
);
grant select, insert, update on public.budget_plans to authenticated;
grant all on public.budget_plans to service_role;
alter table public.budget_plans enable row level security;
create policy "plans visible to owner and parent" on public.budget_plans for select to authenticated
  using (public.can_see_son(son_id));
create policy "plans son insert own" on public.budget_plans for insert to authenticated
  with check (son_id = auth.uid());
create policy "plans update owner or parent" on public.budget_plans for update to authenticated
  using (public.can_see_son(son_id)) with check (public.can_see_son(son_id));

create or replace function public.plan_owner(_plan uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select son_id from public.budget_plans where id = _plan
$$;
create or replace function public.plan_state(_plan uuid)
returns public.plan_status language sql stable security definer set search_path = public as $$
  select status from public.budget_plans where id = _plan
$$;

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.budget_plans(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  description text not null default '',
  requested_amount numeric(18,2) not null check (requested_amount >= 0),
  approved_amount numeric(18,2),
  status public.item_status not null default 'pending',
  parent_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.budget_items to authenticated;
grant all on public.budget_items to service_role;
alter table public.budget_items enable row level security;
create policy "items visible to owner and parent" on public.budget_items for select to authenticated
  using (public.can_see_son(public.plan_owner(plan_id)));
create policy "items son insert draft" on public.budget_items for insert to authenticated
  with check (public.plan_owner(plan_id) = auth.uid() and public.plan_state(plan_id) in ('draft','rejected'));
create policy "items update owner or parent" on public.budget_items for update to authenticated
  using (public.can_see_son(public.plan_owner(plan_id))) with check (public.can_see_son(public.plan_owner(plan_id)));
create policy "items son delete draft" on public.budget_items for delete to authenticated
  using (public.plan_owner(plan_id) = auth.uid() and public.plan_state(plan_id) in ('draft','rejected'));

create or replace function public.plan_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.is_parent() then
    if old.status not in ('draft','rejected') then
      raise exception 'This budget request has already been reviewed and can no longer be edited.';
    end if;
    if new.status not in ('draft','submitted') then
      raise exception 'Only a parent can approve or reject a budget request.';
    end if;
    new.parent_note := old.parent_note;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  else
    if new.status <> old.status and new.status in ('approved','partially_approved','rejected','under_review') then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end $$;
create trigger plan_guard_trg before update on public.budget_plans
for each row execute function public.plan_guard();

create or replace function public.plan_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare _p uuid; _total numeric(18,2);
begin
  _p := public.parent_of(new.son_id);
  if new.status = 'submitted' and old.status <> 'submitted' then
    perform public.log_audit(new.son_id,'submitted budget request','budget_plan',new.id,null,jsonb_build_object('month',new.month));
    perform public.notify(_p,'New budget request','A new monthly budget request was submitted for review.','info');
  elsif new.status in ('approved','partially_approved') and old.status <> new.status then
    select coalesce(sum(coalesce(approved_amount, 0)),0) into _total from public.budget_items where plan_id = new.id;
    perform public.log_audit(new.son_id,'approved budget','budget_plan',new.id,_total,jsonb_build_object('month',new.month,'status',new.status));
    perform public.notify(new.son_id,'Budget approved','Your monthly budget request was approved.','success');
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    perform public.log_audit(new.son_id,'rejected budget','budget_plan',new.id,null,jsonb_build_object('reason',new.parent_note));
    perform public.notify(new.son_id,'Budget rejected','Your monthly budget request was rejected.','error');
  end if;
  return new;
end $$;
create trigger plan_after_trg after update on public.budget_plans
for each row execute function public.plan_after();

create or replace function public.item_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.is_parent() then
    if public.plan_state(new.plan_id) not in ('draft','rejected') then
      raise exception 'This budget request has already been reviewed and can no longer be edited.';
    end if;
    new.approved_amount := old.approved_amount;
    new.status := old.status;
    new.parent_note := old.parent_note;
  end if;
  return new;
end $$;
create trigger item_guard_trg before update on public.budget_items
for each row execute function public.item_guard();

create table public.money_transfers (
  id uuid primary key default gen_random_uuid(),
  son_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  transfer_date date not null default current_date,
  month date not null,
  method text not null default 'Cash',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert on public.money_transfers to authenticated;
grant all on public.money_transfers to service_role;
alter table public.money_transfers enable row level security;
create policy "transfers visible to owner and parent" on public.money_transfers for select to authenticated
  using (public.can_see_son(son_id));
create policy "transfers parent insert" on public.money_transfers for insert to authenticated
  with check (public.is_parent() and public.is_my_son(son_id) and parent_id = auth.uid());

create or replace function public.transfer_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_audit(new.son_id,'recorded money given','money_transfer',new.id,new.amount,jsonb_build_object('method',new.method));
  perform public.notify(new.son_id,'Money sent','Your parent recorded money given to you.','success');
  return new;
end $$;
create trigger transfer_after_trg after insert on public.money_transfers
for each row execute function public.transfer_after();

create table public.additional_money_requests (
  id uuid primary key default gen_random_uuid(),
  son_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  month date not null,
  requested_amount numeric(18,2) not null check (requested_amount > 0),
  approved_amount numeric(18,2),
  reason text not null,
  status public.request_status not null default 'pending',
  parent_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.additional_money_requests to authenticated;
grant all on public.additional_money_requests to service_role;
alter table public.additional_money_requests enable row level security;
create policy "requests visible to owner and parent" on public.additional_money_requests for select to authenticated
  using (public.can_see_son(son_id));
create policy "requests son insert own" on public.additional_money_requests for insert to authenticated
  with check (son_id = auth.uid() and length(trim(reason)) > 0);
create policy "requests update parent" on public.additional_money_requests for update to authenticated
  using (public.is_parent() and public.is_my_son(son_id)) with check (public.is_parent());

create or replace function public.request_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_audit(new.son_id,'requested additional money','money_request',new.id,new.requested_amount,jsonb_build_object('reason',new.reason));
  perform public.notify(public.parent_of(new.son_id),'Additional money request','A son requested additional money.','warning');
  return new;
end $$;
create trigger request_after_insert_trg after insert on public.additional_money_requests
for each row execute function public.request_after_insert();

create or replace function public.request_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.son_id := old.son_id;
  new.requested_amount := old.requested_amount;
  new.reason := old.reason;
  return new;
end $$;
create trigger request_guard_trg before update on public.additional_money_requests
for each row execute function public.request_guard();

create or replace function public.request_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> old.status then
    perform public.log_audit(new.son_id,'reviewed additional money request','money_request',new.id,new.approved_amount,jsonb_build_object('status',new.status,'note',new.parent_note));
    perform public.notify(new.son_id,'Money request ' || new.status, coalesce(new.parent_note,''), case when new.status = 'rejected' then 'error' else 'success' end);
  end if;
  return new;
end $$;
create trigger request_after_update_trg after update on public.additional_money_requests
for each row execute function public.request_after_update();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  son_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  amount numeric(18,2) not null check (amount > 0),
  expense_date date not null default current_date,
  month date not null default date_trunc('month', current_date)::date,
  description text not null,
  receipt_path text,
  receipt_filename text,
  receipt_mime text,
  receipt_size int,
  receipt_uploaded_at timestamptz,
  no_receipt_reason text,
  overspend_reason text,
  budget_at_submit numeric(18,2) not null default 0,
  over_amount numeric(18,2) not null default 0,
  status public.expense_status not null default 'pending_review',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submission_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "expenses visible to owner and parent" on public.expenses for select to authenticated
  using (public.can_see_son(son_id));
create policy "expenses son insert own" on public.expenses for insert to authenticated
  with check (son_id = auth.uid());
create policy "expenses update owner or parent" on public.expenses for update to authenticated
  using (public.can_see_son(son_id)) with check (public.can_see_son(son_id));

create table public.expense_revisions (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  son_id uuid not null,
  snapshot jsonb not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);
grant select on public.expense_revisions to authenticated;
grant all on public.expense_revisions to service_role;
alter table public.expense_revisions enable row level security;
create policy "revisions visible to owner and parent" on public.expense_revisions for select to authenticated
  using (public.can_see_son(son_id));

create or replace function public.category_budget(_son uuid, _category uuid, _month date)
returns numeric language sql stable security definer set search_path = public as $$
  select
    coalesce((
      select sum(coalesce(bi.approved_amount,0))
      from public.budget_items bi
      join public.budget_plans bp on bp.id = bi.plan_id
      where bp.son_id = _son and bp.month = date_trunc('month', _month)::date
        and bp.status in ('approved','partially_approved')
        and bi.category_id = _category and bi.status <> 'rejected'
    ),0)
    +
    coalesce((
      select sum(coalesce(amr.approved_amount,0))
      from public.additional_money_requests amr
      where amr.son_id = _son and amr.month = date_trunc('month', _month)::date
        and amr.category_id = _category and amr.status in ('approved','partially_approved')
    ),0)
$$;

create or replace function public.category_spent(_son uuid, _category uuid, _month date, _exclude uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(e.amount),0)
  from public.expenses e
  where e.son_id = _son and e.category_id = _category
    and date_trunc('month', e.expense_date)::date = date_trunc('month', _month)::date
    and e.status in ('pending_review','approved','pending_exception','exception_approved')
    and (_exclude is null or e.id <> _exclude)
$$;

create or replace function public.expense_evaluate_row(_row public.expenses)
returns public.expenses language plpgsql security definer set search_path = public as $$
declare _budget numeric(18,2); _spent numeric(18,2); _over numeric(18,2); r public.expenses;
begin
  r := _row;
  r.updated_at := now();
  r.month := date_trunc('month', r.expense_date)::date;
  if r.receipt_path is null and coalesce(trim(r.no_receipt_reason),'') = '' then
    raise exception 'Receipt required: upload a receipt or explain why there is none.';
  end if;
  _budget := public.category_budget(r.son_id, r.category_id, r.expense_date);
  _spent := public.category_spent(r.son_id, r.category_id, r.expense_date, r.id);
  _over := greatest(0, (_spent + r.amount) - _budget);
  if _over > 0 and coalesce(trim(r.overspend_reason),'') = '' then
    raise exception 'This expense exceeds the approved budget by %. A reason is required.', _over;
  end if;
  r.budget_at_submit := _budget;
  r.over_amount := _over;
  if _over > 0 or r.receipt_path is null then
    r.status := 'pending_exception';
  else
    r.status := 'pending_review';
  end if;
  r.review_note := null;
  r.reviewed_by := null;
  r.reviewed_at := null;
  return r;
end $$;

create or replace function public.expense_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_parent() then
    new.son_id := auth.uid();
  end if;
  return public.expense_evaluate_row(new);
end $$;
create trigger expense_before_insert_trg before insert on public.expenses
for each row execute function public.expense_before_insert();

create or replace function public.expense_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_parent() then
    new.son_id := old.son_id;
    new.category_id := old.category_id;
    new.amount := old.amount;
    new.expense_date := old.expense_date;
    new.month := old.month;
    new.description := old.description;
    new.receipt_path := old.receipt_path;
    new.receipt_filename := old.receipt_filename;
    new.receipt_mime := old.receipt_mime;
    new.receipt_size := old.receipt_size;
    new.no_receipt_reason := old.no_receipt_reason;
    new.overspend_reason := old.overspend_reason;
    new.budget_at_submit := old.budget_at_submit;
    new.over_amount := old.over_amount;
    new.submission_count := old.submission_count;
    if new.status <> old.status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    new.updated_at := now();
    return new;
  end if;

  if old.status not in ('rejected','exception_rejected') then
    raise exception 'This expense can no longer be edited.';
  end if;
  new.son_id := old.son_id;
  new.submission_count := old.submission_count + 1;
  return public.expense_evaluate_row(new);
end $$;
create trigger expense_before_update_trg before update on public.expenses
for each row execute function public.expense_before_update();

create or replace function public.expense_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.log_audit(new.son_id,'submitted expense','expense',new.id,new.amount,
    jsonb_build_object('status',new.status,'over_amount',new.over_amount,'has_receipt',new.receipt_path is not null));
  if new.over_amount > 0 then
    perform public.notify(public.parent_of(new.son_id),'Budget exceeded','An expense exceeds the approved category budget and needs your approval.','warning');
  elsif new.receipt_path is null then
    perform public.notify(public.parent_of(new.son_id),'Receipt exception','An expense was submitted without a receipt and needs your approval.','warning');
  else
    perform public.notify(public.parent_of(new.son_id),'New expense submitted','A new expense is waiting for your review.','info');
  end if;
  return new;
end $$;
create trigger expense_after_insert_trg after insert on public.expenses
for each row execute function public.expense_after_insert();

create or replace function public.expense_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.expense_revisions(expense_id, son_id, snapshot, changed_by, note)
  values (old.id, old.son_id, to_jsonb(old), auth.uid(), 'previous version');

  if new.status <> old.status then
    perform public.log_audit(new.son_id,'expense status ' || new.status,'expense',new.id,new.amount,
      jsonb_build_object('from',old.status,'to',new.status,'note',new.review_note));
    if new.status in ('approved','exception_approved') then
      perform public.notify(new.son_id,'Expense approved','Your expense was approved.','success');
    elsif new.status in ('rejected','exception_rejected') then
      perform public.notify(new.son_id,'Expense rejected', coalesce(new.review_note,'See details.'),'error');
    elsif new.status in ('pending_review','pending_exception') then
      perform public.notify(public.parent_of(new.son_id),'Expense resubmitted','A rejected expense was resubmitted for review.','info');
    end if;
  end if;
  return new;
end $$;
create trigger expense_after_update_trg after update on public.expenses
for each row execute function public.expense_after_update();

create index on public.expenses (son_id, month, category_id);
create index on public.budget_plans (son_id, month);
create index on public.notifications (user_id, is_read);
create index on public.audit_logs (subject_id, created_at desc);
