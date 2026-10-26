-- Allow optional branch landmark during validation and publication
begin;

create or replace function menumini.validate_branch_profile(p jsonb) returns void
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
  array['publicName','name','city','serviceMode','currency','timezone','hours']);
 perform catalog_text(b->'publicName',160); perform catalog_text(b->'name',160); perform catalog_text(b->'city',160);
 perform catalog_text(b->'area',160,true); perform catalog_text(b->'landmark',300,true); perform catalog_text(b->'publicPhone',32,true);
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

commit;
