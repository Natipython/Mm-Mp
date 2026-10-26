-- Persistent catalog drafts and safe publication. PostgreSQL 18+, local fixtures only.
begin;
do $$ begin
 if not exists(select from pg_roles where rolname='menu_public') then
  create role menu_public nologin nosuperuser nobypassrls;
 end if;
 if exists(select from pg_roles where rolname='menu_public' and (rolsuper or rolbypassrls or rolcanlogin))
  or pg_has_role('menu_public','menu_workflow_owner','MEMBER') or pg_has_role('menu_public','menu_runtime','MEMBER')
  or pg_has_role('menu_public','menu_identity','MEMBER') or pg_has_role('menu_public','menu_platform','MEMBER') then
  raise exception 'public menu role must have no private role membership';
 end if;
end $$;

create table menumini.branch_profile_drafts (
 merchant_id uuid not null, venue_id uuid not null, version integer not null check(version>0),
 content jsonb not null check(jsonb_typeof(content)='object'), updated_by uuid not null, updated_at timestamptz not null default now(),
 primary key(merchant_id,venue_id),
 foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id),
 foreign key(merchant_id,updated_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create index branch_profile_actor_idx on menumini.branch_profile_drafts(merchant_id,updated_by);
create table menumini.menu_drafts (
 merchant_id uuid not null, venue_id uuid not null, version integer not null check(version>0),
 content jsonb not null check(jsonb_typeof(content)='object'), updated_by uuid not null, updated_at timestamptz not null default now(),
 primary key(merchant_id,venue_id),
 foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id),
 foreign key(merchant_id,updated_by) references menumini.merchant_memberships(merchant_id,user_id)
);
create index menu_draft_actor_idx on menumini.menu_drafts(merchant_id,updated_by);
create table menumini.catalog_identities (
 id uuid primary key, merchant_id uuid not null, venue_id uuid not null,
 kind text not null check(kind in ('SECTION','ITEM','GROUP','CHOICE')),
 foreign key(merchant_id,venue_id) references menumini.venues(merchant_id,id)
);
create index catalog_identity_branch_idx on menumini.catalog_identities(merchant_id,venue_id);
insert into menumini.catalog_identities
 select id,merchant_id,venue_id,'SECTION' from menumini.menu_sections union all
 select id,merchant_id,venue_id,'ITEM' from menumini.menu_items union all
 select id,merchant_id,venue_id,'GROUP' from menumini.modifier_groups union all
 select id,merchant_id,venue_id,'CHOICE' from menumini.modifier_choices;
create trigger immutable_catalog_identity before update or delete on menumini.catalog_identities
 for each row execute function menumini.deny_mutation();
-- Also covers reviewed imports/fixtures inserted after this migration. A raw
-- catalog row must never escape the global branch/type binding registry.
create function menumini.reserve_catalog_identity() returns trigger
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$ begin
 if tg_op='UPDATE' and row(new.id,new.merchant_id,new.venue_id) is distinct from row(old.id,old.merchant_id,old.venue_id) then
  raise exception 'catalog row identity is immutable' using errcode='23514'; end if;
 insert into catalog_identities values(new.id,new.merchant_id,new.venue_id,tg_argv[0]) on conflict do nothing;
 if not exists(select from catalog_identities where id=new.id and merchant_id=new.merchant_id and venue_id=new.venue_id and kind=tg_argv[0]) then
  raise exception 'catalog identity outside branch or entity type' using errcode='23514'; end if;
 return new;
end $$;
create trigger bind_section_identity before insert or update of id,merchant_id,venue_id on menumini.menu_sections
 for each row execute function menumini.reserve_catalog_identity('SECTION');
create trigger bind_item_identity before insert or update of id,merchant_id,venue_id on menumini.menu_items
 for each row execute function menumini.reserve_catalog_identity('ITEM');
create trigger bind_group_identity before insert or update of id,merchant_id,venue_id on menumini.modifier_groups
 for each row execute function menumini.reserve_catalog_identity('GROUP');
create trigger bind_choice_identity before insert or update of id,merchant_id,venue_id on menumini.modifier_choices
 for each row execute function menumini.reserve_catalog_identity('CHOICE');
