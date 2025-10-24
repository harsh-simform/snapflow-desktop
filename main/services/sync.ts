import { getSupabase } from "../utils/supabase";
import { issueService } from "./issues";
import fs from "fs/promises";
import path from "path";

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
  syncHistoryId?: string;
}

interface SyncHistory {
  id: string;
  user_id: string;
  sync_type: "push" | "pull" | "full";
  status: "in_progress" | "completed" | "failed";
  synced_count: number;
  failed_count: number;
  total_count: number;
  errors: string[];
  started_at: string;
  completed_at: string | null;
}

const BUCKET_NAME = "snapflow-public-bucket";

export class SyncService {
  /**
   * Check if the storage bucket exists by attempting to access it
   */
  private async ensureBucketExists(): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) {
      console.error("[Sync] Supabase client not initialized");
      return false;
    }

    try {
      // Instead of listing buckets (which requires admin permissions),
      // try to list files in the bucket to verify it exists and is accessible
      console.log("[Sync] Verifying bucket access...");
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .list("", { limit: 1 });

      if (error) {
        // Check if it's a "bucket not found" error
        if (
          error.message?.includes("not found") ||
          error.message?.includes("does not exist")
        ) {
          console.error("[Sync] Storage bucket does not exist:", BUCKET_NAME);
          console.error(
            "[Sync] Please create the bucket manually in Supabase Dashboard:"
          );
          console.error("[Sync]   1. Go to Supabase Dashboard > Storage");
          console.error("[Sync]   2. Create a bucket named:", BUCKET_NAME);
          console.error(
            "[Sync]   3. Configure as Public with 50MB file size limit"
          );
          console.error("[Sync]   4. Set allowed MIME types: image/*, video/*");
          return false;
        }

        // If it's a different error, log it but assume bucket exists
        console.warn(
          "[Sync] Bucket verification returned error (bucket may still exist):",
          error
        );
        console.log("[Sync] Proceeding with upload attempt...");
        return true;
      }

      console.log("[Sync] Bucket is accessible:", BUCKET_NAME);
      return true;
    } catch (error) {
      console.error("[Sync] Error checking bucket:", error);
      // Assume bucket exists if we get an unexpected error
      console.log("[Sync] Proceeding with upload attempt...");
      return true;
    }
  }

  /**
   * Create a sync history record
   */
  private async createSyncHistory(
    userId: string,
    syncType: "push" | "pull" | "full",
    totalCount: number
  ): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("sync_history")
        .insert({
          user_id: userId,
          sync_type: syncType,
          status: "in_progress",
          synced_count: 0,
          failed_count: 0,
          total_count: totalCount,
          errors: [],
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Sync] Failed to create sync history:", error);
        return null;
      }

      console.log(`[Sync] Created sync history record: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error("[Sync] Error creating sync history:", error);
      return null;
    }
  }

  /**
   * Update sync history record
   */
  private async updateSyncHistory(
    syncHistoryId: string,
    updates: {
      status?: "in_progress" | "completed" | "failed";
      synced_count?: number;
      failed_count?: number;
      errors?: string[];
    }
  ): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !syncHistoryId) {
      return;
    }

    try {
      const updateData: Record<string, unknown> = { ...updates };

      if (updates.status === "completed" || updates.status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("sync_history")
        .update(updateData)
        .eq("id", syncHistoryId);

      if (error) {
        console.error("[Sync] Failed to update sync history:", error);
      } else {
        console.log(`[Sync] Updated sync history record: ${syncHistoryId}`);
      }
    } catch (error) {
      console.error("[Sync] Error updating sync history:", error);
    }
  }

  /**
   * Get latest sync history for a user
   */
  async getLatestSyncHistory(userId: string): Promise<SyncHistory | null> {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("sync_history")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows found
          return null;
        }
        console.error("[Sync] Failed to get latest sync history:", error);
        return null;
      }

      return data as SyncHistory;
    } catch (error) {
      console.error("[Sync] Error getting latest sync history:", error);
      return null;
    }
  }

  /**
   * Upload a file to Supabase storage and return the public URL
   */
  private async uploadFileToStorage(
    filePath: string,
    userId: string,
    issueId: string
  ): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) {
      console.error("[Sync] Supabase client not initialized");
      return null;
    }

    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        console.error(`[Sync] File does not exist: ${filePath}`);
        return null;
      }

      // Read the file
      console.log(`[Sync] Reading file: ${filePath}`);
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName);

      // Create a unique path in the bucket: userId/issueId/filename
      const storagePath = `${userId}/${issueId}/${fileName}`;

      console.log(`[Sync] Uploading to storage path: ${storagePath}`);
      console.log(`[Sync] File size: ${fileBuffer.length} bytes`);
      console.log(`[Sync] Content type: ${this.getContentType(fileExt)}`);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: this.getContentType(fileExt),
          upsert: true, // Overwrite if exists
        });

      if (error) {
        console.error(`[Sync] Failed to upload file ${fileName}:`, error);
        console.error(`[Sync] Error details:`, JSON.stringify(error, null, 2));
        return null;
      }

      console.log(`[Sync] Upload successful, data:`, data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      console.log(`[Sync] Generated public URL: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      console.error("[Sync] File upload error:", error);
      if (error instanceof Error) {
        console.error("[Sync] Error stack:", error.stack);
      }
      return null;
    }
  }

  /**
   * Get MIME content type based on file extension
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
    };
    return contentTypes[extension.toLowerCase()] || "application/octet-stream";
  }

  /**
   * Sync all local issues to Supabase
   */
  async syncAllToCloud(userId: string): Promise<SyncResult> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ["Supabase is not configured"],
      };
    }

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Ensure storage bucket exists
    console.log("[Sync] ==========================================");
    console.log("[Sync] Starting cloud sync for user:", userId);
    console.log(
      "[Sync] Supabase URL:",
      process.env.SUPABASE_URL ? "Configured" : "NOT CONFIGURED"
    );
    console.log(
      "[Sync] Supabase Key:",
      process.env.SUPABASE_ANON_KEY ? "Configured" : "NOT CONFIGURED"
    );
    console.log("[Sync] Checking if storage bucket exists...");

    const bucketReady = await this.ensureBucketExists();
    if (!bucketReady) {
      const error =
        "Storage bucket is not available. Please check Supabase configuration.";
      console.error("[Sync]", error);
      result.success = false;
      result.errors.push(error);
      return result;
    }
    console.log("[Sync] Storage bucket is ready!");

    // Get all local issues for this user
    const localIssues = issueService.getIssues(userId);

    // Create sync history record
    const syncHistoryId = await this.createSyncHistory(
      userId,
      "push",
      localIssues.length
    );
    result.syncHistoryId = syncHistoryId || undefined;

    try {
      if (localIssues.length === 0) {
        // Update sync history as completed with no items
        if (syncHistoryId) {
          await this.updateSyncHistory(syncHistoryId, {
            status: "completed",
            synced_count: 0,
            failed_count: 0,
          });
        }
        return result;
      }

      // Upload each issue to Supabase
      for (const issue of localIssues) {
        try {
          console.log(`[Sync] Processing issue: ${issue.id} - ${issue.title}`);
          console.log(`[Sync] File path: ${issue.filePath}`);
          console.log(
            `[Sync] Thumbnail path: ${issue.thumbnailPath || "none"}`
          );

          // Upload file to storage and get public URL
          let cloudFileUrl: string | null = null;
          let cloudThumbnailUrl: string | null = null;

          try {
            // Upload main file
            if (issue.filePath) {
              console.log(
                `[Sync] Starting main file upload for issue ${issue.id}`
              );
              cloudFileUrl = await this.uploadFileToStorage(
                issue.filePath,
                userId,
                issue.id
              );
              if (cloudFileUrl) {
                console.log(
                  `[Sync] Main file uploaded successfully: ${cloudFileUrl}`
                );
              } else {
                console.warn(
                  `[Sync] Main file upload returned null for issue ${issue.id}`
                );
              }
            }

            // Upload thumbnail if exists
            if (issue.thumbnailPath) {
              console.log(
                `[Sync] Starting thumbnail upload for issue ${issue.id}`
              );
              cloudThumbnailUrl = await this.uploadFileToStorage(
                issue.thumbnailPath,
                userId,
                `${issue.id}_thumbnail`
              );
              if (cloudThumbnailUrl) {
                console.log(
                  `[Sync] Thumbnail uploaded successfully: ${cloudThumbnailUrl}`
                );
              } else {
                console.warn(
                  `[Sync] Thumbnail upload returned null for issue ${issue.id}`
                );
              }
            }
          } catch (uploadError) {
            console.error(
              `[Sync] File upload error for issue ${issue.id}:`,
              uploadError
            );
            // Continue with sync even if file upload fails
          }

          // Check if issue already exists in Supabase
          const { data: existingIssue } = await supabase
            .from("issues")
            .select("id, cloud_file_url, cloud_thumbnail_url")
            .eq("id", issue.id)
            .eq("user_id", userId)
            .single();

          const issueData = {
            id: issue.id,
            user_id: userId,
            title: issue.title,
            description: issue.description || null,
            type: issue.type,
            timestamp: issue.timestamp,
            file_path: issue.filePath,
            thumbnail_path: issue.thumbnailPath || null,
            cloud_file_url:
              cloudFileUrl || existingIssue?.cloud_file_url || null,
            cloud_thumbnail_url:
              cloudThumbnailUrl || existingIssue?.cloud_thumbnail_url || null,
            sync_status: "synced",
            synced_to: issue.syncedTo || [],
            tags: issue.tags || [],
          };

          console.log(`[Sync] Preparing to save issue ${issue.id} to database`);
          console.log(
            `[Sync] Cloud file URL: ${issueData.cloud_file_url || "null"}`
          );
          console.log(
            `[Sync] Cloud thumbnail URL: ${issueData.cloud_thumbnail_url || "null"}`
          );

          if (existingIssue) {
            // Update existing issue
            console.log(
              `[Sync] Updating existing issue in database: ${issue.id}`
            );
            const { error } = await supabase
              .from("issues")
              .update(issueData)
              .eq("id", issue.id)
              .eq("user_id", userId);

            if (error) {
              console.error(
                `[Sync] Database update error for issue ${issue.id}:`,
                error
              );
              throw error;
            }
            console.log(`[Sync] Issue updated successfully in database`);
          } else {
            // Insert new issue
            console.log(
              `[Sync] Inserting new issue into database: ${issue.id}`
            );
            const { error } = await supabase.from("issues").insert(issueData);

            if (error) {
              console.error(
                `[Sync] Database insert error for issue ${issue.id}:`,
                error
              );
              throw error;
            }
            console.log(`[Sync] Issue inserted successfully into database`);
          }

          // Update local sync status and cloud URLs
          const localUpdateData: Record<string, unknown> = {
            syncStatus: "synced",
          };
          if (cloudFileUrl) {
            localUpdateData.cloudFileUrl = cloudFileUrl;
          }
          if (cloudThumbnailUrl) {
            localUpdateData.cloudThumbnailUrl = cloudThumbnailUrl;
          }

          await issueService.updateIssue(issue.id, localUpdateData);
          result.syncedCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push(
            `Failed to sync issue ${issue.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          console.error(`Failed to sync issue ${issue.id}:`, error);
        }
      }

      result.success = result.failedCount === 0;

      // Update sync history as completed
      if (syncHistoryId) {
        await this.updateSyncHistory(syncHistoryId, {
          status: result.success ? "completed" : "failed",
          synced_count: result.syncedCount,
          failed_count: result.failedCount,
          errors: result.errors,
        });
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      console.error("Sync error:", error);

      // Update sync history as failed
      if (syncHistoryId) {
        await this.updateSyncHistory(syncHistoryId, {
          status: "failed",
          synced_count: result.syncedCount,
          failed_count: result.failedCount,
          errors: result.errors,
        });
      }
    }

    return result;
  }

  /**
   * Fetch issues from Supabase cloud and merge with local data
   */
  async fetchFromCloud(userId: string): Promise<SyncResult> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: ["Supabase is not configured"],
      };
    }

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Fetch all issues from Supabase for this user
      const { data: cloudIssues, error } = await supabase
        .from("issues")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false });

      if (error) {
        throw error;
      }

      if (!cloudIssues || cloudIssues.length === 0) {
        return result;
      }

      // Get local issues to check for conflicts
      const localIssues = issueService.getIssues(userId);
      const localIssueIds = new Set(localIssues.map((i) => i.id));

      // Merge cloud issues with local data
      for (const cloudIssue of cloudIssues) {
        try {
          const issueData: Record<string, unknown> = {
            id: cloudIssue.id,
            title: cloudIssue.title,
            description: cloudIssue.description,
            type: cloudIssue.type as "screenshot" | "recording",
            timestamp: cloudIssue.timestamp,
            filePath: cloudIssue.file_path,
            thumbnailPath: cloudIssue.thumbnail_path,
            cloudFileUrl: cloudIssue.cloud_file_url,
            cloudThumbnailUrl: cloudIssue.cloud_thumbnail_url,
            syncStatus: "synced" as const,
            syncedTo: cloudIssue.synced_to || [],
            userId: cloudIssue.user_id,
            tags: cloudIssue.tags || [],
          };

          if (localIssueIds.has(cloudIssue.id)) {
            // Update existing local issue
            await issueService.updateIssue(cloudIssue.id, issueData);
          } else {
            // This is a cloud-only issue - we'd need to download the file
            // For now, we'll skip it as we don't have the actual file
            // In a full implementation, you'd download the file from cloud storage
            console.log(
              `Skipping cloud-only issue ${cloudIssue.id} - file not available locally`
            );
            continue;
          }

          result.syncedCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push(
            `Failed to sync issue ${cloudIssue.id}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          console.error(`Failed to sync issue ${cloudIssue.id}:`, error);
        }
      }

      result.success = result.failedCount === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      console.error("Fetch error:", error);
    }

    return result;
  }

  /**
   * Full sync: Push local changes to cloud and pull cloud changes to local
   */
  async fullSync(userId: string): Promise<SyncResult> {
    // First push local changes to cloud
    const pushResult = await this.syncAllToCloud(userId);

    // Then pull cloud changes to local
    const pullResult = await this.fetchFromCloud(userId);

    // Combine results
    return {
      success: pushResult.success && pullResult.success,
      syncedCount: pushResult.syncedCount + pullResult.syncedCount,
      failedCount: pushResult.failedCount + pullResult.failedCount,
      errors: [...pushResult.errors, ...pullResult.errors],
    };
  }
}

export const syncService = new SyncService();
