-- ============================================================================
-- MenuMini & MenuPro: Database Login Roles & Permissions Provisioning
-- File: database/roles.sql
-- Target: PostgreSQL 18+ (Database: menumini / menumini_db)
-- ============================================================================
-- Provisions external runtime login accounts with secure credentials matching .env
-- and grants membership in internal non-login schema roles.
--
-- Security Model & Invariants:
-- 1. menu_admin: Cluster administrator and migration runner (SUPERUSER).
--    Used by web backend auth pool for merchant registration and session management.
-- 2. menu_workspace_runtime: Merchant & staff workspace connection account.
--    MUST be granted membership in menu_runtime.
--    MUST NOT have rolsuper, rolbypassrls, or membership in menu_workflow_owner,
--    menu_platform, or menu_identity (strictly enforced by handshake safety query).
-- 3. menu_customer: Anonymous public customer menu browsing account.
--    MUST be granted membership in menu_public.
--    MUST NOT have rolsuper, rolbypassrls, or membership in menu_workflow_owner,
--    menu_runtime, menu_identity, or menu_platform (strictly enforced by handshake).
-- 4. menu_guest_runtime: Anonymous diner table session & ordering account.
--    MUST be granted membership in menu_guest_api.
--    MUST NOT have rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication,
--    or membership in menu_runtime, menu_workflow_owner, menu_identity, menu_platform.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- Step 1: Ensure Internal Non-Login Schema Roles Exist
-- (These are typically created by migrations 0001, 0002, 0005, 0009; ensuring
--  existence guarantees roles.sql can be executed independently)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_runtime') THEN
    CREATE ROLE menu_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_public') THEN
    CREATE ROLE menu_public NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_guest_api') THEN
    CREATE ROLE menu_guest_api NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_identity') THEN
    CREATE ROLE menu_identity NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_workflow_owner') THEN
    CREATE ROLE menu_workflow_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_platform') THEN
    CREATE ROLE menu_platform NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 2: Provision External Runtime Login Users with Passwords matching .env
-- ----------------------------------------------------------------------------

-- 1. Cluster Administrator & Migration Runner
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_admin') THEN
    CREATE ROLE menu_admin WITH LOGIN SUPERUSER PASSWORD 'menumini_admin_dev';
  ELSE
    ALTER ROLE menu_admin WITH LOGIN SUPERUSER PASSWORD 'menumini_admin_dev';
  END IF;
END $$;

-- 2. Merchant & Staff Application Runtime Principal
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_workspace_runtime') THEN
    CREATE ROLE menu_workspace_runtime WITH LOGIN PASSWORD 'menumini_merchant_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
  ELSE
    ALTER ROLE menu_workspace_runtime WITH LOGIN PASSWORD 'menumini_merchant_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
  END IF;
END $$;

-- 3. Public Customer Menu Reader Principal
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_customer') THEN
    CREATE ROLE menu_customer WITH LOGIN PASSWORD 'menumini_customer_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
  ELSE
    ALTER ROLE menu_customer WITH LOGIN PASSWORD 'menumini_customer_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
  END IF;
END $$;

