import React, { useEffect, useState } from "react";
import { Connector } from "../../types";
import { Button } from "../ui/Button";

interface ConnectorForm {
  id: string;
  accessToken: string;
  portalId: string;
  projectId: string;
  name: string;
  validating: boolean;
  validationStatus: "idle" | "validating" | "success" | "error";
  validationMessage: string;
}

export function ZohoConnectorManager() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<ConnectorForm[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  const addNewForm = () => {
    setForms([
      ...forms,
      {
        id: Date.now().toString(),
        accessToken: "",
        portalId: "",
        projectId: "",
        name: "",
        validating: false,
        validationStatus: "idle",
        validationMessage: "",
      },
    ]);
  };

  const removeForm = (formId: string) => {
    setForms(forms.filter((f) => f.id !== formId));
  };

  const updateForm = (formId: string, updates: Partial<ConnectorForm>) => {
    setForms(forms.map((f) => (f.id === formId ? { ...f, ...updates } : f)));
  };

  useEffect(() => {
    getWorkspace();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      loadConnectors();
    }
  }, [workspaceId]);

  useEffect(() => {
    // Add first form automatically if no connectors and no forms exist
    if (connectors.length === 0 && forms.length === 0 && !loading) {
      addNewForm();
    }
  }, [connectors, forms, loading]);

  const getWorkspace = async () => {
    try {
      const tenantResult = await window.api.getUserTenant();
      if (tenantResult.success && tenantResult.data?.id) {
        const workspacesResult = await window.api.listWorkspaces(
          tenantResult.data.id
        );
        if (workspacesResult.success && workspacesResult.data?.length > 0) {
          setWorkspaceId(workspacesResult.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to get workspace:", error);
      setLoading(false);
    }
  };

  const loadConnectors = async () => {
    try {
      const result = await window.api.listConnectors(workspaceId);
      if (result.success) {
        const zohoConnectors = (result.data || []).filter(
          (c: Connector) => c.type === "zoho"
        );
        setConnectors(zohoConnectors);
      }
    } catch (error) {
      console.error("Failed to load connectors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddZoho = async (formId: string) => {
    const formData = forms.find((f) => f.id === formId);
    if (!formData) return;

    updateForm(formId, {
      validating: true,
      validationStatus: "validating",
      validationMessage: "Validating Zoho credentials...",
    });

    try {
      // Validate the connector first
      const validationResult = await window.api.validateZohoConnector(
        formData.accessToken,
        formData.portalId
      );

      if (!validationResult.success || !validationResult.data.isValid) {
        updateForm(formId, {
          validating: false,
          validationStatus: "error",
          validationMessage:
            "Zoho validation failed. Please check your access token and portal ID.",
        });
        return;
      }

      updateForm(formId, {
        validationStatus: "success",
        validationMessage:
          "Credentials validated successfully! Adding connector...",
      });

      // Add the connector
      const result = await window.api.addConnector(workspaceId, {
        name: formData.name || "Zoho Projects",
        type: "zoho",
        enabled: true,
        config: {
          accessToken: formData.accessToken,
          portalId: formData.portalId,
          projectId: formData.projectId,
          refreshToken: "", // Will be obtained from Zoho OAuth
          clientId: "", // Will be configured server-side
          clientSecret: "", // Will be configured server-side
        },
      });

      if (result.success) {
        updateForm(formId, {
          validationStatus: "success",
          validationMessage: "Zoho Projects connected successfully!",
        });
        setTimeout(() => {
          removeForm(formId);
          loadConnectors();
        }, 1500);
      } else {
        updateForm(formId, {
          validating: false,
          validationStatus: "error",
          validationMessage: `Failed to connect Zoho: ${result.error}`,
        });
      }
    } catch {
      updateForm(formId, {
        validating: false,
        validationStatus: "error",
        validationMessage:
          "Connection failed. Please check your internet connection and try again.",
      });
    }
  };

  const handleToggleConnector = async (id: string, enabled: boolean) => {
    try {
      const result = await window.api.updateConnector(id, { enabled });
      if (result.success) {
        loadConnectors();
      }
    } catch (error) {
      console.error("Failed to update connector:", error);
    }
  };

  const handleDeleteConnector = async (id: string, name: string) => {
    const confirmed = confirm(
      `🗑️ Remove "${name}"?\n\nThis will disconnect Zoho. You can always reconnect it later.`
    );
    if (!confirmed) return;

    try {
      const result = await window.api.deleteConnector(id);
      if (result.success) {
        loadConnectors();
      }
    } catch (error) {
      console.error("Failed to delete connector:", error);
    }
  };

  const canAddMore = connectors.length + forms.length < 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-10 h-10 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-10 h-10 border-3 border-transparent border-t-orange-400/40 rounded-full animate-spin"
              style={{
                animationDuration: "1.5s",
                animationDirection: "reverse",
              }}
            ></div>
          </div>
          <span className="text-gray-300 font-medium">
            Loading Zoho connectors...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Zoho Projects */}
      {connectors.map((connector) => (
        <div
          key={connector.id}
          className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-sm max-w-4xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600/30 to-orange-700/20 border border-orange-600/50 rounded-xl flex items-center justify-center group-hover:border-orange-500/50 transition-all duration-300">
                <svg
                  className="w-6 h-6 text-orange-400 group-hover:text-orange-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate">
                  {connector.name}
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors font-mono truncate">
                  Portal: {(connector.config as any).portalId}
                </p>
              </div>

              <div
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  connector.enabled
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    connector.enabled ? "bg-green-400" : "bg-gray-400"
                  }`}
                ></div>
                {connector.enabled ? "Active" : "Disabled"}
              </div>
            </div>

            <div className="flex items-center space-x-3 ml-6">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connector.enabled}
                  onChange={(e) =>
                    handleToggleConnector(connector.id, e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600 hover:bg-gray-500 peer-checked:hover:bg-orange-700 transition-colors"></div>
              </label>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleDeleteConnector(connector.id, connector.name)
                }
                className="hover:bg-red-500/10 hover:text-red-400"
                title={`Remove ${connector.name}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Connector Forms */}
      {forms.map((form, index) => (
        <div
          key={form.id}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm max-w-4xl"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddZoho(form.id);
            }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-600/20 border border-orange-500/30 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-orange-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Connect Zoho Projects
                </h3>
              </div>
              {forms.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeForm(form.id)}
                  className="hover:bg-gray-700/50"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Button>
              )}
            </div>

            <div className="grid gap-5">
              {/* Display Name & Access Token in one row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Display Name{" "}
                    <span className="text-gray-400 font-normal">
                      (Optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      updateForm(form.id, { name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition-all duration-200"
                    placeholder="My Zoho Workspace"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Access Token <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={form.accessToken}
                    onChange={(e) =>
                      updateForm(form.id, { accessToken: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition-all duration-200 font-mono"
                    placeholder="Your Zoho API token"
                  />
                </div>
              </div>

              {/* Help text for token */}
              <div className="p-3 bg-orange-900/10 border border-orange-800/20 rounded-lg -mt-2">
                <p className="text-xs text-orange-300/80">
                  💡 Get your access token from Zoho Projects → Settings →
                  Developer → API Token
                </p>
              </div>

              {/* Portal ID and Project ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Portal ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.portalId}
                    onChange={(e) =>
                      updateForm(form.id, { portalId: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition-all duration-200"
                    placeholder="Your portal ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Project ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.projectId}
                    onChange={(e) =>
                      updateForm(form.id, { projectId: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition-all duration-200"
                    placeholder="Your project ID"
                  />
                </div>
              </div>

              {/* Validation Status */}
              {form.validationStatus !== "idle" && (
                <div
                  className={`p-4 rounded-xl border ${
                    form.validationStatus === "success"
                      ? "bg-green-900/20 border-green-800/30"
                      : form.validationStatus === "error"
                        ? "bg-red-900/20 border-red-800/30"
                        : "bg-orange-900/20 border-orange-800/30"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {form.validationStatus === "validating" && (
                      <svg
                        className="w-5 h-5 text-orange-400 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    )}
                    {form.validationStatus === "success" && (
                      <svg
                        className="w-5 h-5 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {form.validationStatus === "error" && (
                      <svg
                        className="w-5 h-5 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    <span
                      className={`text-sm font-medium ${
                        form.validationStatus === "success"
                          ? "text-green-300"
                          : form.validationStatus === "error"
                            ? "text-red-300"
                            : "text-orange-300"
                      }`}
                    >
                      {form.validationMessage}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={
                    form.validating ||
                    !form.accessToken ||
                    !form.portalId ||
                    !form.projectId
                  }
                  isLoading={form.validating}
                  leftIcon={
                    !form.validating && (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    )
                  }
                  className="px-8"
                >
                  {form.validating
                    ? "Connecting Zoho..."
                    : "Connect Zoho Projects"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      ))}

      {/* Add Another Button */}
      {canAddMore && (
        <div className="max-w-4xl">
          <Button
            variant="outline"
            size="md"
            onClick={addNewForm}
            className="w-full border-2 border-dashed hover:border-orange-500/50 hover:bg-orange-500/5"
            leftIcon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
          >
            Add Zoho Projects (1/1)
          </Button>
        </div>
      )}
    </div>
  );
}