create table menumini.catalog_command_results (
 merchant_id uuid not null, venue_id uuid not null, principal text not null, operation text not null,
 request_key uuid not null, result jsonb not null,
 primary key(merchant_id,venue_id,principal,operation,request_key),
 foreign key(merchant_id,venue_id,principal,operation,request_key)
  references menumini.workflow_requests(merchant_id,venue_id,principal,operation,request_key)
);
create trigger immutable_catalog_result before update or delete on menumini.catalog_command_results
 for each row execute function menumini.deny_mutation();
alter table menumini.modifier_groups add column archived_at timestamptz;
alter table menumini.modifier_choices add column archived_at timestamptz;
alter table menumini.menu_publications add column source_draft_version integer check(source_draft_version>0);
alter table menumini.menu_publications add column source_profile_version integer check(source_profile_version>0);
alter table menumini.menu_publications add constraint publication_sources_together
 check((source_draft_version is null)=(source_profile_version is null));

create function menumini.catalog_shape(p jsonb,allowed text[],required text[]) returns void
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$ begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'catalog object required' using errcode='23514'; end if;
 if not (p ?& required) or exists(select from jsonb_object_keys(p) as k(value) where not(value=any(allowed))) then
  raise exception 'unsupported or missing catalog fields' using errcode='23514'; end if;
end $$;
create function menumini.catalog_text(p jsonb,maximum integer,optional boolean default false,multiline boolean default false) returns void
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$
declare v text; begin
 if p is null and optional then return; end if;
 if jsonb_typeof(p) is distinct from 'string' then raise exception 'catalog text required' using errcode='23514'; end if;
 v:=p#>>'{}';
 if length(v)>maximum or (not optional and length(btrim(v))=0)
  or regexp_replace(v,case when multiline then E'[\n\r\t]' else '(?!)' end,'','g')~'[[:cntrl:]]' then
  raise exception 'invalid catalog text' using errcode='23514'; end if;
