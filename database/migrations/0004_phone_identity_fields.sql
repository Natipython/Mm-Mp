-- Optional emails must remain optional in the identity model too.
-- These fields do not implement phone verification or grant a session.
begin;
alter table menumini.app_users alter column email drop not null;
alter table menumini.app_users add column phone_e164 text unique
 check(phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
alter table menumini.app_users add column phone_verified_at timestamptz;
alter table menumini.app_users add constraint identity_contact_required check(email is not null or phone_e164 is not null);
alter table menumini.app_users add constraint verified_phone_present check(phone_verified_at is null or phone_e164 is not null);
comment on column menumini.app_users.phone_verified_at is 'Only a trusted identity adapter may set this after real code verification. Phone possession does not verify legal business ownership.';
commit;
