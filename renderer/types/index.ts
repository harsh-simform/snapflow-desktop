export type UserRole = "admin" | "pm" | "qa" | "dev" | "client";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface WorkspaceWithMembers extends Workspace {
  members?: WorkspaceMember[];
  currentUserRole?: UserRole;
}

export interface Issue {
  id: string;
  workspaceId: string;
  createdBy: string;
  title: string;
  description?: string;
  type: "screenshot" | "recording";
  timestamp: string;
  filePath: string;
  thumbnailPath?: string;
  cloudFileUrl?: string;
  cloudThumbnailUrl?: string;
  syncStatus: "local" | "synced" | "syncing" | "failed";
  syncedTo?: {
    platform: string;
    externalId: string;
    url?: string;
    connectorId?: string;
  }[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface GitHubConnectorConfig {
  accessToken: string;
  owner: string;
  repo: string;
}

export interface ZohoConnectorConfig {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  portalId: string;
  projectId: string;
}

export interface Connector {
  id: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  type: "github" | "zoho";
  enabled: boolean;
  config: GitHubConnectorConfig | ZohoConnectorConfig;
  lastSyncAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaptureOptions {
  mode: "fullscreen" | "window" | "region";
  windowId?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RecordingOptions {
  mode: "fullscreen" | "region";
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  audioEnabled?: boolean;
}

export interface AppSettings {
  storagePath: string;
  defaultCaptureMode: "fullscreen" | "window" | "region";
  defaultRecordingMode: "fullscreen" | "region";
  shortcuts: {
    captureScreenshot: string;
    recordScreen: string;
    openApp: string;
  };
}

export interface OnboardingStatus {
  hasTenant: boolean;
  hasWorkspace: boolean;
  hasConnector: boolean;
  isComplete: boolean;
  currentStep: number; // 1=tenant, 2=invite, 3=workspace, 4=connectors
  tenant?: Tenant;
  workspace?: Workspace;
}

export type IPCChannel =
  | "user:create"
  | "user:get"
  | "user:login"
  | "user:logout"
  | "user:google-signin"
  | "tenant:create"
  | "tenant:list"
  | "tenant:get"
  | "tenant:update"
  | "workspace:create"
  | "workspace:list"
  | "workspace:get"
  | "workspace:update"
  | "workspace:delete"
  | "workspace-member:add"
  | "workspace-member:list"
  | "workspace-member:remove"
  | "workspace-member:update-role"
  | "workspace-member:invite"
  | "onboarding:get-status"
  | "issue:create"
  | "issue:list"
  | "issue:update"
  | "issue:delete"
  | "capture:screenshot"
  | "capture:start-recording"
  | "capture:stop-recording"
  | "connector:list"
  | "connector:add"
  | "connector:update"
  | "connector:delete"
  | "connector:validate-github"
  | "connector:validate-zoho"
  | "connector:get-zoho-portals"
  | "connector:get-zoho-projects"
  | "sync:issue"
  | "sync:to-cloud"
  | "sync:from-cloud"
  | "sync:full"
  | "sync:get-history"
  | "db:get-config"
  | "db:set-config"
  | "db:test-connection"
  | "settings:get"
  | "settings:update"
  | "app:quit"
  | "app:show-window"
  | "app:hide-window";
