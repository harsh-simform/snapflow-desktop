import { getSupabase } from "../utils/supabase";
import log from "electron-log";
import type { Workspace, WorkspaceMember, UserRole } from "../../renderer/types";

/**
 * Helper: Slugify a string
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class WorkspaceService {
  /**
   * Create a new workspace within a tenant
   * Automatically adds the creator as an 'admin' member
   */
  async createWorkspace(
    userId: string,
    tenantId: string,
    name: string,
    description?: string
  ): Promise<Workspace> {
    log.info("[Workspace Service] === CREATE WORKSPACE START ===");
    log.info("[Workspace Service] User ID:", userId);
    log.info("[Workspace Service] Tenant ID:", tenantId);
    log.info("[Workspace Service] Workspace name:", name);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Workspace Service] ✗ Supabase not configured");
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    let slug = slugify(name);
    let originalSlug = slug;
    let attempt = 2;

    // Handle UNIQUE(tenant_id, slug) constraint by appending -2, -3, etc.
    while (true) {
      const { data: existing } = await supabase
        .from("workspaces")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("slug", slug)
        .single();

      if (!existing) {
        break; // slug is unique within tenant, use it
      }

      slug = `${originalSlug}-${attempt}`;
      attempt++;
    }

    log.info("[Workspace Service] Using slug:", slug);

    // Insert workspace
    const { data: workspaceData, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({
        tenant_id: tenantId,
        name,
        slug,
        description: description || null,
        created_by: userId,
      })
      .select()
      .single();

    if (workspaceError) {
      log.error("[Workspace Service] ✗ Create workspace error:", workspaceError.message);
      throw new Error(workspaceError.message);
    }

    if (!workspaceData) {
      log.error("[Workspace Service] ✗ No workspace data returned");
      throw new Error("Failed to create workspace");
    }

    const workspace = this.mapSupabaseWorkspace(workspaceData);

    // Auto-add creator as admin member
    log.info("[Workspace Service] Adding creator as admin member");
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: "admin",
      });

    if (memberError) {
      log.error("[Workspace Service] ✗ Error adding creator as member:", memberError.message);
      // Don't throw — workspace was created, member add just failed (maybe duplicate)
      // Let the workspace be created anyway
    } else {
      log.info("[Workspace Service] ✓ Creator added as admin member");
    }

    log.info("[Workspace Service] ✓ Workspace created successfully");
    log.info("[Workspace Service] Workspace ID:", workspace.id);
    log.info("[Workspace Service] === CREATE WORKSPACE END ===");
    return workspace;
  }

  /**
   * List all workspaces in a tenant
   */
  async listWorkspaces(tenantId: string): Promise<Workspace[]> {
    log.info("[Workspace Service] Listing workspaces for tenant:", tenantId);

    const supabase = getSupabase();
    if (!supabase) {
      log.warn("[Workspace Service] Supabase not configured");
      return [];
    }

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("[Workspace Service] Error listing workspaces:", error.message);
      return [];
    }

    return (data || []).map(ws => this.mapSupabaseWorkspace(ws));
  }

  /**
   * Get workspace by ID
   */
  async getWorkspaceById(id: string): Promise<Workspace | null> {
    log.info("[Workspace Service] Getting workspace by ID:", id);

    const supabase = getSupabase();
    if (!supabase) {
      log.warn("[Workspace Service] Supabase not configured");
      return null;
    }

    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        log.info("[Workspace Service] Workspace not found");
        return null;
      }
      log.error("[Workspace Service] Error fetching workspace:", error.message);
      return null;
    }

    return this.mapSupabaseWorkspace(data);
  }

  /**
   * Add a member to a workspace
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: UserRole
  ): Promise<WorkspaceMember> {
    log.info("[Workspace Service] Adding member to workspace");
    log.info("[Workspace Service] Workspace ID:", workspaceId);
    log.info("[Workspace Service] User ID:", userId);
    log.info("[Workspace Service] Role:", role);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Workspace Service] ✗ Supabase not configured");
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
      })
      .select()
      .single();

    if (error) {
      log.error("[Workspace Service] ✗ Error adding member:", error.message);
      throw new Error(error.message);
    }

    if (!data) {
      log.error("[Workspace Service] ✗ No member data returned");
      throw new Error("Failed to add member");
    }

    const member = this.mapSupabaseWorkspaceMember(data);
    log.info("[Workspace Service] ✓ Member added successfully");
    return member;
  }

  /**
   * List all members in a workspace
   */
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    log.info("[Workspace Service] Listing members for workspace:", workspaceId);

    const supabase = getSupabase();
    if (!supabase) {
      log.warn("[Workspace Service] Supabase not configured");
      return [];
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true });

    if (error) {
      log.error("[Workspace Service] Error listing members:", error.message);
      return [];
    }

    return (data || []).map(m => this.mapSupabaseWorkspaceMember(m));
  }

  /**
   * Invite a user by email to a workspace
   * Uses Supabase admin API if SUPABASE_SERVICE_ROLE_KEY is available
   * Falls back to OTP-based invite otherwise
   */
  async inviteByEmail(
    workspaceId: string,
    email: string,
    role: UserRole
  ): Promise<void> {
    log.info("[Workspace Service] Inviting user by email to workspace");
    log.info("[Workspace Service] Workspace ID:", workspaceId);
    log.info("[Workspace Service] Email:", email);
    log.info("[Workspace Service] Role:", role);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Workspace Service] ✗ Supabase not configured");
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    // Try admin invite first (requires service role)
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: "snapflow://auth/callback",
          data: {
            invited_to_workspace: workspaceId,
          },
        }
      );

      if (error) {
        log.warn("[Workspace Service] Admin invite failed:", error.message);
        // Fall through to OTP-based invite
      } else if (data?.user?.id) {
        log.info("[Workspace Service] ✓ Invite sent via admin API to:", email);
        // User will need to accept the invite when they click the email link
        return;
      }
    } catch (err) {
      log.warn("[Workspace Service] Admin API not available, falling back to OTP");
    }

    // Fallback: OTP-based magic link
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            invited_to_workspace: workspaceId,
          },
        },
      });

      if (error) {
        log.error("[Workspace Service] ✗ OTP invite error:", error.message);
        throw new Error(`Failed to send invite to ${email}: ${error.message}`);
      }

      log.info("[Workspace Service] ✓ Invite sent via OTP to:", email);
    } catch (err) {
      log.error("[Workspace Service] ✗ OTP invite failed:", err);
      throw err;
    }
  }

  /**
   * Helper: Map Supabase workspace row to Workspace interface
   */
  private mapSupabaseWorkspace(data: Record<string, unknown>): Workspace {
    return {
      id: data.id as string,
      tenantId: data.tenant_id as string,
      name: data.name as string,
      slug: data.slug as string,
      description: (data.description as string) || undefined,
      createdBy: data.created_by as string,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  /**
   * Helper: Map Supabase workspace_member row to WorkspaceMember interface
   */
  private mapSupabaseWorkspaceMember(
    data: Record<string, unknown>
  ): WorkspaceMember {
    return {
      id: data.id as string,
      workspaceId: data.workspace_id as string,
      userId: data.user_id as string,
      role: data.role as UserRole,
      joinedAt: data.joined_at as string,
    };
  }
}

export const workspaceService = new WorkspaceService();
