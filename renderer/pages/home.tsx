import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ChipsInput } from "../components/ui/ChipsInput";
import { SearchInput } from "../components/ui/SearchInput";
import { FilterBar, SortControl } from "../components/ui/FilterBar";
import {
  NoSnapsEmptyState,
  NoResultsEmptyState,
} from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogVisuallyHidden,
} from "../components/ui/Dialog";
import { WindowControls } from "../components/ui/WindowControls";
import { useStore } from "../store/useStore";
import { LocalImage } from "../components/ui/LocalImage";
import type { Issue } from "../types";

export default function HomePage() {
  const router = useRouter();
  const { user, setUser, issues, setIssues, deleteIssue, updateIssue } =
    useStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "screenshot" | "recording">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<"all" | "local" | "synced">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewIssue, setPreviewIssue] = useState<Issue | null>(null);
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("Loading user data...");
      const userResult = await window.api.getUser();
      console.log("User result:", userResult);

      if (userResult.success && userResult.data) {
        setUser(userResult.data);
        console.log("User loaded:", userResult.data.email);

        const issuesResult = await window.api.listIssues(userResult.data.id);
        if (issuesResult.success) {
          setIssues(issuesResult.data || []);
        }
      } else {
        console.error("No user data, redirecting to auth");
        router.push("/auth");
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load data");
      router.push("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (issue: Issue, connectorId: string) => {
    try {
      // Optimistic update
      updateIssue(issue.id, { syncStatus: "syncing" });
      toast.loading("Syncing to GitHub...", { id: `sync-${issue.id}` });

      const result = await window.api.syncIssue(issue.id, connectorId);

      if (result.success) {
        const message = result.data?.message || "Successfully synced to GitHub";
        toast.success(message, {
          id: `sync-${issue.id}`,
        });
        loadData(); // Reload to get updated sync status
      } else {
        toast.error(`Sync failed: ${result.error}`, { id: `sync-${issue.id}` });
        updateIssue(issue.id, { syncStatus: "failed" });
      }
    } catch {
      toast.error("An error occurred during sync", { id: `sync-${issue.id}` });
      updateIssue(issue.id, { syncStatus: "failed" });
    }
  };

  const confirmDelete = (issueId: string) => {
    setIssueToDelete(issueId);
    setDeleteDialogOpen(true);
  };

  const openPreview = (issue: Issue) => {
    setPreviewIssue(issue);
    setPreviewDialogOpen(true);
    setIsEditingDescription(false);
    setEditedDescription("");
  };

  const handleDeleteIssue = async () => {
    if (!issueToDelete) return;

    try {
      const result = await window.api.deleteIssue(issueToDelete);
      if (result.success) {
        deleteIssue(issueToDelete);
        toast.success("Issue deleted successfully");
        setDeleteDialogOpen(false);
        setIssueToDelete(null);
      } else {
        toast.error(`Delete failed: ${result.error}`);
      }
    } catch {
      toast.error("An error occurred while deleting");
    }
  };

  const handleUpdateTags = async (issueId: string, tags: string[]) => {
    try {
      const result = await window.api.updateIssue(issueId, { tags });
      if (result.success) {
        updateIssue(issueId, { tags });
        if (previewIssue && previewIssue.id === issueId) {
          setPreviewIssue({ ...previewIssue, tags });
        }
        toast.success("Tags updated successfully");
      } else {
        toast.error(`Failed to update tags: ${result.error}`);
      }
    } catch {
      toast.error("An error occurred while updating tags");
    }
  };

  const handleUpdateDescription = async (
    issueId: string,
    description: string
  ) => {
    try {
      const result = await window.api.updateIssue(issueId, { description });
      if (result.success) {
        updateIssue(issueId, { description });
        if (previewIssue && previewIssue.id === issueId) {
          setPreviewIssue({ ...previewIssue, description });
        }
        setIsEditingDescription(false);
        toast.success("Description updated successfully");
      } else {
        toast.error(`Failed to update description: ${result.error}`);
      }
    } catch {
      toast.error("An error occurred while updating description");
    }
  };

  const startEditingDescription = () => {
    setEditedDescription(previewIssue?.description || "");
    setIsEditingDescription(true);
  };

  const cancelEditingDescription = () => {
    setIsEditingDescription(false);
    setEditedDescription("");
  };

  const saveDescription = () => {
    if (previewIssue) {
      handleUpdateDescription(previewIssue.id, editedDescription);
    }
  };

  // Get all unique tags from issues
  const allTags = Array.from(
    new Set(issues.flatMap((issue) => issue.tags || []))
  ).sort();

  const filteredIssues = issues
    .filter((issue) => {
      const matchesFilter = filter === "all" || issue.type === filter;
      const matchesStatusFilter =
        statusFilter === "all" ||
        (statusFilter === "local" && issue.syncStatus === "local") ||
        (statusFilter === "synced" && issue.syncStatus === "synced");
      const matchesSearch =
        searchQuery === "" ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTagsFilter =
        tagsFilter.length === 0 ||
        (issue.tags && tagsFilter.some((tag) => issue.tags?.includes(tag)));
      return (
        matchesFilter &&
        matchesStatusFilter &&
        matchesSearch &&
        matchesTagsFilter
      );
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        // Sort by name
        const nameA = a.title.toLowerCase();
        const nameB = b.title.toLowerCase();
        if (sortOrder === "asc") {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      }
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, statusFilter, searchQuery, tagsFilter, sortBy, sortOrder]);

  const getGitHubSyncBadge = (issue: Issue) => {
    const githubSync = issue.syncedTo?.find(
      (sync) => sync.platform === "github"
    );

    if (issue.syncStatus === "syncing") {
      return <Badge variant="warning">Syncing...</Badge>;
    }

    if (githubSync) {
      return <Badge variant="success">GitHub Synced</Badge>;
    }

    return <Badge variant="gray">Not Synced</Badge>;
  };

  // GitHub Sync Dropdown Component
  const GitHubSyncDropdown = ({
    issue,
    className = "",
  }: {
    issue: Issue;
    className?: string;
  }) => {
    const [connectors, setConnectors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
      loadConnectors();
    }, []);

    const loadConnectors = async () => {
      try {
        const result = await window.api.listConnectors();
        if (result.success) {
          const githubConnectors = (result.data || []).filter(
            (c: any) => c.type === "github" && c.enabled
          );
          setConnectors(githubConnectors);
        }
      } catch (error) {
        console.error("Failed to load connectors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <Button variant="ghost" size="sm" disabled className={className}>
          <svg
            className="w-4 h-4 animate-spin"
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
        </Button>
      );
    }

    if (connectors.length === 0) {
      return (
        <Button
          variant="ghost"
          size="sm"
          disabled
          className={className}
          title="No GitHub repositories configured"
        >
          <svg
            className="w-4 h-4 opacity-50"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </Button>
      );
    }

    if (connectors.length === 1) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSync(issue, connectors[0].id)}
          disabled={issue.syncStatus === "syncing"}
          className={className}
          title={`Sync to ${connectors[0].name}`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </Button>
      );
    }

    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          disabled={issue.syncStatus === "syncing"}
          className={`${className} flex items-center space-x-1`}
          title="Sync to GitHub repository"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-lg shadow-2xl z-50 min-w-48">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => {
                  handleSync(issue, connector.id);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800/50 hover:text-gray-100 transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
              >
                <span className="truncate">{connector.name}</span>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {connector.config.owner}/{connector.config.repo}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      console.log("[LOGOUT] === LOGOUT FLOW START ===");
      console.log("[LOGOUT] Current user:", user?.email);

      // Clear local state immediately
      console.log("[LOGOUT] Clearing local state...");
      setUser(null);
      setIssues([]);

      console.log("[LOGOUT] Calling window.api.logout...");
      const result = await window.api.logout();

      console.log("[LOGOUT] Logout IPC returned");
      console.log("[LOGOUT] Result:", JSON.stringify(result, null, 2));

      if (result.success) {
        console.log("[LOGOUT] ✓ Logout successful!");
      }

      toast.success("Logged out successfully");

      // Navigate using Next.js router
      console.log("[LOGOUT] Starting navigation to /auth...");
      console.log("[LOGOUT] Calling router.push('/auth')...");
      await router.push("/auth");
      console.log("[LOGOUT] ✓ router.push completed");
      console.log("[LOGOUT] === LOGOUT FLOW END ===");
    } catch (error) {
      console.error("[LOGOUT] ✗ Logout exception:", error);
      console.error(
        "[LOGOUT] Error details:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      // Clear state and redirect even on error
      setUser(null);
      setIssues([]);
      toast.error("Logged out");
      console.log("[LOGOUT] Attempting navigation after error...");
      router.push("/auth");
      console.log("[LOGOUT] === LOGOUT FLOW END (with error) ===");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400/40 rounded-full animate-spin animate-reverse"
              style={{ animationDuration: "1.5s" }}
            ></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-gray-100">
              Loading SnapFlow
            </h3>
            <p className="text-gray-400 font-medium">
              Preparing your captures...
            </p>
            <div className="flex space-x-1 justify-center mt-4">
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Home - SnapFlow</title>
      </Head>
      <div className="min-h-screen bg-gray-950">
        {/* Titlebar with Window Controls */}
        <div className="glass-strong border-b border-white/5 sticky top-0 z-20 backdrop-blur-xl">
          <div className="flex items-center justify-end h-8 px-4">
            <WindowControls />
          </div>
        </div>

        {/* Header/Navbar */}
        <header className="glass-strong border-b border-white/10 sticky top-8 z-10 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-blue-400">SnapFlow</h1>
              </motion.div>

              <motion.div
                className="flex items-center space-x-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => router.push("/settings")}
                  leftIcon={
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  }
                >
                  Settings
                </Button>
                <div className="flex items-center space-x-3 pl-3 border-l border-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-300">
                      {user?.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="h-8 px-3 text-sm inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 bg-transparent text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Filters and Search */}
          <motion.div
            className="mb-8 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Search and Type Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <FilterBar
                options={[
                  {
                    id: "all",
                    label: "All",
                    count: issues.length,
                    icon: (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    ),
                  },
                  {
                    id: "screenshot",
                    label: "Screenshots",
                    count: issues.filter((i) => i.type === "screenshot").length,
                    icon: (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    ),
                  },
                ]}
                activeFilter={filter}
                onFilterChange={(filterId) => setFilter(filterId as any)}
                variant="pills"
                className="flex-shrink-0"
              />

              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search your snaps..."
                className="w-full lg:w-80"
                variant="glass"
                suggestions={issues.map((issue) => issue.title).slice(0, 5)}
              />
            </div>

            {/* Status Filter and Sorting */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap">
                  Status:
                </span>
                <FilterBar
                  options={[
                    { id: "all", label: "All", count: filteredIssues.length },
                    {
                      id: "local",
                      label: "Local",
                      count: issues.filter((i) => i.syncStatus === "local")
                        .length,
                    },
                    {
                      id: "synced",
                      label: "Synced",
                      count: issues.filter((i) => i.syncStatus === "synced")
                        .length,
                    },
                  ]}
                  activeFilter={statusFilter}
                  onFilterChange={(filterId) =>
                    setStatusFilter(filterId as any)
                  }
                  variant="pills"
                  showCounts={false}
                />
              </div>

              <SortControl
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortByChange={(value) => setSortBy(value as any)}
                onSortOrderChange={setSortOrder}
                options={[
                  { value: "date", label: "Date" },
                  { value: "name", label: "Name" },
                ]}
              />
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <motion.div
                className="flex items-start gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap pt-1.5">
                  Filter by tags:
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map((tag) => {
                      const isSelected = tagsFilter.includes(tag);
                      return (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (isSelected) {
                              setTagsFilter(
                                tagsFilter.filter((t) => t !== tag)
                              );
                            } else {
                              setTagsFilter([...tagsFilter, tag]);
                            }
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all duration-200 ${
                            isSelected
                              ? "bg-blue-600/30 text-blue-300 border-blue-600/50 hover:bg-blue-600/40"
                              : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 border-gray-700/50 hover:border-gray-600/50"
                          }`}
                        >
                          {isSelected && (
                            <span className="inline-block mr-1">✓</span>
                          )}
                          {tag}
                        </motion.button>
                      );
                    })}
                  </div>
                  {tagsFilter.length > 0 && (
                    <button
                      onClick={() => setTagsFilter([])}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2 inline-flex items-center"
                    >
                      <svg
                        className="w-3 h-3 mr-1"
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
                      Clear all tags
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Issues Grid */}
          {filteredIssues.length === 0 ? (
            issues.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <NoSnapsEmptyState />
              </motion.div>
            ) : (
              <NoResultsEmptyState
                onClearFilters={() => {
                  setFilter("all");
                  setStatusFilter("all");
                  setSearchQuery("");
                  setTagsFilter([]);
                }}
              />
            )
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {paginatedIssues.map((issue, index) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  >
                    <Card
                      className="overflow-hidden h-full flex flex-col group hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
                      interactive
                      variant="elevated"
                    >
                      {/* Thumbnail */}
                      <div
                        className="relative h-40 bg-gray-800 overflow-hidden cursor-pointer"
                        onClick={() => openPreview(issue)}
                      >
                        {issue.thumbnailPath ? (
                          <>
                            <LocalImage
                              src={issue.thumbnailPath}
                              alt={issue.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={() => {
                                console.error(
                                  "Failed to load thumbnail:",
                                  issue.thumbnailPath
                                );
                              }}
                            />
                            {/* Preview overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white/10 backdrop-blur-sm rounded-full p-4">
                                  <svg
                                    className="w-8 h-8 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <svg
                                className="w-16 h-16 mx-auto mb-2 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="text-sm text-gray-500">
                                No preview
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Type Badge Overlay */}
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant={
                              issue.type === "screenshot"
                                ? "primary"
                                : "secondary"
                            }
                            className="shadow-lg"
                          >
                            {issue.type === "screenshot"
                              ? "📸 Screenshot"
                              : "🎥 Recording"}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="flex-1 flex flex-col p-4 pt-3">
                        {/* Title */}
                        <h3 className="font-semibold text-base text-gray-100 mb-2 line-clamp-1 leading-snug">
                          {issue.title}
                        </h3>

                        {/* Issue ID */}
                        <div className="mb-3 pb-3 border-b border-gray-800">
                          <span className="font-mono bg-gray-800/50 px-2 py-0.5 rounded text-[10px] text-gray-500">
                            {issue.id}
                          </span>
                        </div>

                        {/* Date and Time */}
                        <div className="mb-3 space-y-1.5">
                          <div className="flex items-center text-xs text-gray-400">
                            <svg
                              className="w-3.5 h-3.5 mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {format(new Date(issue.timestamp), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-gray-400">
                            <svg
                              className="w-3.5 h-3.5 mr-1.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>
                              {format(new Date(issue.timestamp), "h:mm:ss a")}
                            </span>
                          </div>
                        </div>

                        {/* Tags */}
                        {issue.tags && issue.tags.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-1.5">
                              {issue.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-[10px] font-medium border border-blue-600/30"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sync Status and Actions */}
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex-shrink-0">
                            {getGitHubSyncBadge(issue)}
                          </div>

                          <div className="flex items-center space-x-0.5">
                            <GitHubSyncDropdown
                              issue={issue}
                              className="hover:bg-gray-800"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => confirmDelete(issue.id)}
                              title="Delete issue"
                              className="hover:bg-red-500/10 hover:text-red-400"
                            >
                              <svg
                                className="w-4 h-4"
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
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* Enhanced Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
                totalItems={filteredIssues.length}
                startIndex={startIndex}
                endIndex={endIndex}
                className="mt-8"
              />
            </>
          )}
        </main>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Issue</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this issue? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteIssue}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Full Resolution Preview Dialog */}
        <Dialog
          open={previewDialogOpen}
          onOpenChange={(open) => {
            setPreviewDialogOpen(open);
            if (!open) {
              setIsEditingDescription(false);
              setEditedDescription("");
            }
          }}
        >
          <DialogContent
            hideCloseButton
            className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 overflow-hidden bg-gray-950 border-gray-800"
          >
            <DialogVisuallyHidden>
              <DialogTitle>{previewIssue?.title || "Snap Preview"}</DialogTitle>
            </DialogVisuallyHidden>
            {previewIssue && (
              <div className="flex flex-col md:flex-row w-full h-full">
                {/* Main Image Preview */}
                <div className="flex-1 bg-gray-950 overflow-auto p-4 min-h-0">
                  {previewIssue.filePath ? (
                    <LocalImage
                      src={previewIssue.filePath}
                      alt={previewIssue.title}
                      className="w-full h-full"
                      style={{
                        imageRendering: "crisp-edges" as any,
                        objectFit: "contain",
                      }}
                      onError={() => {
                        console.error(
                          "Failed to load full-resolution image:",
                          previewIssue.filePath
                        );
                      }}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <svg
                        className="w-20 h-20 mx-auto mb-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-500">
                        Full resolution image not available
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Sidebar - Details */}
                <div className="w-full md:w-96 bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col h-auto md:h-full max-h-[50vh] md:max-h-full shrink-0">
                  {/* Header with Close Button */}
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-100">
                      Snap Details
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewDialogOpen(false)}
                      className="h-10 w-10 p-0 hover:bg-gray-800"
                    >
                      <svg
                        className="w-6 h-6"
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
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 min-h-0">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Title
                      </label>
                      <p className="text-sm sm:text-base font-medium text-gray-100 break-words">
                        {previewIssue.title}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Description
                        </label>
                        {!isEditingDescription && (
                          <button
                            onClick={startEditingDescription}
                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {previewIssue.description ? "Edit" : "Add"}
                          </button>
                        )}
                      </div>
                      {isEditingDescription ? (
                        <div className="space-y-2">
                          <textarea
                            value={editedDescription}
                            onChange={(e) =>
                              setEditedDescription(e.target.value)
                            }
                            placeholder="Enter description..."
                            rows={4}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg text-xs sm:text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={saveDescription}
                              className="flex-1 text-xs h-8"
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEditingDescription}
                              className="flex-1 text-xs h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : previewIssue.description ? (
                        <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-gray-800/30 rounded-lg px-3 py-2">
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                            {previewIssue.description}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          No description
                        </p>
                      )}
                    </div>

                    {/* ID & Type - Combined for space efficiency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                          Type
                        </label>
                        <Badge
                          variant={
                            previewIssue.type === "screenshot"
                              ? "primary"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {previewIssue.type === "screenshot"
                            ? "Screenshot"
                            : "Recording"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                          GitHub Sync Status
                        </label>
                        {getGitHubSyncBadge(previewIssue)}
                      </div>
                    </div>

                    {/* Date & Time - Compact */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Created At
                      </label>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs sm:text-sm text-gray-300">
                          <svg
                            className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="truncate">
                            {format(
                              new Date(previewIssue.timestamp),
                              "MMM d, yyyy"
                            )}
                          </span>
                          <span className="mx-2 text-gray-600">•</span>
                          <svg
                            className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="truncate">
                            {format(new Date(previewIssue.timestamp), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Tags
                      </label>
                      <ChipsInput
                        value={previewIssue.tags || []}
                        onChange={(tags) =>
                          handleUpdateTags(previewIssue.id, tags)
                        }
                        placeholder="Add tags..."
                      />
                    </div>

                    {/* ID */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                        ID
                      </label>
                      <p className="text-xs text-gray-300 font-mono bg-gray-800/50 px-2.5 py-1.5 rounded-lg break-all">
                        {previewIssue.id}
                      </p>
                    </div>

                    {/* Shareable URL - Only show if synced to cloud */}
                    {previewIssue.cloudFileUrl && (
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                          Shareable Link
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={previewIssue.cloudFileUrl}
                            className="flex-1 text-xs text-gray-300 font-mono bg-gray-800/50 px-2.5 py-1.5 rounded-lg border border-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                previewIssue.cloudFileUrl!
                              );
                              toast.success("Link copied to clipboard!");
                            }}
                            title="Copy to clipboard"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => {
                              window.open(previewIssue.cloudFileUrl, "_blank");
                            }}
                            title="Open in browser"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5">
                          Anyone with this link can view this screenshot
                        </p>
                      </div>
                    )}

                    {/* File Path - Collapsible on mobile */}
                    <details className="group">
                      <summary className="text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between">
                        <span>File Location</span>
                        <svg
                          className="w-4 h-4 transition-transform group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <p className="text-xs text-gray-400 font-mono bg-gray-800/30 px-2.5 py-1.5 rounded-lg break-all mt-1.5">
                        {previewIssue.filePath}
                      </p>
                    </details>
                  </div>

                  {/* Action Buttons - Footer */}
                  <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-gray-800 flex-shrink-0">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      <div className="flex-1">
                        <GitHubSyncDropdown
                          issue={previewIssue}
                          className="w-full justify-center text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
                        />
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setPreviewDialogOpen(false);
                          confirmDelete(previewIssue.id);
                        }}
                        className="w-full text-xs h-9"
                      >
                        <svg
                          className="w-3.5 h-3.5 mr-1.5"
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
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