-- 4. Guest Diner Table Ordering & Payer Principal
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'menu_guest_runtime') THEN
    CREATE ROLE menu_guest_runtime WITH LOGIN PASSWORD 'menumini_guest_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
  ELSE
    ALTER ROLE menu_guest_runtime WITH LOGIN PASSWORD 'menumini_guest_dev'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 3: Grant Membership in Internal Schema Roles (Idempotent)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT pg_has_role('menu_workspace_runtime', 'menu_runtime', 'MEMBER') THEN
    GRANT menu_runtime TO menu_workspace_runtime;
  END IF;
  IF NOT pg_has_role('menu_customer', 'menu_public', 'MEMBER') THEN
    GRANT menu_public TO menu_customer;
  END IF;
  IF NOT pg_has_role('menu_guest_runtime', 'menu_guest_api', 'MEMBER') THEN
    GRANT menu_guest_api TO menu_guest_runtime;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 4: Revoke Forbidden Roles (Enforce Defense-in-Depth Handshake Invariants)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Workspace runtime must not have workflow_owner, platform, or identity
  IF pg_has_role('menu_workspace_runtime', 'menu_workflow_owner', 'MEMBER') THEN
    REVOKE menu_workflow_owner FROM menu_workspace_runtime;
  END IF;
  IF pg_has_role('menu_workspace_runtime', 'menu_platform', 'MEMBER') THEN
    REVOKE menu_platform FROM menu_workspace_runtime;
  END IF;
  IF pg_has_role('menu_workspace_runtime', 'menu_identity', 'MEMBER') THEN
    REVOKE menu_identity FROM menu_workspace_runtime;
  END IF;

  -- Customer runtime must not have runtime, workflow_owner, platform, or identity
  IF pg_has_role('menu_customer', 'menu_runtime', 'MEMBER') THEN
    REVOKE menu_runtime FROM menu_customer;
  END IF;
  IF pg_has_role('menu_customer', 'menu_workflow_owner', 'MEMBER') THEN
    REVOKE menu_workflow_owner FROM menu_customer;
  END IF;
  IF pg_has_role('menu_customer', 'menu_platform', 'MEMBER') THEN
    REVOKE menu_platform FROM menu_customer;
  END IF;
  IF pg_has_role('menu_customer', 'menu_identity', 'MEMBER') THEN
    REVOKE menu_identity FROM menu_customer;
  END IF;

  -- Guest runtime must not have runtime, workflow_owner, platform, or identity
  IF pg_has_role('menu_guest_runtime', 'menu_runtime', 'MEMBER') THEN
    REVOKE menu_runtime FROM menu_guest_runtime;
  END IF;
  IF pg_has_role('menu_guest_runtime', 'menu_workflow_owner', 'MEMBER') THEN
    REVOKE menu_workflow_owner FROM menu_guest_runtime;
  END IF;
  IF pg_has_role('menu_guest_runtime', 'menu_platform', 'MEMBER') THEN
    REVOKE menu_platform FROM menu_guest_runtime;
  END IF;
  IF pg_has_role('menu_guest_runtime', 'menu_identity', 'MEMBER') THEN
    REVOKE menu_identity FROM menu_guest_runtime;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 5: Database Connection & Schema Usage Privileges
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Grant connect on current database to all runtime login users
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO menu_workspace_runtime, menu_customer, menu_guest_runtime', current_database());
  
  -- Grant usage on schema menumini if schema already exists
  IF EXISTS (SELECT FROM pg_namespace WHERE nspname = 'menumini') THEN
    GRANT USAGE ON SCHEMA menumini TO menu_workspace_runtime, menu_customer, menu_guest_runtime;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 6: Post-Provisioning Safety Validation Assertion
-- Verifies that each connecting principal satisfies application safety queries.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_merchant_safe boolean;
  v_customer_safe boolean;
  v_guest_safe boolean;
BEGIN
  -- 1. Check menu_workspace_runtime safety contract
  SELECT not r.rolsuper and not r.rolbypassrls and pg_has_role('menu_workspace_runtime', 'menu_runtime', 'MEMBER')
    and not pg_has_role('menu_workspace_runtime', 'menu_workflow_owner', 'MEMBER')
    and not pg_has_role('menu_workspace_runtime', 'menu_platform', 'MEMBER')
    and not pg_has_role('menu_workspace_runtime', 'menu_identity', 'MEMBER') INTO v_merchant_safe
  FROM pg_roles r WHERE r.rolname = 'menu_workspace_runtime';

  IF NOT coalesce(v_merchant_safe, false) THEN
    RAISE EXCEPTION 'CRITICAL: menu_workspace_runtime failed application safety check!';
  END IF;

  -- 2. Check menu_customer safety contract
  SELECT not r.rolsuper and not r.rolbypassrls and pg_has_role('menu_customer', 'menu_public', 'MEMBER')
    and not pg_has_role('menu_customer', 'menu_workflow_owner', 'MEMBER')
    and not pg_has_role('menu_customer', 'menu_runtime', 'MEMBER')
    and not pg_has_role('menu_customer', 'menu_identity', 'MEMBER')
    and not pg_has_role('menu_customer', 'menu_platform', 'MEMBER') INTO v_customer_safe
  FROM pg_roles r WHERE r.rolname = 'menu_customer';

  IF NOT coalesce(v_customer_safe, false) THEN
    RAISE EXCEPTION 'CRITICAL: menu_customer failed application safety check!';
  END IF;

  -- 3. Check menu_guest_runtime safety contract
  SELECT not r.rolsuper and not r.rolbypassrls and not r.rolcreaterole and not r.rolcreatedb and not r.rolreplication
    and pg_has_role('menu_guest_runtime', 'menu_guest_api', 'MEMBER')
    and not pg_has_role('menu_guest_runtime', 'menu_runtime', 'MEMBER')
    and not pg_has_role('menu_guest_runtime', 'menu_workflow_owner', 'MEMBER')
    and not pg_has_role('menu_guest_runtime', 'menu_identity', 'MEMBER')
    and not pg_has_role('menu_guest_runtime', 'menu_platform', 'MEMBER') INTO v_guest_safe
  FROM pg_roles r WHERE r.rolname = 'menu_guest_runtime';

  IF NOT coalesce(v_guest_safe, false) THEN
    RAISE EXCEPTION 'CRITICAL: menu_guest_runtime failed application safety check!';
  END IF;

  RAISE NOTICE 'SUCCESS: All runtime roles provisioned, granted, and verified against application safety contracts.';
END $$;
