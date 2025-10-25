import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../ui/Button";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export const AccountSection: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const result = await window.api.getUser();
      if (result.success && result.data) {
        setUser(result.data);
        setFormData({
          name: result.data.name,
          email: result.data.email,
        });
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      toast.error("Failed to load user information");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await window.api.updateUser(user.id, {
        name: formData.name,
        email: formData.email,
      });

      if (result.success) {
        setUser(result.data);
        setEditing(false);
        toast.success("Account updated successfully");
      } else {
        toast.error(result.error || "Failed to update account");
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Failed to load account information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-100">
            Profile Information
          </h3>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              }
            >
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Name
            </label>
            {editing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                placeholder="Enter your name"
              />
            ) : (
              <p className="text-base text-gray-100">{user.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email
            </label>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                placeholder="Enter your email"
              />
            ) : (
              <p className="text-base text-gray-100">{user.email}</p>
            )}
          </div>

          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              User ID
            </label>
            <p className="text-sm text-gray-500 font-mono bg-gray-800/50 px-3 py-2 rounded-lg break-all">
              {user.id}
            </p>
          </div>

          {/* Account Created */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Account Created
            </label>
            <p className="text-base text-gray-100">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {editing && (
          <div className="flex items-center space-x-3 mt-6 pt-6 border-t border-gray-800">
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={saving}
              disabled={!formData.name || !formData.email}
            >
              Save Changes
            </Button>
            <Button variant="ghost" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
