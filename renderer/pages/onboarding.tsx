import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "sonner";
import type { Tenant, Workspace, OnboardingStatus, UserRole } from "../types";
import { WindowControls } from "../components/ui/WindowControls";
import { Button } from "../components/ui/Button";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [connectors, setConnectors] = useState<{ type: string }[]>([]);

  // Step 1: Tenant form
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");

  // Step 2: Invite form
  const [invites, setInvites] = useState<
    Array<{ id: string; email: string; role: UserRole }>
  >([]);
  const [_newInviteEmail, _setNewInviteEmail] = useState("");
  const [_newInviteRole, _setNewInviteRole] = useState<UserRole>("dev");
  const [invitesSending, setInvitesSending] = useState(false);

  // Step 3: Workspace form
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");

  // Step 4: Connectors
  const [githubToken, setGithubToken] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubValidating, setGithubValidating] = useState(false);
  const [githubValid, setGithubValid] = useState(false);

  const [zohoToken, setZohoToken] = useState("");
  const [zohoPortalId, setZohoPortalId] = useState("");
  const [zohoValidating, setZohoValidating] = useState(false);
  const [zohoValid, setZohoValid] = useState(false);

  const [connectorAddedType, setConnectorAddedType] = useState<string>("");

  // Load initial onboarding status
  useEffect(() => {
    async function loadStatus() {
      try {
        const result = await window.api.getOnboardingStatus();
        if (!result.success) {
          setError("Failed to load onboarding status");
          setLoading(false);
          return;
        }

        const status = result.data as OnboardingStatus;

        // If already complete, go to home
        if (status.isComplete) {
          router.push("/home");
          return;
        }

        setStep(status.currentStep);
        setTenant(status.tenant || null);
        setWorkspace(status.workspace || null);
        setLoading(false);
      } catch (err) {
        console.error("Error loading onboarding status:", err);
        setError("Failed to load onboarding");
        setLoading(false);
      }
    }

    loadStatus();
  }, [router]);

  // Handle tenant creation
  async function handleCreateTenant() {
    if (!tenantName.trim()) {
      setError("Organization name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const _slug = slugify(tenantName);
      const result = await window.api.createTenant(tenantName, "");

      if (!result.success) {
        setError(result.error || "Failed to create organization");
        setSaving(false);
        return;
      }

      const newTenant = result.data as Tenant;
      setTenant(newTenant);
      toast.success("Organization created successfully!");
      setStep(2);
    } catch (err) {
      console.error("Error creating tenant:", err);
      setError("Failed to create organization");
    } finally {
      setSaving(false);
    }
  }

  // Handle adding invite row
  function handleAddInvite() {
    setInvites([
      ...invites,
      { id: Date.now().toString(), email: "", role: "dev" },
    ]);
  }

  // Handle removing invite row
  function handleRemoveInvite(id: string) {
    setInvites(invites.filter((inv) => inv.id !== id));
  }

  // Handle sending invites
  async function handleSendInvites() {
    if (invites.length === 0) {
      setStep(3);
      return;
    }

    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) {
      toast.info("No valid emails to invite");
      setStep(3);
      return;
    }

    setInvitesSending(true);
    setError("");

    let successCount = 0;
    let failureCount = 0;

    for (const invite of validInvites) {
      try {
        const result = await window.api.inviteTeamMember(
          workspace?.id || "",
          invite.email,
          invite.role
        );

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (err) {
        failureCount++;
        console.error("Error inviting member:", err);
      }
    }

    setInvitesSending(false);

    if (failureCount > 0) {
      toast.warning(`Sent ${successCount} invites, ${failureCount} failed`);
    } else {
      toast.success(`Sent ${successCount} invites successfully!`);
    }

    setStep(3);
  }

  // Handle workspace creation
  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    if (!tenant) {
      setError("Tenant not set");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await window.api.createWorkspace(
        tenant.id,
        workspaceName,
        ""
      );

      if (!result.success) {
        setError(result.error || "Failed to create workspace");
        setSaving(false);
        return;
      }

      const newWorkspace = result.data as Workspace;
      setWorkspace(newWorkspace);
      toast.success("Workspace created successfully!");
      setStep(4);
    } catch (err) {
      console.error("Error creating workspace:", err);
      setError("Failed to create workspace");
    } finally {
      setSaving(false);
    }
  }

  // Handle GitHub validation
  async function handleValidateGitHub() {
    if (!githubToken.trim() || !githubOwner.trim() || !githubRepo.trim()) {
      setError("All GitHub fields are required");
      return;
    }

    setGithubValidating(true);
    setError("");

    try {
      const result = await window.api.validateGitHubConnector(
        githubToken,
        githubOwner,
        githubRepo
      );

      if (!result.success) {
        setError("GitHub validation failed");
        setGithubValid(false);
      } else if (result.data?.isValid) {
        setGithubValid(true);
        toast.success("GitHub connector validated!");
      } else {
        setError("Invalid GitHub credentials or insufficient permissions");
        setGithubValid(false);
      }
    } catch (err) {
      console.error("Error validating GitHub:", err);
      setError("Failed to validate GitHub connector");
      setGithubValid(false);
    } finally {
      setGithubValidating(false);
    }
  }

  // Handle Zoho validation
  async function handleValidateZoho() {
    if (!zohoToken.trim() || !zohoPortalId.trim()) {
      setError("Zoho token and portal ID are required");
      return;
    }

    setZohoValidating(true);
    setError("");

    try {
      const result = await window.api.validateZohoConnector(
        zohoToken,
        zohoPortalId
      );

      if (!result.success) {
        setError("Zoho validation failed");
        setZohoValid(false);
      } else if (result.data?.isValid) {
        setZohoValid(true);
        toast.success("Zoho connector validated!");
      } else {
        setError("Invalid Zoho credentials");
        setZohoValid(false);
      }
    } catch (err) {
      console.error("Error validating Zoho:", err);
      setError("Failed to validate Zoho connector");
      setZohoValid(false);
    } finally {
      setZohoValidating(false);
    }
  }

  // Handle adding connector
  async function handleAddConnector(type: "github" | "zoho") {
    if (type === "github" && !githubValid) {
      setError("Please validate GitHub first");
      return;
    }

    if (type === "zoho" && !zohoValid) {
      setError("Please validate Zoho first");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const connectorData: Record<string, unknown> =
        type === "github"
          ? {
              workspaceId: workspace?.id,
              name: `GitHub (${githubOwner}/${githubRepo})`,
              type: "github",
              enabled: true,
              config: {
                accessToken: githubToken,
                owner: githubOwner,
                repo: githubRepo,
              },
            }
          : {
              workspaceId: workspace?.id,
              name: `Zoho (${zohoPortalId})`,
              type: "zoho",
              enabled: true,
              config: {
                accessToken: zohoToken,
                portalId: zohoPortalId,
                refreshToken: "",
                clientId: "",
                clientSecret: "",
                projectId: "",
              },
            };

      const result = await window.api.addConnector(
        workspace?.id || "",
        connectorData
      );

      if (!result.success) {
        setError(result.error || `Failed to add ${type} connector`);
        setSaving(false);
        return;
      }

      setConnectorAddedType(type);
      setConnectors([...connectors, { type }]);
      toast.success(`${type} connector added successfully!`);

      // Reset the form
      if (type === "github") {
        setGithubToken("");
        setGithubOwner("");
        setGithubRepo("");
        setGithubValid(false);
      } else {
        setZohoToken("");
        setZohoPortalId("");
        setZohoValid(false);
      }
    } catch (err) {
      console.error("Error adding connector:", err);
      setError(`Failed to add ${type} connector`);
    } finally {
      setSaving(false);
    }
  }

  // Handle completing onboarding
  async function handleComplete() {
    if (connectors.length === 0) {
      setError("At least one connector is required");
      return;
    }

    // All steps are complete - navigate to home
    router.push("/home");
  }

  // Handle skip connectors (go to home but incomplete)
  async function handleSkipConnectors() {
    // Can skip connectors for now
    toast.warning(
      "You can add connectors later in settings. Some features may be unavailable."
    );
    router.push("/home");
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-300">Loading onboarding...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>SnapFlow - Onboarding</title>
      </Head>
      <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
        {/* Titlebar */}
        <div
          className="glass-strong border-b border-white/5 flex-shrink-0"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <div className="flex items-center justify-end h-9 pl-4">
            <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
              <WindowControls />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-12 px-4">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-100 mb-2">
                Welcome to SnapFlow
              </h1>
              <p className="text-gray-400">
                Let's set up your workspace in a few steps
              </p>
            </div>

            {/* Step Indicator */}
            <div className="flex justify-between mb-12">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      s <= step
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {s < step ? "✓" : s}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      s <= step ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {s === 1
                      ? "Org"
                      : s === 2
                        ? "Team"
                        : s === 3
                          ? "Workspace"
                          : s === 4
                            ? "Connectors"
                            : "Done"}
                  </div>
                </div>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Create Organization */}
            {step === 1 && (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                <h2 className="text-2xl font-bold text-gray-100 mb-6">
                  Create Your Organization
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={tenantName}
                      onChange={(e) => {
                        setTenantName(e.target.value);
                        setTenantSlug(slugify(e.target.value));
                      }}
                      placeholder="Acme Corp"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  {tenantSlug && (
                    <div className="text-sm text-gray-400">
                      Slug:{" "}
                      <code className="bg-gray-800 px-2 py-1 rounded">
                        {tenantSlug}
                      </code>
                    </div>
                  )}
                  <Button
                    onClick={handleCreateTenant}
                    disabled={saving || !tenantName.trim()}
                    className="w-full"
                  >
                    {saving ? "Creating..." : "Create Organization"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Invite Team */}
            {step === 2 && (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-100">
                    Invite Your Team
                  </h2>
                  <button
                    onClick={() => setStep(3)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Skip for now
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex gap-3 items-end">
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => {
                          setInvites(
                            invites.map((inv) =>
                              inv.id === invite.id
                                ? { ...inv, email: e.target.value }
                                : inv
                            )
                          );
                        }}
                        placeholder="user@example.com"
                        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <select
                        value={invite.role}
                        onChange={(e) => {
                          setInvites(
                            invites.map((inv) =>
                              inv.id === invite.id
                                ? { ...inv, role: e.target.value as UserRole }
                                : inv
                            )
                          );
                        }}
                        className="px-3 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        {["admin", "pm", "qa", "dev", "client"].map((role) => (
                          <option key={role} value={role}>
                            {role.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemoveInvite(invite.id)}
                        className="px-3 py-3 text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleAddInvite}
                    variant="secondary"
                    className="flex-1"
                  >
                    + Add Email
                  </Button>
                  <Button
                    onClick={handleSendInvites}
                    disabled={invitesSending}
                    className="flex-1"
                  >
                    {invitesSending ? "Sending..." : "Send Invites"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Create Workspace */}
            {step === 3 && (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                <h2 className="text-2xl font-bold text-gray-100 mb-2">
                  Create a Workspace
                </h2>
                <p className="text-gray-400 mb-6">
                  A workspace is a project within your organization
                </p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => {
                        setWorkspaceName(e.target.value);
                        setWorkspaceSlug(slugify(e.target.value));
                      }}
                      placeholder="Web Application Project"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  {workspaceSlug && (
                    <div className="text-sm text-gray-400">
                      Slug:{" "}
                      <code className="bg-gray-800 px-2 py-1 rounded">
                        {workspaceSlug}
                      </code>
                    </div>
                  )}
                  <Button
                    onClick={handleCreateWorkspace}
                    disabled={saving || !workspaceName.trim()}
                    className="w-full"
                  >
                    {saving ? "Creating..." : "Create Workspace"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Add Connectors */}
            {step === 4 && (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-100">
                    Connect Your Tools
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* GitHub Card */}
                  <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-100">GitHub</h3>
                      {connectorAddedType === "github" && (
                        <span className="text-green-400 text-lg">✓</span>
                      )}
                    </div>

                    {connectorAddedType !== "github" ? (
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          placeholder="Personal Access Token"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                          type="text"
                          value={githubOwner}
                          onChange={(e) => setGithubOwner(e.target.value)}
                          placeholder="Owner (username or org)"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                          type="text"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          placeholder="Repository"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleValidateGitHub}
                            disabled={
                              githubValidating ||
                              !githubToken ||
                              !githubOwner ||
                              !githubRepo
                            }
                            className="flex-1 py-2 text-sm"
                            variant={githubValid ? "secondary" : "primary"}
                          >
                            {githubValidating
                              ? "Validating..."
                              : githubValid
                                ? "✓ Valid"
                                : "Validate"}
                          </Button>
                          {githubValid && (
                            <Button
                              onClick={() => handleAddConnector("github")}
                              disabled={saving}
                              className="flex-1 py-2 text-sm"
                            >
                              {saving ? "Adding..." : "Connect"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-green-400 text-sm">
                        Connected: {githubOwner}/{githubRepo}
                      </div>
                    )}
                  </div>

                  {/* Zoho Card */}
                  <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-100">Zoho</h3>
                      {connectorAddedType === "zoho" && (
                        <span className="text-green-400 text-lg">✓</span>
                      )}
                    </div>

                    {connectorAddedType !== "zoho" ? (
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={zohoToken}
                          onChange={(e) => setZohoToken(e.target.value)}
                          placeholder="Access Token"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input
                          type="text"
                          value={zohoPortalId}
                          onChange={(e) => setZohoPortalId(e.target.value)}
                          placeholder="Portal ID"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleValidateZoho}
                            disabled={
                              zohoValidating || !zohoToken || !zohoPortalId
                            }
                            className="flex-1 py-2 text-sm"
                            variant={zohoValid ? "secondary" : "primary"}
                          >
                            {zohoValidating
                              ? "Validating..."
                              : zohoValid
                                ? "✓ Valid"
                                : "Validate"}
                          </Button>
                          {zohoValid && (
                            <Button
                              onClick={() => handleAddConnector("zoho")}
                              disabled={saving}
                              className="flex-1 py-2 text-sm"
                            >
                              {saving ? "Adding..." : "Connect"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-green-400 text-sm">
                        Connected: {zohoPortalId}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleComplete}
                    disabled={connectors.length === 0}
                    className="w-full"
                  >
                    Continue to SnapFlow
                  </Button>
                  <button
                    onClick={handleSkipConnectors}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Skip for now – set up later
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Completion */}
            {step === 5 && (
              <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
                <div className="text-6xl mb-6">✓</div>
                <h2 className="text-3xl font-bold text-gray-100 mb-2">
                  All Set!
                </h2>
                <p className="text-gray-400 mb-8">
                  Your workspace is ready. Let's start capturing!
                </p>

                <Button onClick={() => router.push("/home")} className="w-full">
                  Go to SnapFlow
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
