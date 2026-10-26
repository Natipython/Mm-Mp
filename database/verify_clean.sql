-- ============================================================================
-- MenuMini & MenuPro: Zero-Sample-Data Verification Query Script
-- File: database/verify_clean.sql
-- Target: PostgreSQL 18+ (Database: menumini / menumini_db)
-- ============================================================================
-- Enforces Requirement R1: Pristine Zero-Sample-Data Service Foundation.
-- Asserts exactly ZERO rows in core business tables (merchants, venues,
-- menu_items, app_users) and dynamically verifies that all regular tables in
-- schema menumini are 100% clean of fictional seed data.
--
-- Execution Behavior:
-- - Outputs visual audit report for operations and CI logs.
-- - Aborts with non-zero exit code (exit code 3) if any unwanted rows exist.
-- - Exits with code 0 on pristine database.
-- ============================================================================

\set ON_ERROR_STOP on

\echo '============================================================================'
\echo '=== ZERO-SAMPLE DATA VERIFICATION: AUDIT REPORT'
\echo '============================================================================'

WITH table_counts AS (
  SELECT 'menumini.merchants' AS table_name, count(*) AS row_count FROM menumini.merchants
  UNION ALL SELECT 'menumini.businesses', count(*) FROM menumini.businesses
  UNION ALL SELECT 'menumini.venues', count(*) FROM menumini.venues
  UNION ALL SELECT 'menumini.menu_items', count(*) FROM menumini.menu_items
  UNION ALL SELECT 'menumini.app_users', count(*) FROM menumini.app_users
  UNION ALL SELECT 'menumini.merchant_memberships', count(*) FROM menumini.merchant_memberships
  UNION ALL SELECT 'menumini.business_routes', count(*) FROM menumini.business_routes
  UNION ALL SELECT 'menumini.venue_routes', count(*) FROM menumini.venue_routes
  UNION ALL SELECT 'menumini.menu_sections', count(*) FROM menumini.menu_sections
  UNION ALL SELECT 'menumini.modifier_groups', count(*) FROM menumini.modifier_groups
  UNION ALL SELECT 'menumini.modifier_choices', count(*) FROM menumini.modifier_choices
  UNION ALL SELECT 'menumini.menu_drafts', count(*) FROM menumini.menu_drafts
  UNION ALL SELECT 'menumini.branch_profile_drafts', count(*) FROM menumini.branch_profile_drafts
  UNION ALL SELECT 'menumini.menu_publications', count(*) FROM menumini.menu_publications
  UNION ALL SELECT 'menumini.catalog_identities', count(*) FROM menumini.catalog_identities
  UNION ALL SELECT 'menumini.dining_tables', count(*) FROM menumini.dining_tables
  UNION ALL SELECT 'menumini.dining_sessions', count(*) FROM menumini.dining_sessions
  UNION ALL SELECT 'menumini.table_visits', count(*) FROM menumini.table_visits
  UNION ALL SELECT 'menumini.visit_guests', count(*) FROM menumini.visit_guests
  UNION ALL SELECT 'menumini.orders', count(*) FROM menumini.orders
  UNION ALL SELECT 'menumini.order_lines', count(*) FROM menumini.order_lines
  UNION ALL SELECT 'menumini.order_events', count(*) FROM menumini.order_events
  UNION ALL SELECT 'menumini.bills', count(*) FROM menumini.bills
  UNION ALL SELECT 'menumini.bill_charges', count(*) FROM menumini.bill_charges
  UNION ALL SELECT 'menumini.bill_access_grants', count(*) FROM menumini.bill_access_grants
  UNION ALL SELECT 'menumini.bill_payment_claims', count(*) FROM menumini.bill_payment_claims
  UNION ALL SELECT 'menumini.payment_ledger', count(*) FROM menumini.payment_ledger
  UNION ALL SELECT 'menumini.payment_allocations', count(*) FROM menumini.payment_allocations
  UNION ALL SELECT 'menumini.staff_sessions', count(*) FROM menumini.staff_sessions
  UNION ALL SELECT 'menumini.outbox_events', count(*) FROM menumini.outbox_events
  UNION ALL SELECT 'menumini.audit_events', count(*) FROM menumini.audit_events
)
SELECT 
  table_name,
  row_count,
  CASE WHEN row_count = 0 THEN 'CLEAN (PASS)' ELSE 'DIRTY (FAIL)' END AS status
FROM table_counts
ORDER BY table_name;

-- ----------------------------------------------------------------------------
-- Hard PL/pgSQL Assertion Gate
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  v_count bigint;
  v_violations text := '';
  v_total_violations bigint := 0;
  v_merchants bigint;
  v_businesses bigint;
  v_venues bigint;
  v_menu_items bigint;
  v_app_users bigint;
BEGIN
  -- 1. Explicit core table assertions (R1 mandate)
  SELECT count(*) INTO v_merchants FROM menumini.merchants;
  SELECT count(*) INTO v_businesses FROM menumini.businesses;
  SELECT count(*) INTO v_venues FROM menumini.venues;
  SELECT count(*) INTO v_menu_items FROM menumini.menu_items;
  SELECT count(*) INTO v_app_users FROM menumini.app_users;

  IF v_merchants > 0 OR v_businesses > 0 OR v_venues > 0 OR v_menu_items > 0 OR v_app_users > 0 THEN
    RAISE EXCEPTION 'ZERO_SAMPLE_ASSERTION_FAILED on core tables! merchants=%, businesses=%, venues=%, menu_items=%, app_users=%',
      v_merchants, v_businesses, v_venues, v_menu_items, v_app_users;
  END IF;

  -- 2. Exhaustive scan of all regular tables in menumini schema
  FOR r IN (
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'menumini'
      AND c.relkind = 'r'
    ORDER BY c.relname
  ) LOOP
    EXECUTE format('SELECT count(*) FROM menumini.%I', r.tbl) INTO v_count;
    IF v_count > 0 THEN
      v_total_violations := v_total_violations + v_count;
      v_violations := v_violations || format(E'\n  - menumini.%s: %s rows', r.tbl, v_count);
    END IF;
  END LOOP;

  IF v_total_violations > 0 THEN
    RAISE EXCEPTION 'ZERO_SAMPLE_ASSERTION_FAILED: % non-seed rows detected across schema menumini:%',
      v_total_violations, v_violations;
  END IF;

  RAISE NOTICE 'ZERO_SAMPLE_ASSERTION_PASSED: All tables in schema menumini are 100%% pristine with 0 records.';
END $$;
