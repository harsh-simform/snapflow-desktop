import { app } from "electron";
import path from "path";
import fs from "fs/promises";
import { format } from "date-fns";

export class StorageManager {
  private baseDir: string;

  constructor(customPath?: string) {
    // Delay initialization until app is ready
    if (customPath) {
      this.baseDir = customPath;
    } else {
      // Will be initialized in ensureDirectories
      this.baseDir = "";
    }
  }

  async ensureDirectories() {
    // Initialize baseDir if not set
    if (!this.baseDir) {
      this.baseDir = path.join(app.getPath("home"), "SnapFlow");
    }
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.baseDir, "Captures"), { recursive: true });
    await fs.mkdir(path.join(this.baseDir, "screenshots"), { recursive: true });
  }

  getCapturePath(issueId: string): string {
    const now = new Date();
    const year = format(now, "yyyy");
    const month = format(now, "MM");
    const day = format(now, "dd");

    return path.join(this.baseDir, "Captures", year, month, day, issueId);
  }

  async createIssueDirectory(issueId: string): Promise<string> {
    const dirPath = this.getCapturePath(issueId);
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  async saveCapture(
    issueId: string,
    fileName: string,
    data: Buffer
  ): Promise<string> {
    const dirPath = await this.createIssueDirectory(issueId);
    const filePath = path.join(dirPath, fileName);
    await fs.writeFile(filePath, data);
    return filePath;
  }

  async saveMetadata(issueId: string, metadata: any): Promise<string> {
    const dirPath = await this.createIssueDirectory(issueId);
    const metaPath = path.join(dirPath, "meta.json");
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
    return metaPath;
  }

  async loadMetadata(issueId: string): Promise<any> {
    const dirPath = this.getCapturePath(issueId);
    const metaPath = path.join(dirPath, "meta.json");
    const data = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(data);
  }

  async deleteIssue(issueId: string): Promise<void> {
    const dirPath = this.getCapturePath(issueId);
    await fs.rm(dirPath, { recursive: true, force: true });
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  setBaseDir(newPath: string): void {
    this.baseDir = newPath;
  }
}

export const storageManager = new StorageManager();
