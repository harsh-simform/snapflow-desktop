import Store from "electron-store";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

interface Connector {
  id: string;
  name: string;
  type: "github";
  enabled: boolean;
  config: {
    accessToken: string;
    owner: string;
    repo: string;
  };
}

const store = new Store<{ connectors: Connector[] }>({
  name: "snapflow-connectors",
  defaults: {
    connectors: [],
  },
});

export class ConnectorService {
  getConnectors(): Connector[] {
    return store.get("connectors");
  }

  getConnectorById(id: string): Connector | undefined {
    const connectors = store.get("connectors");
    return connectors.find((c) => c.id === id);
  }

  getGitHubConnectors(): Connector[] {
    const connectors = store.get("connectors");
    return connectors.filter((c) => c.type === "github" && c.enabled);
  }

  getConnectorByRepo(owner: string, repo: string): Connector | undefined {
    const connectors = store.get("connectors");
    return connectors.find(
      (c) =>
        c.type === "github" &&
        c.config.owner === owner &&
        c.config.repo === repo
    );
  }

  canAddGitHubConnector(): boolean {
    const githubConnectors = this.getGitHubConnectors();
    return githubConnectors.length < 5;
  }

  addConnector(connector: Omit<Connector, "id">): Connector {
    const connectors = store.get("connectors");

    // Check if we can add more GitHub connectors
    if (connector.type === "github" && !this.canAddGitHubConnector()) {
      throw new Error("Maximum of 5 GitHub repositories allowed");
    }

    // Check if this repo already exists
    if (connector.type === "github") {
      const existing = this.getConnectorByRepo(
        connector.config.owner,
        connector.config.repo
      );
      if (existing) {
        throw new Error(
          `Repository ${connector.config.owner}/${connector.config.repo} is already connected`
        );
      }
    }

    const newConnector: Connector = {
      ...connector,
      id: `${connector.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    connectors.push(newConnector);
    store.set("connectors", connectors);
    return newConnector;
  }

  updateConnector(id: string, updates: Partial<Connector>): Connector {
    const connectors = store.get("connectors");
    const index = connectors.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error("Connector not found");
    }

    connectors[index] = {
      ...connectors[index],
      ...updates,
      id, // Ensure ID doesn't change
    };

    store.set("connectors", connectors);
    return connectors[index];
  }

  deleteConnector(id: string): void {
    const connectors = store.get("connectors");
    const filteredConnectors = connectors.filter((c) => c.id !== id);
    store.set("connectors", filteredConnectors);
  }

  /**
   * Upload screenshot to GitHub repository and return the URL
   * Since GitHub doesn't have an API to attach images to issues,
   * we upload to a .snapflow-screenshots folder in the repo
   */
  private async uploadScreenshotToGitHub(
    connector: Connector,
    filePath: string,
    issueNumber: number
  ): Promise<string | null> {
    try {
      console.log("[GitHub] Reading screenshot file:", filePath);
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const base64Content = fileBuffer.toString("base64");

      // Create a unique filename with issue number
      const screenshotPath = `.snapflow-screenshots/issue-${issueNumber}-${fileName}`;

      console.log(
        "[GitHub] Uploading screenshot to repository:",
        screenshotPath
      );

      // Check if file already exists
      let sha: string | undefined;
      try {
        const existingFile = await axios.get(
          `https://api.github.com/repos/${connector.config.owner}/${connector.config.repo}/contents/${screenshotPath}`,
          {
            headers: {
              Authorization: `Bearer ${connector.config.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        sha = existingFile.data.sha;
        console.log("[GitHub] File already exists, will update it");
      } catch {
        // File doesn't exist, which is fine
        console.log("[GitHub] File does not exist, will create new");
      }

      // Upload or update the file in the repository
      const uploadPayload: Record<string, unknown> = {
        message: `Add screenshot for issue #${issueNumber}`,
        content: base64Content,
      };

      if (sha) {
        uploadPayload.sha = sha;
      }

      const uploadResponse = await axios.put(
        `https://api.github.com/repos/${connector.config.owner}/${connector.config.repo}/contents/${screenshotPath}`,
        uploadPayload,
        {
          headers: {
            Authorization: `Bearer ${connector.config.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
        }
      );

      const downloadUrl = uploadResponse.data.content.download_url;
      console.log("[GitHub] Screenshot uploaded successfully:", downloadUrl);
      return downloadUrl;
    } catch (error) {
      console.error(
        "[GitHub] Failed to upload screenshot to repository:",
        error.response?.data || error.message
      );

      // Fallback: Use data URI for small files
      try {
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);

        if (fileBuffer.length < 500000) {
          // 500KB limit
          const mimeType = fileName.endsWith(".png")
            ? "image/png"
            : "image/jpeg";
          const base64Content = fileBuffer.toString("base64");
          const dataUri = `data:${mimeType};base64,${base64Content}`;
          console.log(
            "[GitHub] Using data URI fallback for screenshot (file size:",
            fileBuffer.length,
            "bytes)"
          );
          return dataUri;
        } else {
          console.log(
            "[GitHub] Screenshot too large for data URI fallback:",
            fileBuffer.length,
            "bytes"
          );
        }
      } catch (fallbackError) {
        console.error("[GitHub] Fallback data URI also failed:", fallbackError);
      }

      return null;
    }
  }

  async syncToGitHub(
    connector: Connector,
    issue: {
      title: string;
      description?: string;
      filePath: string;
      cloudFileUrl?: string;
      syncedTo?: Array<{ platform: string; externalId: string; url?: string }>;
      tags?: string[];
    }
  ): Promise<{ issueNumber: number; url: string; isUpdate: boolean }> {
    if (
      !connector.config.accessToken ||
      !connector.config.owner ||
      !connector.config.repo
    ) {
      throw new Error("GitHub connector not properly configured");
    }

    try {
      // Check if already synced to this GitHub repo
      const existingSync = issue.syncedTo?.find(
        (sync) =>
          sync.platform === "github" &&
          sync.url?.includes(
            `${connector.config.owner}/${connector.config.repo}`
          )
      );

      // Prepare issue body
      let body = issue.description || "No description provided.";

      // Prepare labels from tags
      const labels = issue.tags || [];

      const issueNumber = existingSync?.externalId
        ? parseInt(existingSync.externalId, 10)
        : null;

      if (issueNumber) {
        // Update existing issue
        console.log(
          "[GitHub] Issue already exists, updating issue #",
          issueNumber
        );

        // Try to upload screenshot
        let screenshotUrl = issue.cloudFileUrl;
        if (!screenshotUrl && issue.filePath) {
          console.log("[GitHub] Attempting to upload screenshot...");
          screenshotUrl = await this.uploadScreenshotToGitHub(
            connector,
            issue.filePath,
            issueNumber
          );
        }

        if (screenshotUrl) {
          body += `\n\n## Screenshot\n\n![Screenshot](${screenshotUrl})`;
        }

        const response = await axios.patch(
          `https://api.github.com/repos/${connector.config.owner}/${connector.config.repo}/issues/${issueNumber}`,
          {
            title: issue.title,
            body,
            labels,
          },
          {
            headers: {
              Authorization: `Bearer ${connector.config.accessToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
          }
        );

        console.log("[GitHub] Issue updated:", response.data.html_url);
        return {
          issueNumber: response.data.number,
          url: response.data.html_url,
          isUpdate: true,
        };
      } else {
        // Create new issue first
        console.log(
          "[GitHub] Creating new issue in",
          `${connector.config.owner}/${connector.config.repo}`
        );

        const response = await axios.post(
          `https://api.github.com/repos/${connector.config.owner}/${connector.config.repo}/issues`,
          {
            title: issue.title,
            body,
            labels,
          },
          {
            headers: {
              Authorization: `Bearer ${connector.config.accessToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
          }
        );

        const newIssueNumber = response.data.number;
        const issueUrl = response.data.html_url;
        console.log("[GitHub] Issue created:", issueUrl);

        // Now try to upload and attach screenshot
        if (issue.filePath) {
          console.log("[GitHub] Attempting to upload screenshot...");
          const screenshotUrl = await this.uploadScreenshotToGitHub(
            connector,
            issue.filePath,
            newIssueNumber
          );

          if (screenshotUrl) {
            // Update the issue with screenshot
            const updatedBody =
              body + `\n\n## Screenshot\n\n![Screenshot](${screenshotUrl})`;

            await axios.patch(
              `https://api.github.com/repos/${connector.config.owner}/${connector.config.repo}/issues/${newIssueNumber}`,
              { body: updatedBody },
              {
                headers: {
                  Authorization: `Bearer ${connector.config.accessToken}`,
                  Accept: "application/vnd.github.v3+json",
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("[GitHub] Screenshot attached to issue");
          }
        }

        return {
          issueNumber: newIssueNumber,
          url: issueUrl,
          isUpdate: false,
        };
      }
    } catch (error) {
      console.error("GitHub sync error:", error);
      if (error.response?.status === 401) {
        throw new Error("GitHub access token is invalid or expired");
      } else if (error.response?.status === 404) {
        throw new Error("Repository not found or access denied");
      } else if (error.response?.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded or insufficient permissions"
        );
      } else if (error.response?.status === 422) {
        const message = error.response?.data?.message || "Validation failed";
        const errors = error.response?.data?.errors || [];
        console.error("[GitHub] Validation error:", message, errors);
        throw new Error(`GitHub validation error: ${message}`);
      }
      throw new Error(
        `Failed to sync to GitHub: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async validateGitHubConnector(
    accessToken: string,
    owner: string,
    repo: string
  ): Promise<boolean> {
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

      // Check if we have issues permission
      const permissions = response.data.permissions;
      return permissions?.push === true || permissions?.admin === true;
    } catch (error) {
      console.error("GitHub validation error:", error);
      return false;
    }
  }
}

export const connectorService = new ConnectorService();
