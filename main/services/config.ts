import Store from "electron-store";
import { app } from "electron";
import path from "path";
import fs from "fs";

interface DatabaseConfig {
  url: string;
  provider: "postgresql";
  isConfigured: boolean;
}

const store = new Store<{ database: DatabaseConfig }>({
  name: "snapflow-config",
  defaults: {
    database: {
      url: "",
      provider: "postgresql",
      isConfigured: false,
    },
  },
});

export class ConfigService {
  /**
   * Get the database URL from store or environment variable
   */
  getDatabaseUrl(): string {
    // Priority: env variable > stored config > default
    const envUrl = process.env.DATABASE_URL;
    if (envUrl) {
      return envUrl;
    }

    const storedConfig = store.get("database");
    if (storedConfig.isConfigured && storedConfig.url) {
      return storedConfig.url;
    }

    // Default local PostgreSQL connection
    return "postgresql://postgres:postgres@localhost:5432/snapflow";
  }

  /**
   * Save database configuration
   */
  setDatabaseUrl(url: string): void {
    store.set("database", {
      url,
      provider: "postgresql",
      isConfigured: true,
    });

    // Update .env file for Prisma CLI
    this.updateEnvFile(url);
  }

  /**
   * Check if database is configured
   */
  isDatabaseConfigured(): boolean {
    return store.get("database").isConfigured || !!process.env.DATABASE_URL;
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): DatabaseConfig {
    const url = this.getDatabaseUrl();
    return {
      url,
      provider: "postgresql",
      isConfigured: this.isDatabaseConfigured(),
    };
  }

  /**
   * Update .env file with DATABASE_URL
   */
  private updateEnvFile(url: string): void {
    try {
      const envPath = path.join(app.getAppPath(), ".env");
      let envContent = "";

      // Read existing .env if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
      }

      // Update or add DATABASE_URL
      const urlPattern = /^DATABASE_URL=.*$/m;
      if (urlPattern.test(envContent)) {
        envContent = envContent.replace(urlPattern, `DATABASE_URL="${url}"`);
      } else {
        envContent += `\nDATABASE_URL="${url}"\n`;
      }

      fs.writeFileSync(envPath, envContent);
    } catch (error) {
      console.error("Failed to update .env file:", error);
      // Non-critical error, app can still function
    }
  }

  /**
   * Reset database configuration
   */
  resetDatabaseConfig(): void {
    store.set("database", {
      url: "",
      provider: "postgresql",
      isConfigured: false,
    });
  }
}

export const configService = new ConfigService();

// Set DATABASE_URL environment variable on startup
process.env.DATABASE_URL = configService.getDatabaseUrl();
