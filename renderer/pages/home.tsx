import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ChipsInput } from "../components/ui/ChipsInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogVisuallyHidden,
} from "../components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import { useStore } from "../store/useStore";
import { LocalImage } from "../components/LocalImage";
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
      const userResult = await window.api.getUser();
      if (userResult.success && userResult.data) {
        setUser(userResult.data);
        const issuesResult = await window.api.listIssues(userResult.data.id);
        if (issuesResult.success) {
          setIssues(issuesResult.data || []);
        }
      } else {
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

  const handleSync = async (issue: Issue, platform: "github" | "zoho") => {
    try {
      // Optimistic update
      updateIssue(issue.id, { syncStatus: "syncing" });
      toast.loading(`Syncing to ${platform}...`, { id: `sync-${issue.id}` });

      const result = await window.api.syncIssue(issue.id, platform);

      if (result.success) {
        toast.success(`Successfully synced to ${platform}`, {
          id: `sync-${issue.id}`,
        });
        loadData(); // Reload to get updated sync status
      } else {
        toast.error(`Sync failed: ${result.error}`, { id: `sync-${issue.id}` });
        updateIssue(issue.id, { syncStatus: "failed" });
      }
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error("An error occurred while updating tags");
    }
  };

  const handleUpdateDescription = async (issueId: string, description: string) => {
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
    } catch (error) {
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
      return matchesFilter && matchesStatusFilter && matchesSearch && matchesTagsFilter;
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

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return <Badge variant="success">Synced</Badge>;
      case "syncing":
        return <Badge variant="warning">Syncing...</Badge>;
      case "failed":
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="gray">Local</Badge>;
    }
  };

  const handleLogout = async () => {
    try {
      await window.api.logout();
      setUser(null);
      setIssues([]);
      router.push("/auth");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="animate-spin h-12 w-12 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-400 font-medium">Loading your captures...</p>
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
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 backdrop-blur-sm bg-gray-900/95">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
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
                <h1 className="text-2xl font-bold text-gray-100">SnapFlow</h1>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/settings")}
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  Settings
                </Button>
                <div className="flex items-center space-x-3 pl-3 border-l border-gray-800">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {user?.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    title="Logout"
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
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and Search */}
          <div className="mb-8 space-y-4">
            {/* Type Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex space-x-2">
                <Button
                  variant={filter === "all" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                  <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {issues.length}
                  </span>
                </Button>
                <Button
                  variant={filter === "screenshot" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setFilter("screenshot")}
                >
                  Screenshots
                  <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {issues.filter((i) => i.type === "screenshot").length}
                  </span>
                </Button>
              </div>

              <Input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-80"
              />
            </div>

            {/* Status Filter and Sorting */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap">
                  Status:
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant={statusFilter === "all" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "local" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("local")}
                  >
                    Local
                  </Button>
                  <Button
                    variant={statusFilter === "synced" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("synced")}
                  >
                    Synced
                  </Button>
                </div>
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap">
                  Sort by:
                </span>
                <Select value={sortBy} onValueChange={(value: "date" | "name") => setSortBy(value)}>
                  <SelectTrigger className="w-[130px] bg-gray-900 border-gray-800 text-gray-300 focus:ring-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-gray-300">
                    <SelectItem value="date" className="focus:bg-gray-800 focus:text-gray-100">Date</SelectItem>
                    <SelectItem value="name" className="focus:bg-gray-800 focus:text-gray-100">Name</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                  className="px-3"
                >
                  {sortOrder === "asc" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </Button>
              </div>
            </div>

            {/* Tags Filter */}
            {allTags.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-400 font-medium whitespace-nowrap pt-2">
                  Tags:
                </span>
                <div className="flex-1">
                  <ChipsInput
                    value={tagsFilter}
                    onChange={setTagsFilter}
                    placeholder="Filter by tags..."
                  />
                  {allTags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-500">Quick select:</span>
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (!tagsFilter.includes(tag)) {
                              setTagsFilter([...tagsFilter, tag]);
                            }
                          }}
                          className="text-xs px-2 py-0.5 bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-gray-300 rounded border border-gray-700 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Issues Grid */}
          {filteredIssues.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-100 mb-2">
                No snaps yet
              </h3>
              <p className="text-gray-500 mb-6">
                Use the system tray menu to capture your screen
              </p>
            </motion.div>
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
                  <Card className="overflow-hidden h-full flex flex-col group hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 bg-gray-900 border-gray-800">
                    {/* Thumbnail */}
                    <div
                      className="relative h-40 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden cursor-pointer"
                      onClick={() => openPreview(issue)}
                    >
                      {issue.thumbnailPath ? (
                        <>
                          <LocalImage
                            src={issue.thumbnailPath}
                            alt={issue.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => {
                              console.error('Failed to load thumbnail:', issue.thumbnailPath);
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
                            <p className="text-sm text-gray-500">No preview</p>
                          </div>
                        </div>
                      )}

                      {/* Type Badge Overlay */}
                      <div className="absolute top-3 right-3">
                        <Badge
                          variant={issue.type === "screenshot" ? "primary" : "secondary"}
                          className="shadow-lg"
                        >
                          {issue.type === "screenshot" ? "📸 Screenshot" : "🎥 Recording"}
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
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{format(new Date(issue.timestamp), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{format(new Date(issue.timestamp), "h:mm:ss a")}</span>
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
                          {getSyncStatusBadge(issue.syncStatus)}
                        </div>

                        <div className="flex items-center space-x-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(issue, "github")}
                            disabled={issue.syncStatus === "syncing"}
                            title="Sync to GitHub"
                            className="hover:bg-gray-800"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(issue, "zoho")}
                            disabled={issue.syncStatus === "syncing"}
                            title="Sync to Zoho"
                            className="hover:bg-gray-800"
                          >
                            <span className="text-xs font-bold">ZH</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(issue.id)}
                            title="Delete issue"
                            className="hover:bg-red-500/10 hover:text-red-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-4">
                {/* Page Info & Items Per Page */}
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredIssues.length)} of {filteredIssues.length} snaps
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Per page:</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px] bg-gray-900 border-gray-800 text-gray-300 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800 text-gray-300">
                        <SelectItem value="6" className="focus:bg-gray-800 focus:text-gray-100">6</SelectItem>
                        <SelectItem value="12" className="focus:bg-gray-800 focus:text-gray-100">12</SelectItem>
                        <SelectItem value="24" className="focus:bg-gray-800 focus:text-gray-100">24</SelectItem>
                        <SelectItem value="48" className="focus:bg-gray-800 focus:text-gray-100">48</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="First page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
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
          <DialogContent hideCloseButton className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 overflow-hidden bg-gray-950 border-gray-800">
            <DialogVisuallyHidden>
              <DialogTitle>{previewIssue?.title || 'Snap Preview'}</DialogTitle>
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
                        imageRendering: 'crisp-edges' as any,
                        objectFit: 'contain',
                      }}
                      onError={() => {
                        console.error('Failed to load full-resolution image:', previewIssue.filePath);
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
                      <p className="text-gray-500">Full resolution image not available</p>
                    </div>
                  )}
                </div>

                {/* Right Sidebar - Details */}
                <div className="w-full md:w-96 bg-gray-900 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col h-auto md:h-full max-h-[50vh] md:max-h-full shrink-0">
                  {/* Header with Close Button */}
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-100">Snap Details</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewDialogOpen(false)}
                      className="h-10 w-10 p-0 hover:bg-gray-800"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                            onChange={(e) => setEditedDescription(e.target.value)}
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
                        <p className="text-xs text-gray-500 italic">No description</p>
                      )}
                    </div>

                    {/* ID & Type - Combined for space efficiency */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                          Type
                        </label>
                        <Badge
                          variant={previewIssue.type === "screenshot" ? "primary" : "secondary"}
                          className="text-xs"
                        >
                          {previewIssue.type === "screenshot" ? "Screenshot" : "Recording"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                          Sync Status
                        </label>
                        {getSyncStatusBadge(previewIssue.syncStatus)}
                      </div>
                    </div>

                    {/* Date & Time - Compact */}
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                        Created At
                      </label>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs sm:text-sm text-gray-300">
                          <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{format(new Date(previewIssue.timestamp), "MMM d, yyyy")}</span>
                          <span className="mx-2 text-gray-600">•</span>
                          <svg className="w-3.5 h-3.5 mr-1.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="truncate">{format(new Date(previewIssue.timestamp), "h:mm a")}</span>
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
                        onChange={(tags) => handleUpdateTags(previewIssue.id, tags)}
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

                    {/* File Path - Collapsible on mobile */}
                    <details className="group">
                      <summary className="text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between">
                        <span>File Location</span>
                        <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSync(previewIssue, "github")}
                        disabled={previewIssue.syncStatus === "syncing"}
                        className="flex-1 min-w-[120px] text-xs h-9"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleSync(previewIssue, "zoho")}
                        disabled={previewIssue.syncStatus === "syncing"}
                        className="flex-1 min-w-[120px] text-xs h-9"
                      >
                        <span className="text-xs font-bold mr-1.5">ZH</span>
                        Zoho
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setPreviewDialogOpen(false);
                          confirmDelete(previewIssue.id);
                        }}
                        className="w-full text-xs h-9"
                      >
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