end $$;
create function menumini.catalog_uuid(p jsonb) returns uuid
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$ begin
 if jsonb_typeof(p) is distinct from 'string' or coalesce(p#>>'{}','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'catalog UUID required' using errcode='23514'; end if;
 return (p#>>'{}')::uuid;
end $$;
create function menumini.catalog_integer(p jsonb,minimum integer,maximum integer) returns integer
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$
declare n numeric; begin
 if jsonb_typeof(p) is distinct from 'number' then raise exception 'catalog integer required' using errcode='23514'; end if;
 n:=(p#>>'{}')::numeric;
 if n<>trunc(n) or n<minimum or n>maximum then raise exception 'catalog integer outside limits' using errcode='23514'; end if;
 return n::integer;
end $$;
create function menumini.catalog_money(p jsonb,signed boolean default false) returns numeric
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$ begin
 if jsonb_typeof(p) is distinct from 'string' or coalesce(p#>>'{}','')!~
  (case when signed then '^-?(0|[1-9][0-9]{0,9})\.[0-9]{2}$' else '^(0|[1-9][0-9]{0,9})\.[0-9]{2}$' end) then
  raise exception 'exact decimal string required' using errcode='23514'; end if;
 return (p#>>'{}')::numeric;
end $$;

create function menumini.validate_branch_profile(p jsonb) returns void
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$
declare b jsonb; h jsonb; days integer[]:='{}'; day integer; phone text; begin
 if octet_length(p::text)>16384 then raise exception 'branch profile too large' using errcode='23514'; end if;
 perform catalog_shape(p,array['businessTypeId','branch'],array['businessTypeId','branch']);
 if coalesce(p->>'businessTypeId','') not in ('bakery-and-pastry','bakery-and-cafe','cafe-and-pastry','cafe-and-juice-house',
  'cafe-and-restaurant','restaurant','restaurant-and-juice-house','bar-and-restaurant','juice-and-smoothie-bar',
  'ice-cream-and-gelato-shop','pizzeria','fast-food-qsr','food-truck-street-food','dessert-house-sweet-shop',
  'tea-house-bubble-tea','steakhouse-grill-house','sushi-japanese-restaurant','hookah-shisha-lounge','catering-service',
  'cloud-kitchen-delivery-only','bakery-cafe-pastry','bar-and-lounge','brunch-spot-breakfast-diner','butcher-shop-deli') then
  raise exception 'unknown business type' using errcode='23514'; end if;
 b:=p->'branch';
 perform catalog_shape(b,array['publicName','name','city','area','landmark','publicPhone','serviceMode','currency','timezone','hours'],
  array['publicName','name','city','landmark','serviceMode','currency','timezone','hours']);
 perform catalog_text(b->'publicName',160); perform catalog_text(b->'name',160); perform catalog_text(b->'city',160);
 perform catalog_text(b->'area',160,true); perform catalog_text(b->'landmark',300); perform catalog_text(b->'publicPhone',32,true);
 if b->>'currency' is distinct from 'ETB' or b->>'timezone' is distinct from 'Africa/Addis_Ababa'
  or coalesce(b->>'serviceMode','') not in ('MENU_ONLY','DINE_IN','COUNTER') then raise exception 'unsupported branch settings' using errcode='23514'; end if;
 phone:=regexp_replace(coalesce(b->>'publicPhone',''),'[ ()-]','','g');
 if phone<>'' and phone!~'^(\+[1-9][0-9]{7,14}|00[1-9][0-9]{7,14}|0[0-9]{9}|[0-9]{9})$' then raise exception 'invalid public phone' using errcode='23514'; end if;
 if jsonb_typeof(b->'hours') is distinct from 'array' then raise exception 'seven days required' using errcode='23514'; end if;
 if jsonb_array_length(b->'hours')<>7 then raise exception 'seven days required' using errcode='23514'; end if;
 for h in select value from jsonb_array_elements(b->'hours') loop
  perform catalog_shape(h,array['day','status','opens','closes','overnight'],array['day','status']);
  day:=catalog_integer(h->'day',0,6);
  if day=any(days) then raise exception 'duplicate day' using errcode='23514'; end if; days:=array_append(days,day);
  if h->>'status'='OPEN' then
   if coalesce(h->>'opens','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or coalesce(h->>'closes','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or jsonb_typeof(h->'overnight') is distinct from 'boolean' then raise exception 'opening times required' using errcode='23514'; end if;
   if h->>'opens'=h->>'closes' or ((h->>'closes')<(h->>'opens')) is distinct from (h->>'overnight')::boolean then
    raise exception 'ambiguous overnight hours' using errcode='23514'; end if;
  elsif coalesce(h->>'status','') not in ('CLOSED','UNSPECIFIED') or h ?| array['opens','closes','overnight'] then
   raise exception 'invalid closed or unspecified hours' using errcode='23514';
  end if;
 end loop;
end $$;

-- Returns all identities for reservation in deterministic UUID order.
create function menumini.validate_catalog(p jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog,menumini,pg_temp as $$
declare s jsonb; i jsonb; g jsonb; c jsonb; identities jsonb:='[]'; seen uuid[]:='{}'; entity uuid;
 count_items integer:=0; minimum integer; maximum integer; low numeric; high numeric; v numeric; begin
 if p is null or octet_length(p::text)>1048576 then raise exception 'menu body too large or missing' using errcode='23514'; end if;
 perform catalog_shape(p,array['themeId','primaryColor','sections'],array['themeId','primaryColor','sections']);
 if coalesce(p->>'themeId','') not in ('mini-minimal-slate','mini-warm-habesha','mini-bole-bistro','mini-fresh-organic','mini-street-burger','mini-artisan-roastery')
  or coalesce(p->>'primaryColor','')!~'^#[0-9A-Fa-f]{6}$' then raise exception 'invalid menu theme' using errcode='23514'; end if;
 if jsonb_typeof(p->'sections') is distinct from 'array' then raise exception 'sections required' using errcode='23514'; end if;
 if jsonb_array_length(p->'sections') not between 1 and 40 then raise exception 'section limit' using errcode='23514'; end if;
 for s in select value from jsonb_array_elements(p->'sections') loop
  perform catalog_shape(s,array['id','nameEn','nameAm','items'],array['id','nameEn','items']);
  perform catalog_text(s->'nameEn',120); perform catalog_text(s->'nameAm',120,true);
  entity:=catalog_uuid(s->'id'); if entity=any(seen) then raise exception 'duplicate catalog ID' using errcode='23514'; end if;
  seen:=array_append(seen,entity); identities:=identities||jsonb_build_array(jsonb_build_object('id',entity,'kind','SECTION'));
  if jsonb_typeof(s->'items') is distinct from 'array' then raise exception 'items required' using errcode='23514'; end if;
  if jsonb_array_length(s->'items')>200 then raise exception 'section item limit' using errcode='23514'; end if;
  count_items:=count_items+jsonb_array_length(s->'items'); if count_items>1000 then raise exception 'total item limit' using errcode='23514'; end if;
  for i in select value from jsonb_array_elements(s->'items') loop
   perform catalog_shape(i,array['id','nameEn','nameAm','descriptionEn','descriptionAm','basePrice','availableNow','modifiers'],array['id','nameEn','basePrice','availableNow','modifiers']);
   perform catalog_text(i->'nameEn',160); perform catalog_text(i->'nameAm',160,true);
   perform catalog_text(i->'descriptionEn',2000,true,true); perform catalog_text(i->'descriptionAm',2000,true,true);
   low:=catalog_money(i->'basePrice'); high:=low;
   if jsonb_typeof(i->'availableNow') is distinct from 'boolean' then raise exception 'availability flag required' using errcode='23514'; end if;
   entity:=catalog_uuid(i->'id'); if entity=any(seen) then raise exception 'duplicate catalog ID' using errcode='23514'; end if;
   seen:=array_append(seen,entity); identities:=identities||jsonb_build_array(jsonb_build_object('id',entity,'kind','ITEM'));
   if jsonb_typeof(i->'modifiers') is distinct from 'array' then raise exception 'modifier array required' using errcode='23514'; end if;
   if jsonb_array_length(i->'modifiers')>10 then raise exception 'modifier limit' using errcode='23514'; end if;
   for g in select value from jsonb_array_elements(i->'modifiers') loop
    perform catalog_shape(g,array['id','label','mode','minSelections','maxSelections','choices'],array['id','label','mode','minSelections','maxSelections','choices']);
    perform catalog_text(g->'label',120); minimum:=catalog_integer(g->'minSelections',0,30); maximum:=catalog_integer(g->'maxSelections',1,30);
    if coalesce(g->>'mode','') not in ('SINGLE_SELECT','MULTI_SELECT') or minimum>maximum
     or (g->>'mode'='SINGLE_SELECT' and maximum<>1) then raise exception 'invalid modifier selection bounds' using errcode='23514'; end if;
    entity:=catalog_uuid(g->'id'); if entity=any(seen) then raise exception 'duplicate catalog ID' using errcode='23514'; end if;
    seen:=array_append(seen,entity); identities:=identities||jsonb_build_array(jsonb_build_object('id',entity,'kind','GROUP'));
    if jsonb_typeof(g->'choices') is distinct from 'array' then raise exception 'choices required' using errcode='23514'; end if;
    if jsonb_array_length(g->'choices') not between 1 and 30 or maximum>jsonb_array_length(g->'choices') then raise exception 'choice limit' using errcode='23514'; end if;
    for c in select value from jsonb_array_elements(g->'choices') loop
     perform catalog_shape(c,array['id','label','priceDelta','isAvailable'],array['id','label','priceDelta','isAvailable']);
     perform catalog_text(c->'label',120); v:=catalog_money(c->'priceDelta',true);
     if jsonb_typeof(c->'isAvailable') is distinct from 'boolean' then raise exception 'choice availability required' using errcode='23514'; end if;
     entity:=catalog_uuid(c->'id'); if entity=any(seen) then raise exception 'duplicate catalog ID' using errcode='23514'; end if;
     seen:=array_append(seen,entity); identities:=identities||jsonb_build_array(jsonb_build_object('id',entity,'kind','CHOICE'));
    end loop;
    if (select count(*) from jsonb_array_elements(g->'choices') cj(value) where (cj.value->>'isAvailable')::boolean)<minimum then raise exception 'required choices unavailable' using errcode='23514'; end if;
    select low+coalesce(sum(delta) filter(where rn<=minimum or (rn<=maximum and delta<0)),0) into low
     from (select (cj.value->>'priceDelta')::numeric delta,row_number() over(order by (cj.value->>'priceDelta')::numeric asc,cj.value->>'id') rn
      from jsonb_array_elements(g->'choices') cj(value) where (cj.value->>'isAvailable')::boolean) x;
    select high+coalesce(sum(delta) filter(where rn<=minimum or (rn<=maximum and delta>0)),0) into high
     from (select (cj.value->>'priceDelta')::numeric delta,row_number() over(order by (cj.value->>'priceDelta')::numeric desc,cj.value->>'id') rn
      from jsonb_array_elements(g->'choices') cj(value) where (cj.value->>'isAvailable')::boolean) x;
   end loop;
   perform exact_money(low); perform exact_money(high);
  end loop;
 end loop;
 return identities;
end $$;

create function menumini.read_branch_profile(p_venue uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result jsonb; begin
 perform require_permission(p_venue,'catalog.edit');
 select jsonb_build_object('venueId',venue_id,'version',version,'content',content) into result from branch_profile_drafts
  where merchant_id=current_merchant() and venue_id=p_venue;
 return result;
end $$;
create function menumini.read_menu_draft(p_venue uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare result jsonb; begin
 perform require_permission(p_venue,'catalog.edit');
 select jsonb_build_object('venueId',venue_id,'version',version,'content',content) into result from menu_drafts
  where merchant_id=current_merchant() and venue_id=p_venue;
 return result;
end $$;
create function menumini.save_branch_profile(p_venue uuid,p_expected integer,p_content jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare actor uuid; principal_id text; result jsonb; current_version integer; content jsonb; phone text; begin
 perform lock_branch(p_venue);
 if not is_business_owner() then raise exception 'business owner required' using errcode='42501'; end if;
 if exists(select from venues where id=p_venue and archived_at is not null) then raise exception 'branch archived' using errcode='42501'; end if;
 actor:=staff_actor(); principal_id:='STAFF:'||actor;
 perform workflow_request(p_venue,principal_id,'save_profile',p_key,jsonb_build_object('expectedVersion',p_expected,'content',p_content));
 select r.result into result from catalog_command_results r where merchant_id=current_merchant() and venue_id=p_venue
  and principal=principal_id and operation='save_profile' and request_key=p_key;
 if found then return result; end if;
 select version into current_version from branch_profile_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 if p_expected is null or p_expected<>coalesce(current_version,0) then raise exception 'branch profile version conflict' using errcode='40001'; end if;
 perform validate_branch_profile(p_content); content:=p_content;
 phone:=regexp_replace(coalesce(content#>>'{branch,publicPhone}',''),'[ ()-]','','g');
 phone:=case when phone~'^00' then '+'||substr(phone,3) when phone~'^0[0-9]{9}$' then '+251'||substr(phone,2)
  when phone~'^[0-9]{9}$' then '+251'||phone else phone end;
 if content->'branch' ? 'publicPhone' then content:=jsonb_set(content,'{branch,publicPhone}',to_jsonb(phone)); end if;
 insert into branch_profile_drafts(merchant_id,venue_id,version,content,updated_by)
 values(current_merchant(),p_venue,coalesce(current_version,0)+1,content,actor)
 on conflict(merchant_id,venue_id) do update set version=excluded.version,content=excluded.content,updated_by=excluded.updated_by,updated_at=now();
 result:=read_branch_profile(p_venue);
 insert into catalog_command_results values(current_merchant(),p_venue,principal_id,'save_profile',p_key,result);
 perform workflow_event(current_merchant(),p_venue,p_venue,'catalog.profile_saved',jsonb_build_object('version',coalesce(current_version,0)+1),actor);
 return result;
end $$;
create function menumini.save_menu_draft(p_venue uuid,p_expected integer,p_content jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare actor uuid; principal_id text; result jsonb; current_version integer; identities jsonb; identity_row record; begin
 perform lock_branch(p_venue); perform require_permission(p_venue,'catalog.edit');
 if exists(select from venues where id=p_venue and archived_at is not null) then raise exception 'branch archived' using errcode='42501'; end if;
 actor:=staff_actor(); principal_id:='STAFF:'||actor;
 perform workflow_request(p_venue,principal_id,'save_catalog',p_key,jsonb_build_object('expectedVersion',p_expected,'content',p_content));
 select r.result into result from catalog_command_results r where merchant_id=current_merchant() and venue_id=p_venue
  and principal=principal_id and operation='save_catalog' and request_key=p_key;
 if found then return result; end if;
 select version into current_version from menu_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 if p_expected is null or p_expected<>coalesce(current_version,0) then raise exception 'menu draft version conflict' using errcode='40001'; end if;
 identities:=validate_catalog(p_content);
 for identity_row in select * from jsonb_to_recordset(identities) as x(id uuid,kind text) order by id loop
  insert into catalog_identities values(identity_row.id,current_merchant(),p_venue,identity_row.kind) on conflict do nothing;
  if not exists(select from catalog_identities where id=identity_row.id and merchant_id=current_merchant()
   and venue_id=p_venue and kind=identity_row.kind) then raise exception 'catalog identity outside branch or entity type' using errcode='23514'; end if;
 end loop;
 insert into menu_drafts(merchant_id,venue_id,version,content,updated_by)
 values(current_merchant(),p_venue,coalesce(current_version,0)+1,p_content,actor)
 on conflict(merchant_id,venue_id) do update set version=excluded.version,content=excluded.content,updated_by=excluded.updated_by,updated_at=now();
 result:=read_menu_draft(p_venue);
 insert into catalog_command_results values(current_merchant(),p_venue,principal_id,'save_catalog',p_key,result);
 perform workflow_event(current_merchant(),p_venue,p_venue,'catalog.draft_saved',jsonb_build_object('version',coalesce(current_version,0)+1),actor);
 return result;
end $$;

create function menumini.read_public_menu(p_slug text) returns jsonb
language sql stable security definer set search_path=pg_catalog,menumini,pg_temp as $$
 select jsonb_build_object('publicationId',p.id,'revision',p.revision,'venueId',v.id,'venueName',p.snapshot#>>'{branch,publicName}',
  'currency','ETB','availabilityRevision',v.availability_revision,'branch',p.snapshot->'branch',
  'content',jsonb_build_object('themeId',p.snapshot->'themeId','primaryColor',p.snapshot->'primaryColor',
   'sections',(select coalesce(jsonb_agg(s.value||jsonb_build_object('items',
    (select coalesce(jsonb_agg(i.value||jsonb_build_object('availableNow',coalesce(a.available,(i.value->>'availableNow')::boolean)) order by i.ordinality),'[]'::jsonb)
     from jsonb_array_elements(s.value->'items') with ordinality i(value,ordinality)
     left join item_availability a on a.merchant_id=v.merchant_id and a.venue_id=v.id and a.item_id=(i.value->>'id')::uuid)) order by s.ordinality),'[]'::jsonb)
    from jsonb_array_elements(p.snapshot->'sections') with ordinality s(value,ordinality))))
 from venue_routes r join venues v on v.id=r.venue_id and v.merchant_id=r.merchant_id
 join menu_publications p on p.id=r.publication_id and p.venue_id=v.id and p.merchant_id=v.merchant_id
 where r.slug=p_slug and r.is_active and v.archived_at is null and p.source_draft_version is not null
$$;

create function menumini.publish_menu(p_venue uuid,p_draft integer,p_profile integer,p_key uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,menumini,pg_temp as $$
declare actor uuid; principal_id text; publication uuid; result jsonb; draft menu_drafts%rowtype;
 profile branch_profile_drafts%rowtype; v venues%rowtype; snapshot jsonb; revision bigint; s jsonb; i jsonb; g jsonb; c jsonb;
 section_order integer; item_order integer; group_order integer; choice_order integer; identities jsonb; begin
 perform lock_branch(p_venue); perform require_permission(p_venue,'catalog.publish'); actor:=staff_actor(); principal_id:='STAFF:'||actor;
 select * into v from venues where id=p_venue and merchant_id=current_merchant();
 if v.archived_at is not null then raise exception 'branch archived' using errcode='42501'; end if;
 publication:=workflow_request(p_venue,principal_id,'publish_catalog',p_key,jsonb_build_object('draftVersion',p_draft,'profileVersion',p_profile));
 select r.result into result from catalog_command_results r where merchant_id=current_merchant() and venue_id=p_venue
  and principal=principal_id and operation='publish_catalog' and request_key=p_key;
 if found then return result; end if;
 select * into draft from menu_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 select * into profile from branch_profile_drafts where merchant_id=current_merchant() and venue_id=p_venue;
 if p_draft is null or p_profile is null or draft.version is distinct from p_draft or profile.version is distinct from p_profile then
  raise exception 'publication draft/profile version conflict' using errcode='40001'; end if;
 identities:=validate_catalog(draft.content); perform validate_branch_profile(profile.content);
 if not exists(select from jsonb_array_elements(draft.content->'sections') js(value) cross join lateral jsonb_array_elements(js.value->'items') ji(value)) then
  raise exception 'menu needs an actual item' using errcode='23514'; end if;
 if not exists(select from venue_routes where venue_id=p_venue and merchant_id=current_merchant()) and not exists(
  select from jsonb_array_elements(draft.content->'sections') js(value) cross join lateral jsonb_array_elements(js.value->'items') ji(value) where (ji.value->>'availableNow')::boolean) then
  raise exception 'initial menu needs an available item' using errcode='23514'; end if;
 update menu_sections set archived_at=now() where merchant_id=current_merchant() and venue_id=p_venue;
 update menu_items set archived_at=now() where merchant_id=current_merchant() and venue_id=p_venue;
 update modifier_groups set archived_at=now() where merchant_id=current_merchant() and venue_id=p_venue;
 update modifier_choices set archived_at=now() where merchant_id=current_merchant() and venue_id=p_venue;
 section_order:=0;
 for s in select value from jsonb_array_elements(draft.content->'sections') loop
  insert into menu_sections(id,merchant_id,venue_id,name_en,name_am,sort_order)
  values((s->>'id')::uuid,current_merchant(),p_venue,btrim(s->>'nameEn'),s->>'nameAm',section_order)
  on conflict(id) do update set name_en=excluded.name_en,name_am=excluded.name_am,sort_order=excluded.sort_order,archived_at=null;
  section_order:=section_order+1; item_order:=0;
  for i in select value from jsonb_array_elements(s->'items') loop
   insert into menu_items(id,merchant_id,venue_id,section_id,name_en,name_am,description_en,description_am,base_price,available_now,sort_order)
   values((i->>'id')::uuid,current_merchant(),p_venue,(s->>'id')::uuid,btrim(i->>'nameEn'),i->>'nameAm',coalesce(i->>'descriptionEn',''),i->>'descriptionAm',
    (i->>'basePrice')::numeric,(i->>'availableNow')::boolean,item_order)
   on conflict(id) do update set section_id=excluded.section_id,name_en=excluded.name_en,name_am=excluded.name_am,
    description_en=excluded.description_en,description_am=excluded.description_am,base_price=excluded.base_price,
    available_now=excluded.available_now,sort_order=excluded.sort_order,archived_at=null;
   item_order:=item_order+1; group_order:=0;
   for g in select value from jsonb_array_elements(i->'modifiers') loop
    insert into modifier_groups(id,merchant_id,venue_id,item_id,label,mode,min_selections,max_selections,sort_order)
    values((g->>'id')::uuid,current_merchant(),p_venue,(i->>'id')::uuid,g->>'label',g->>'mode',(g->>'minSelections')::integer,(g->>'maxSelections')::integer,group_order)
    on conflict(id) do update set item_id=excluded.item_id,label=excluded.label,mode=excluded.mode,min_selections=excluded.min_selections,max_selections=excluded.max_selections,sort_order=excluded.sort_order,archived_at=null;
    group_order:=group_order+1; choice_order:=0;
    for c in select value from jsonb_array_elements(g->'choices') loop
     insert into modifier_choices(id,merchant_id,venue_id,group_id,label,price_delta,is_available,sort_order)
     values((c->>'id')::uuid,current_merchant(),p_venue,(g->>'id')::uuid,c->>'label',(c->>'priceDelta')::numeric,(c->>'isAvailable')::boolean,choice_order)
     on conflict(id) do update set group_id=excluded.group_id,label=excluded.label,price_delta=excluded.price_delta,is_available=excluded.is_available,sort_order=excluded.sort_order,archived_at=null;
     choice_order:=choice_order+1;
    end loop;
   end loop;
  end loop;
 end loop;
 snapshot:=draft.content||jsonb_build_object('branch',profile.content->'branch');
 select coalesce(max(p.revision),0)+1 into revision from menu_publications p where p.merchant_id=current_merchant() and p.venue_id=p_venue;
 insert into menu_publications(id,merchant_id,venue_id,revision,snapshot,content_hash,published_by,source_draft_version,source_profile_version)
 values(publication,current_merchant(),p_venue,revision,snapshot,encode(sha256(convert_to(snapshot::text,'UTF8')),'hex'),actor,p_draft,p_profile);
 insert into venue_routes(slug,merchant_id,venue_id,publication_id) values(v.public_slug,current_merchant(),p_venue,publication)
 on conflict(slug) do update set publication_id=excluded.publication_id,is_active=true;
 result:=read_public_menu(v.public_slug);
 insert into catalog_command_results values(current_merchant(),p_venue,principal_id,'publish_catalog',p_key,result);
 perform workflow_event(current_merchant(),p_venue,publication,'catalog.published',jsonb_build_object('revision',revision,'draftVersion',p_draft,'profileVersion',p_profile),actor);
 return result;
end $$;

grant usage,create on schema menumini to menu_workflow_owner;
grant select,insert,update on menumini.branch_profile_drafts,menumini.menu_drafts,menumini.catalog_identities,menumini.catalog_command_results to menu_workflow_owner;
do $$ declare t text; begin
 foreach t in array array['branch_profile_drafts','menu_drafts','catalog_identities','catalog_command_results'] loop
  execute format('alter table menumini.%I enable row level security',t);
  execute format('alter table menumini.%I force row level security',t);
  execute format('create policy private_workflow_owner on menumini.%I to menu_workflow_owner using(true) with check(true)',t);
  if t in ('branch_profile_drafts','menu_drafts') then
   execute format('create policy catalog_draft_read on menumini.%I for select to menu_runtime using(merchant_id=menumini.current_merchant() and menumini.has_permission(venue_id,''catalog.edit''))',t);
  end if;
 end loop;
end $$;
grant select on menumini.branch_profile_drafts,menumini.menu_drafts to menu_runtime;
revoke all on all functions in schema menumini from public;
grant execute on all functions in schema menumini to menu_workflow_owner;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='menumini' and p.proname in ('catalog_shape','catalog_text','catalog_uuid','catalog_integer','catalog_money','validate_branch_profile','validate_catalog',
  'reserve_catalog_identity','read_branch_profile','read_menu_draft','save_branch_profile','save_menu_draft','read_public_menu','publish_menu') loop
  execute format('alter function %s owner to menu_workflow_owner',f.identity);
 end loop;
end $$;
revoke create on schema menumini from menu_workflow_owner;
grant execute on function menumini.read_branch_profile(uuid),menumini.read_menu_draft(uuid),
 menumini.save_branch_profile(uuid,integer,jsonb,uuid),menumini.save_menu_draft(uuid,integer,jsonb,uuid),menumini.publish_menu(uuid,integer,integer,uuid) to menu_runtime;
grant usage on schema menumini to menu_public;
grant execute on function menumini.read_public_menu(text) to menu_public;
commit;
