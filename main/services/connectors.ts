import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { getSupabase } from "../utils/supabase";
import log from "electron-log";
import { customAlphabet } from "nanoid";
import type { Connector } from "../../renderer/types";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export class ConnectorService {
  /**
   * Get all connectors for a workspace
   */
  async getConnectors(workspaceId: string): Promise<Connector[]> {
    log.info("[Connector Service] Fetching connectors for workspace:", workspaceId);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Connector Service] ✗ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    const { data, error } = await supabase
      .from("connectors")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("[Connector Service] ✗ Failed to fetch connectors:", error);
      throw new Error("Failed to fetch connectors");
    }

    const connectors = (data || []).map(c => this.mapSupabaseConnector(c));
    log.info("[Connector Service] ✓ Found", connectors.length, "connectors");
    return connectors;
  }

  /**
   * Get connector by ID
   */
  async getConnectorById(id: string): Promise<Connector | null> {
    log.info("[Connector Service] Fetching connector by ID:", id);

    const supabase = getSupabase();
    if (!supabase) {
      log.warn("[Connector Service] Supabase not configured");
      return null;
    }

    const { data, error } = await supabase
      .from("connectors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        log.info("[Connector Service] Connector not found");
        return null;
      }
      log.error("[Connector Service] ✗ Failed to fetch connector:", error);
      throw new Error("Failed to fetch connector");
    }

    return this.mapSupabaseConnector(data);
  }

  /**
   * Get enabled connectors of a specific type for a workspace
   */
  async getConnectorsByType(
    workspaceId: string,
    type: "github" | "zoho"
  ): Promise<Connector[]> {
    log.info(
      "[Connector Service] Fetching",
      type,
      "connectors for workspace:",
      workspaceId
    );

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Connector Service] ✗ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    const { data, error } = await supabase
      .from("connectors")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("type", type)
      .eq("enabled", true)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("[Connector Service] ✗ Failed to fetch connectors:", error);
      throw new Error("Failed to fetch connectors");
    }

    const connectors = (data || []).map(c => this.mapSupabaseConnector(c));
    log.info("[Connector Service] ✓ Found", connectors.length, type, "connectors");
    return connectors;
  }

  /**
   * Get GitHub connector by repo
   */
  async getConnectorByRepo(
    workspaceId: string,
    owner: string,
    repo: string
  ): Promise<Connector | null> {
    log.info("[Connector Service] Fetching GitHub connector for repo:", owner, "/", repo);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Connector Service] ✗ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    const { data, error } = await supabase
      .from("connectors")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("type", "github")
      .filter("config->>owner", "eq", owner)
      .filter("config->>repo", "eq", repo)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        log.info("[Connector Service] GitHub connector not found");
        return null;
      }
      log.error("[Connector Service] ✗ Failed to fetch connector by repo:", error);
      throw new Error("Failed to fetch connector by repo");
    }

    return this.mapSupabaseConnector(data);
  }

  /**
   * Check if we can add a connector of a specific type
   * Max 1 GitHub + 1 Zoho per workspace
   */
  async canAddConnector(
    workspaceId: string,
    type: "github" | "zoho"
  ): Promise<boolean> {
    const existing = await this.getConnectorsByType(workspaceId, type);
    return existing.length === 0; // Can add if none exist
  }

  /**
   * Add a new connector to a workspace
   */
  async addConnector(
    userId: string,
    workspaceId: string,
    connector: Omit<Connector, "id" | "workspaceId" | "createdBy" | "createdAt" | "updatedAt">
  ): Promise<Connector> {
    log.info("[Connector Service] === ADD CONNECTOR START ===");
    log.info("[Connector Service] User ID:", userId);
    log.info("[Connector Service] Workspace ID:", workspaceId);
    log.info("[Connector Service] Type:", connector.type);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Connector Service] ✗ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    // Check if we can add this type of connector
    if (!(await this.canAddConnector(workspaceId, connector.type))) {
      const msg = `Only 1 ${connector.type} connector allowed per workspace`;
      log.error("[Connector Service] ✗", msg);
      throw new Error(msg);
    }

    // For GitHub, check if this repo already exists
    if (
      connector.type === "github" &&
      "config" in connector &&
      "owner" in connector.config &&
      "repo" in connector.config
    ) {
      const config = connector.config as { owner: string; repo: string; [key: string]: unknown };
      const existing = await this.getConnectorByRepo(
        workspaceId,
        config.owner,
        config.repo
      );
      if (existing) {
        const msg = `Repository ${config.owner}/${config.repo} is already connected`;
        log.error("[Connector Service] ✗", msg);
        throw new Error(msg);
      }
    }

    const id = `${connector.type}-${Date.now()}-${nanoid()}`;
    const newConnector = {
      id,
      workspace_id: workspaceId,
      created_by: userId,
      name: connector.name,
      type: connector.type,
      enabled: connector.enabled !== false,
      config: connector.config,
    };

    log.info("[Connector Service] Inserting connector:", id);
    const { data, error } = await supabase
      .from("connectors")
      .insert([newConnector])
      .select()
      .single();

    if (error) {
      log.error("[Connector Service] ✗ Failed to add connector:", error);
      throw new Error("Failed to add connector");
    }

    if (!data) {
      log.error("[Connector Service] ✗ No connector data returned");
      throw new Error("Failed to add connector");
    }

    const result = this.mapSupabaseConnector(data);
    log.info("[Connector Service] ✓ Connector added successfully");
    log.info("[Connector Service] === ADD CONNECTOR END ===");
    return result;
  }

  /**
   * Update a connector
   */
  async updateConnector(
    id: string,
    updates: Partial<Pick<Connector, "enabled" | "name" | "config">>
  ): Promise<Connector> {
    log.info("[Connector Service] Updating connector:", id);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Connector Service] ✗ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    const { data, error } = await supabase
      .from("connectors")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      log.error("[Connector Service] ✗ Failed to update connector:", error);
      throw new Error("Failed to update connector");
    }

    if (!data) {
      log.error("[Connector Service] ✗ Connector not found");
      throw new Error("Connector not found");
    }

    log.info("[Connector Service] ✓ Connector updated successfully");
    return this.mapSupabaseConnector(data);
  }

  /**
   * Delete a connector
   */
  async deleteConnector(id: string): Promise<void> {
    log.info("[Connector Service] Deleting connector:", id);

    const supabase = getSupabase();
    if (!supabase) {
      log.error("[Connector Service] ✗ Supabase not configured");
      throw new Error("Supabase not configured");
    }

    const { error } = await supabase
      .from("connectors")
      .delete()
      .eq("id", id);

    if (error) {
      log.error("[Connector Service] ✗ Failed to delete connector:", error);
      throw new Error("Failed to delete connector");
    }

    log.info("[Connector Service] ✓ Connector deleted successfully");
  }

  /**
   * Validate GitHub connector (check access and permissions)
   */
  async validateGitHubConnector(
    accessToken: string,
    owner: string,
    repo: string
  ): Promise<boolean> {
    log.info("[Connector Service] Validating GitHub connector for:", owner, "/", repo);

    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      // Check if we have push/admin permissions
      const permissions = response.data.permissions;
      const canPush = permissions?.push === true || permissions?.admin === true;

      if (canPush) {
        log.info("[Connector Service] ✓ GitHub connector validation passed");
      } else {
        log.warn("[Connector Service] ✗ Insufficient permissions on repository");
      }

      return canPush;
    } catch (error) {
      log.error("[Connector Service] ✗ GitHub validation error:", error);
      return false;
    }
  }

  /**
   * Validate Zoho connector (stub - placeholder for Zoho API validation)
   */
  async validateZohoConnector(
    accessToken: string,
    portalId: string
  ): Promise<boolean> {
    log.info("[Connector Service] Validating Zoho connector for portal:", portalId);

    try {
      // Stub: In a real implementation, this would call Zoho API
      // For now, just check that the token and portal ID are non-empty
      if (!accessToken || !portalId) {
        log.warn("[Connector Service] ✗ Missing Zoho token or portal ID");
        return false;
      }

      // TODO: Call actual Zoho API to validate token
      // const response = await axios.get(
      //   `https://projectsapi.zoho.com/portal/${portalId}/projects`,
      //   {
      //     headers: {
      //       'Authorization': `Zoho-oauthtoken ${accessToken}`
      //     }
      //   }
      // );
      // return response.status === 200;

      log.info("[Connector Service] ✓ Zoho connector validation passed (stub)");
      return true;
    } catch (error) {
      log.error("[Connector Service] ✗ Zoho validation error:", error);
      return false;
    }
  }

  /**
   * Upload screenshot to GitHub repository
   */
  private async uploadScreenshotToGitHub(
    connector: Connector,
    filePath: string,
    issueNumber: number
  ): Promise<string | null> {
    try {
      log.info("[GitHub] Reading screenshot file:", filePath);
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const base64Content = fileBuffer.toString("base64");

      const screenshotPath = `.snapflow-screenshots/issue-${issueNumber}-${fileName}`;

      log.info("[GitHub] Uploading screenshot to repository:", screenshotPath);

      // Check if file already exists
      let sha: string | undefined;
      try {
        const config = connector.config as { owner: string; repo: string; accessToken: string };
        const existingFile = await axios.get(
          `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${screenshotPath}`,
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        sha = existingFile.data.sha;
        log.info("[GitHub] File already exists, will update it");
      } catch {
        log.info("[GitHub] File does not exist, will create new");
      }

      const config = connector.config as { owner: string; repo: string; accessToken: string };
      const uploadPayload: Record<string, unknown> = {
        message: `Add screenshot for issue #${issueNumber}`,
        content: base64Content,
      };

      if (sha) {
        uploadPayload.sha = sha;
      }

      const uploadResponse = await axios.put(
        `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${screenshotPath}`,
        uploadPayload,
        {
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
        }
      );

      const downloadUrl = uploadResponse.data.content.download_url;
      log.info("[GitHub] Screenshot uploaded successfully:", downloadUrl);
      return downloadUrl;
    } catch (error) {
      log.error(
        "[GitHub] Failed to upload screenshot to repository:",
        error.response?.data || error.message
      );

      // Fallback: Use data URI for small files
      try {
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);

        if (fileBuffer.length < 500000) {
          const mimeType = fileName.endsWith(".png")
            ? "image/png"
            : "image/jpeg";
          const base64Content = fileBuffer.toString("base64");
          const dataUri = `data:${mimeType};base64,${base64Content}`;
          log.info(
            "[GitHub] Using data URI fallback for screenshot (file size:",
            fileBuffer.length,
            "bytes)"
          );
          return dataUri;
        } else {
          log.info(
            "[GitHub] Screenshot too large for data URI fallback:",
            fileBuffer.length,
            "bytes"
          );
        }
      } catch (fallbackError) {
        log.error("[GitHub] Fallback data URI also failed:", fallbackError);
      }

      return null;
    }
  }

  /**
   * Sync issue to GitHub
   */
  async syncToGitHub(
    connector: Connector,
    issue: {
      title: string;
      description?: string;
      filePath: string;
      cloudFileUrl?: string;
      syncedTo?: Array<{ platform: string; externalId: string; url?: string }>;
      tags?: string[];
      type?: "screenshot" | "recording";
    }
  ): Promise<{ issueNumber: number; url: string; isUpdate: boolean }> {
    const config = connector.config as { owner: string; repo: string; accessToken: string };

    if (!config.accessToken || !config.owner || !config.repo) {
      throw new Error("GitHub connector not properly configured");
    }

    try {
      // Check if already synced to this GitHub repo
      const existingSync = issue.syncedTo?.find(
        (sync) =>
          sync.platform === "github" &&
          sync.url?.includes(`${config.owner}/${config.repo}`)
      );

      let body = issue.description || "No description provided.";
      const labels = issue.tags || [];
      const issueNumber = existingSync?.externalId
        ? parseInt(existingSync.externalId, 10)
        : null;

      if (issueNumber) {
        log.info("[GitHub] Issue already exists, updating issue #", issueNumber);

        try {
          let mediaUrl = issue.cloudFileUrl;
          const isRecording = issue.type === "recording";

          if (!mediaUrl && issue.filePath && !isRecording) {
            log.info("[GitHub] Attempting to upload screenshot...");
            mediaUrl = await this.uploadScreenshotToGitHub(
              connector,
              issue.filePath,
              issueNumber
            );
          }

          if (mediaUrl) {
            if (isRecording) {
              body += `\n\n## Recording\n\n[View Recording](${mediaUrl})`;
            } else {
              body += `\n\n## Screenshot\n\n![Screenshot](${mediaUrl})`;
            }
          }

          const response = await axios.patch(
            `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${issueNumber}`,
            {
              title: issue.title,
              body,
              labels,
            },
            {
              headers: {
                Authorization: `Bearer ${config.accessToken}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
              },
            }
          );

          log.info("[GitHub] Issue updated:", response.data.html_url);
          return {
            issueNumber: response.data.number,
            url: response.data.html_url,
            isUpdate: true,
          };
        } catch (updateError) {
          if (updateError.response?.status === 410) {
            log.info("[GitHub] Issue #", issueNumber, "was deleted, creating a new issue...");
            // Fall through to create new issue
          } else {
            throw updateError;
          }
        }
      }

      // Create new issue
      {
        log.info(
          "[GitHub] Creating new issue in",
          `${config.owner}/${config.repo}`
        );

        const response = await axios.post(
          `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
          {
            title: issue.title,
            body,
            labels,
          },
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
          }
        );

        const newIssueNumber = response.data.number;
        const issueUrl = response.data.html_url;
        log.info("[GitHub] Issue created:", issueUrl);

        const isRecording = issue.type === "recording";
        let mediaUrl = issue.cloudFileUrl;

        if (!mediaUrl && issue.filePath && !isRecording) {
          log.info("[GitHub] Attempting to upload screenshot...");
          mediaUrl = await this.uploadScreenshotToGitHub(
            connector,
            issue.filePath,
            newIssueNumber
          );
        }

        if (mediaUrl) {
          const mediaSection = isRecording
            ? `\n\n## Recording\n\n[View Recording](${mediaUrl})`
            : `\n\n## Screenshot\n\n![Screenshot](${mediaUrl})`;
          const updatedBody = body + mediaSection;

          await axios.patch(
            `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${newIssueNumber}`,
            { body: updatedBody },
            {
              headers: {
                Authorization: `Bearer ${config.accessToken}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
              },
            }
          );
          log.info(
            `[GitHub] ${isRecording ? "Recording link" : "Screenshot"} attached to issue`
          );
        }

        return {
          issueNumber: newIssueNumber,
          url: issueUrl,
          isUpdate: false,
        };
      }
    } catch (error) {
      log.error("GitHub sync error:", error);
      if (error.response?.status === 401) {
        throw new Error("GitHub access token is invalid or expired");
      } else if (error.response?.status === 404) {
        throw new Error("Repository not found or access denied");
      } else if (error.response?.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded or insufficient permissions"
        );
      } else if (error.response?.status === 410) {
        throw new Error("GitHub issue was deleted and could not be recreated");
      } else if (error.response?.status === 422) {
        const message = error.response?.data?.message || "Validation failed";
        const errors = error.response?.data?.errors || [];
        log.error("[GitHub] Validation error:", message, errors);
        throw new Error(`GitHub validation error: ${message}`);
      }
      throw new Error(
        `Failed to sync to GitHub: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Helper: Map Supabase connector row to Connector interface
   */
  private mapSupabaseConnector(data: Record<string, unknown>): Connector {
    return {
      id: data.id as string,
      workspaceId: data.workspace_id as string,
      createdBy: data.created_by as string,
      name: data.name as string,
      type: data.type as "github" | "zoho",
      enabled: data.enabled as boolean,
      config: data.config as Record<string, unknown>,
      lastSyncAt: (data.last_sync_at as string) || undefined,
      createdAt: (data.created_at as string) || undefined,
      updatedAt: (data.updated_at as string) || undefined,
    };
  }
}

export const connectorService = new ConnectorService();
