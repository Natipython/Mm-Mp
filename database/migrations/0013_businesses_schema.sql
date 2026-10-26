-- 0013_businesses_schema.sql
-- MenuMini & MenuPro: Universal Business Migration
-- Creates first-class 'businesses', 'business_routes', and 'business_payment_accounts' schemas
-- Adds 'business_id' alias across all domain tables.

BEGIN;

-- 1. Add business_id generated alias column to menumini.venues
ALTER TABLE menumini.venues ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (id) STORED;

-- 2. Add business_id generated alias column to all base tables referencing venue_id
ALTER TABLE menumini.bill_access_grants ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.bill_charges ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.bill_payment_claims ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.bills ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.branch_profile_drafts ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.branch_staff ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.catalog_command_results ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.catalog_identities ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.command_cancellations ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.dining_sessions ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.dining_tables ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.item_availability ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.media_assets ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.menu_drafts ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.menu_items ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.menu_publications ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.menu_sections ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.modifier_choices ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.modifier_groups ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.order_events ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.order_lines ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.orders ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.outbox_events ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.payment_allocations ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.payment_claims ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.payment_ledger ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.receipt_refunds ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.recorded_receipts ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.refund_requests ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.service_command_results ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.service_drafts ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.table_visits ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.venue_payment_accounts ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.venue_routes ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.visit_guests ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;
ALTER TABLE menumini.workflow_requests ADD COLUMN IF NOT EXISTS business_id uuid GENERATED ALWAYS AS (venue_id) STORED;

-- 3. Create updatable views for businesses, business_routes, and business_payment_accounts
CREATE OR REPLACE VIEW menumini.businesses AS 
  SELECT * FROM menumini.venues;

CREATE OR REPLACE VIEW menumini.business_routes AS 
  SELECT * FROM menumini.venue_routes;

CREATE OR REPLACE VIEW menumini.business_payment_accounts AS 
  SELECT * FROM menumini.venue_payment_accounts;

-- 4. Grant runtime and admin permissions on business schemas
GRANT USAGE ON SCHEMA menumini TO menu_runtime, menu_identity, menu_admin;
GRANT ALL ON menumini.businesses TO menu_admin, menu_runtime;
GRANT ALL ON menumini.business_routes TO menu_admin, menu_runtime;
GRANT ALL ON menumini.business_payment_accounts TO menu_admin, menu_runtime;

COMMIT;
