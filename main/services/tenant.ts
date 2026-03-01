import { getSupabase } from "../utils/supabase";
import log from "electron-log";
import type { Tenant } from "../../renderer/types";

/**
 * Helper: Slugify a string
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(
    userId: string,
    name: string,
    description?: string
  ): Promise<Tenant> {
    log.info("[Tenant Service] === CREATE TENANT START ===");
    log.info("[Tenant Service] User ID:", userId);
    log.info("[Tenant Service] Tenant name:", name);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Tenant Service] ✗ Supabase not configured");
      throw new Error(
        "Supabase is not configured. Please check your environment variables."
      );
    }

    let slug = slugify(name);
    let originalSlug = slug;
    let attempt = 2;

    // Handle UNIQUE slug constraint by appending -2, -3, etc.
    while (true) {
      const { data: existing } = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .single();

      if (!existing) {
        break; // slug is unique, use it
      }

      slug = `${originalSlug}-${attempt}`;
      attempt++;
    }

    log.info("[Tenant Service] Using slug:", slug);

    const { data, error } = await supabase
      .from("tenants")
      .insert({
        name,
        slug,
        description: description || null,
        owner_id: userId,
      })
      .select()
      .single();

    if (error) {
      log.error("[Tenant Service] ✗ Create error:", error.message);
      throw new Error(error.message);
    }

    if (!data) {
      log.error("[Tenant Service] ✗ No tenant data returned");
      throw new Error("Failed to create tenant");
    }

    const tenant = this.mapSupabaseTenant(data);
    log.info("[Tenant Service] ✓ Tenant created successfully");
    log.info("[Tenant Service] Tenant ID:", tenant.id);
    log.info("[Tenant Service] === CREATE TENANT END ===");
    return tenant;
  }

  /**
   * Get tenant by owner (user)
   */
  async getTenantByOwner(userId: string): Promise<Tenant | null> {
    log.info("[Tenant Service] Getting tenant by owner:", userId);

    const supabase = getSupabase();
    if (!supabase) {
      log.warn("[Tenant Service] Supabase not configured");
      return null;
    }

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("owner_id", userId)
      .single();

    if (error) {
      // PGRST116 = "not found" in Supabase
      if (error.code === "PGRST116") {
        log.info("[Tenant Service] No tenant found for user");
        return null;
      }
      log.error("[Tenant Service] Error fetching tenant:", error.message);
      return null;
    }

    return this.mapSupabaseTenant(data);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    log.info("[Tenant Service] Getting tenant by ID:", tenantId);

    const supabase = getSupabase();
    if (!supabase) {
      log.warn("[Tenant Service] Supabase not configured");
      return null;
    }

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        log.info("[Tenant Service] Tenant not found");
        return null;
      }
      log.error("[Tenant Service] Error fetching tenant:", error.message);
      return null;
    }

    return this.mapSupabaseTenant(data);
  }

  /**
   * Helper: Map Supabase row to Tenant interface
   */
  private mapSupabaseTenant(data: Record<string, unknown>): Tenant {
    return {
      id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      description: (data.description as string) || undefined,
      logoUrl: (data.logo_url as string) || undefined,
      ownerId: data.owner_id as string,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const tenantService = new TenantService();
