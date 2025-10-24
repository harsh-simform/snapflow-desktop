import React, { useEffect, useState } from "react";
import { Connector } from "../../types";
import { Button } from "../ui/Button";

interface ConnectorForm {
  id: string;
  accessToken: string;
  owner: string;
  repo: string;
  name: string;
  validating: boolean;
  validationStatus: "idle" | "validating" | "success" | "error";
  validationMessage: string;
}

export function GitHubConnectorManager() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<ConnectorForm[]>([]);

  const addNewForm = () => {
    setForms([
      ...forms,
      {
        id: Date.now().toString(),
        accessToken: "",
        owner: "",
        repo: "",
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
    loadConnectors();
  }, []);

  useEffect(() => {
    // Add first form automatically if no connectors and no forms exist
    if (connectors.length === 0 && forms.length === 0 && !loading) {
      addNewForm();
    }
  }, [connectors, forms, loading]);

  const loadConnectors = async () => {
    try {
      const result = await window.api.listConnectors();
      if (result.success) {
        const githubConnectors = (result.data || []).filter(
          (c: Connector) => c.type === "github"
        );
        setConnectors(githubConnectors);
      }
    } catch (error) {
      console.error("Failed to load connectors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGitHub = async (formId: string) => {
    const formData = forms.find((f) => f.id === formId);
    if (!formData) return;

    updateForm(formId, {
      validating: true,
      validationStatus: "validating",
      validationMessage: "Validating repository access...",
    });

    try {
      // Validate the connector first
      const validationResult = await window.api.validateGitHubConnector(
        formData.accessToken,
        formData.owner,
        formData.repo
      );

      if (!validationResult.success || !validationResult.data.isValid) {
        updateForm(formId, {
          validating: false,
          validationStatus: "error",
          validationMessage:
            "Repository validation failed. Please check your access token and repository details.",
        });
        return;
      }

      updateForm(formId, {
        validationStatus: "success",
        validationMessage:
          "Repository validated successfully! Adding connector...",
      });

      // Add the connector
      const result = await window.api.addConnector({
        name: formData.name || `${formData.owner}/${formData.repo}`,
        type: "github",
        enabled: true,
        config: {
          accessToken: formData.accessToken,
          owner: formData.owner,
          repo: formData.repo,
        },
      });

      if (result.success) {
        updateForm(formId, {
          validationStatus: "success",
          validationMessage: "Repository connected successfully!",
        });
        setTimeout(() => {
          removeForm(formId);
          loadConnectors();
        }, 1500);
      } else {
        updateForm(formId, {
          validating: false,
          validationStatus: "error",
          validationMessage: `Failed to connect repository: ${result.error}`,
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
    // eslint-disable-next-line no-undef
    const confirmed = confirm(
      `🗑️ Remove "${name}"?\n\nThis will disconnect the repository. You can always reconnect it later.`
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

  const canAddMore = connectors.length + forms.length < 5;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-10 h-10 border-3 border-transparent border-t-blue-400/40 rounded-full animate-spin"
              style={{
                animationDuration: "1.5s",
                animationDirection: "reverse",
              }}
            ></div>
          </div>
          <span className="text-gray-300 font-medium">
            Loading repositories...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Repositories */}
      {connectors.map((connector) => (
        <div
          key={connector.id}
          className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600/50 transition-all duration-300 backdrop-blur-sm max-w-4xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl flex items-center justify-center group-hover:border-gray-500/50 transition-all duration-300">
                <svg
                  className="w-6 h-6 text-gray-400 group-hover:text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate">
                  {connector.name}
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors font-mono truncate">
                  {connector.config.owner}/{connector.config.repo}
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
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 hover:bg-gray-500 peer-checked:hover:bg-blue-700 transition-colors"></div>
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
              handleAddGitHub(form.id);
            }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100">
                  {connectors.length > 0
                    ? `GitHub Repository #${connectors.length + index + 1}`
                    : "Connect GitHub Repository"}
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
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-200"
                    placeholder="My Awesome Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Personal Access Token{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={form.accessToken}
                    onChange={(e) =>
                      updateForm(form.id, { accessToken: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-200 font-mono"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>

              {/* Help text for token */}
              <div className="p-3 bg-blue-900/10 border border-blue-800/20 rounded-lg -mt-2">
                <p className="text-xs text-blue-300/80">
                  💡 Need a token? Go to GitHub Settings → Developer settings →
                  Personal access tokens → Generate new token (classic) with{" "}
                  <code className="bg-blue-800/30 px-1.5 py-0.5 rounded text-blue-300 font-mono">
                    repo
                  </code>{" "}
                  scope
                </p>
              </div>

              {/* Owner and Repository */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Owner <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.owner}
                    onChange={(e) =>
                      updateForm(form.id, { owner: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-200"
                    placeholder="octocat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Repository <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.repo}
                    onChange={(e) =>
                      updateForm(form.id, { repo: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/50 text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all duration-200"
                    placeholder="hello-world"
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
                        : "bg-blue-900/20 border-blue-800/30"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {form.validationStatus === "validating" && (
                      <svg
                        className="w-5 h-5 text-blue-400 animate-spin"
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
                            : "text-blue-300"
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
                    !form.owner ||
                    !form.repo
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
                    ? "Connecting Repository..."
                    : "Connect Repository"}
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
            className="w-full border-2 border-dashed hover:border-blue-500/50 hover:bg-blue-500/5"
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
            Add Another Repository ({connectors.length + forms.length}/5)
          </Button>
        </div>
      )}

      {/* Limit Reached Message */}
      {!canAddMore && (
        <div className="max-w-4xl p-6 bg-yellow-900/20 border border-yellow-800/30 rounded-2xl">
          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-yellow-300 mb-1">
                Maximum Repositories Reached
              </h3>
              <p className="text-sm text-yellow-400/80">
                You've reached the maximum limit of 5 repositories. Remove an
                existing repository to add a new one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
