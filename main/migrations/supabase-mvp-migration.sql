-- SnapFlow MVP Supabase Schema Migration
-- This migration creates the proper schema for MVP with:
-- - GitHub + Zoho Projects integration
-- - Proper RLS policies
-- - Indexes for performance
-- - Removal of unused tables (gmail_sync_log, latest_gmail_syncs)

-- ============================================================================
-- DROP UNUSED TABLES
-- ============================================================================
DROP TABLE IF EXISTS gmail_sync_log CASCADE;
DROP TABLE IF EXISTS latest_gmail_syncs CASCADE;

-- ============================================================================
-- CREATE TYPES (drop existing first to avoid conflicts)
-- ============================================================================
DROP TYPE IF EXISTS connector_type CASCADE;
DROP TYPE IF EXISTS issue_type CASCADE;
DROP TYPE IF EXISTS sync_status CASCADE;
DROP TYPE IF EXISTS sync_type CASCADE;
DROP TYPE IF EXISTS sync_job_status CASCADE;

CREATE TYPE connector_type AS ENUM ('github', 'zoho');
CREATE TYPE issue_type AS ENUM ('screenshot', 'recording');
CREATE TYPE sync_status AS ENUM ('local', 'synced', 'syncing', 'failed');
CREATE TYPE sync_type AS ENUM ('push', 'pull', 'full');
CREATE TYPE sync_job_status AS ENUM ('in_progress', 'completed', 'failed');
CREATE TYPE user_role AS ENUM ('admin', 'pm', 'qa', 'dev', 'client');

-- ============================================================================
-- DROP EXISTING TABLES (if they exist with old schema)
-- ============================================================================
DROP TABLE IF EXISTS sync_history CASCADE;
DROP TABLE IF EXISTS connectors CASCADE;
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Tenants: Companies/Organizations
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces: Projects within tenants
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Workspace Members: Users with roles in workspaces
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'dev',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Connectors: GitHub & Zoho Projects integrations (workspace-scoped)
CREATE TABLE connectors (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type connector_type NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- Issues: Screenshots and recordings (workspace-scoped)
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  type issue_type NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_path TEXT,
  thumbnail_path TEXT,
  cloud_file_url TEXT,
  cloud_thumbnail_url TEXT,
  sync_status sync_status DEFAULT 'local',
  synced_to JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync History: Track all sync operations (workspace-scoped)
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  sync_type sync_type NOT NULL,
  status sync_job_status DEFAULT 'in_progress',
  synced_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_counts CHECK (synced_count >= 0 AND failed_count >= 0 AND total_count >= 0)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Tenants: Owner can do all, members can read
CREATE POLICY "tenant_owner_all" ON tenants
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "tenant_member_read" ON tenants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE w.tenant_id = tenants.id AND wm.user_id = auth.uid()
    )
  );

-- Workspaces: Members can read, admins/pms can update
CREATE POLICY "workspace_member_read" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_admin_pm_write" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND role IN ('admin', 'pm')
    )
  );

-- Workspace Members: Admins can manage
CREATE POLICY "workspace_member_admin_manage" ON workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = auth.uid()
      AND wm2.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
      AND wm2.user_id = auth.uid()
      AND wm2.role = 'admin'
    )
  );

-- Issues: All members can read, based on role restrictions
CREATE POLICY "issue_member_read" ON issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = issues.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "issue_create_dev_qa_pm" ON issues
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = issues.workspace_id
      AND user_id = auth.uid()
      AND role IN ('dev', 'qa', 'pm', 'admin')
    )
  );

CREATE POLICY "issue_update_owner_or_admin" ON issues
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = issues.workspace_id
      AND user_id = auth.uid()
      AND role IN ('pm', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = issues.workspace_id
      AND user_id = auth.uid()
      AND role IN ('pm', 'admin')
    )
  );

-- Connectors: Members can read, admin/pm can manage
CREATE POLICY "connector_member_read" ON connectors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = connectors.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "connector_admin_pm_write" ON connectors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = connectors.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'pm')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = connectors.workspace_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'pm')
    )
  );

-- Sync History: Members can read
CREATE POLICY "sync_history_member_read" ON sync_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = sync_history.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "sync_history_create" ON sync_history
  FOR INSERT WITH CHECK (
    auth.uid() = initiated_by AND
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = sync_history.workspace_id AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tenant indexes
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);

-- Workspace indexes
CREATE INDEX idx_workspaces_tenant_id ON workspaces(tenant_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- Workspace member indexes
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members(role);

-- Connector indexes
CREATE INDEX idx_connectors_workspace_id ON connectors(workspace_id);
CREATE INDEX idx_connectors_type ON connectors(type);
CREATE INDEX idx_connectors_workspace_type ON connectors(workspace_id, type);

-- Issue indexes
CREATE INDEX idx_issues_workspace_id ON issues(workspace_id);
CREATE INDEX idx_issues_sync_status ON issues(sync_status);
CREATE INDEX idx_issues_timestamp ON issues(timestamp DESC);
CREATE INDEX idx_issues_workspace_timestamp ON issues(workspace_id, timestamp DESC);
CREATE INDEX idx_issues_created_by ON issues(created_by);

-- Sync history indexes
CREATE INDEX idx_sync_history_workspace_id ON sync_history(workspace_id);
CREATE INDEX idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX idx_sync_history_workspace_status ON sync_history(workspace_id, status);

-- ============================================================================
-- NOTES FOR MANUAL SETUP
-- ============================================================================
/*
  MULTI-TENANT ARCHITECTURE:

  Hierarchy:
    Tenant (Company/Org)
      └─ Workspace (Project)
         └─ Issues (Screenshots/Recordings)
         └─ Connectors (GitHub/Zoho)
         └─ Team Members (Users with Roles)

  USER ROLES:
    - admin:  Full control of workspace, can manage team members
    - pm:     Can create/edit workspaces, manage connectors, review issues
    - qa:     Can create issues, run tests, review
    - dev:    Can create issues, submit code/work
    - client: View-only access to issues and reports

  ROW LEVEL SECURITY (RLS):
    - Tenants: Owner has full access, members can view
    - Workspaces: Members can view, admin/PM can edit
    - Issues: Members can view, creator/admin/PM can edit
    - Connectors: Members can view, admin/PM can manage
    - Workspace Members: Only admins can manage team

  After running this migration:

  1. Google OAuth Setup (via Supabase Dashboard):
     - Go to Authentication > Providers > Google
     - Enable Google
     - Add your Google OAuth credentials (client ID, client secret)
     - Add redirect URL: `snapflow://auth/callback` (custom scheme for Electron)

  2. Storage Bucket:
     - Keep existing `snapflow-public-bucket` bucket
     - Ensure it's configured as public
     - Update CORS if necessary for Electron fetch

  3. Environment Variables:
     - SUPABASE_URL: Your Supabase project URL
     - SUPABASE_ANON_KEY: Your anon key

  4. Code Changes Needed:
     - Update TypeScript types (add Tenant, Workspace interfaces)
     - Update ConnectorService with Zoho methods
     - Update auth page with Google sign-in button
     - Register deep link handler in Electron main process
     - Update IPC handlers for workspace operations
     - Update home page to show workspaces instead of just issues
     - Add workspace switcher UI component
     - Add team management UI for admins/PMs
*/
