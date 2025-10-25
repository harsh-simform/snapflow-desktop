import React, { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { WindowControls } from "../components/ui/WindowControls";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        console.log("[AUTH] === LOGIN FLOW START ===");
        console.log("[AUTH] Email:", formData.email);
        console.log("[AUTH] Calling window.api.loginUser...");

        const result = await window.api.loginUser(
          formData.email,
          formData.password
        );

        console.log("[AUTH] Login IPC returned");
        console.log("[AUTH] Result:", JSON.stringify(result, null, 2));

        if (result.success) {
          console.log("[AUTH] ✓ Login successful!");
          console.log("[AUTH] User data:", result.data);
          console.log("[AUTH] Starting navigation to /home...");

          // Navigate using Next.js router
          try {
            console.log("[AUTH] Calling router.push('/home')...");
            const pushResult = await router.push("/home");
            console.log("[AUTH] ✓ router.push completed");
            console.log("[AUTH] Push result:", pushResult);
          } catch (navError) {
            console.error("[AUTH] ✗ Navigation error:", navError);
            console.log("[AUTH] Falling back to window.location.href");
            window.location.href = "/home";
          }
          console.log("[AUTH] === LOGIN FLOW END ===");
          return; // Exit early, don't clear loading
        } else {
          console.error("[AUTH] ✗ Login failed:", result.error);
          setError(result.error || "Login failed");
          setLoading(false);
        }
      } else {
        // Signup
        console.log("[AUTH] === SIGNUP FLOW START ===");

        if (formData.password !== formData.confirmPassword) {
          console.log("[AUTH] ✗ Passwords do not match");
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        console.log("[AUTH] Name:", formData.name);
        console.log("[AUTH] Email:", formData.email);
        console.log("[AUTH] Calling window.api.createUser...");

        const result = await window.api.createUser(
          formData.name,
          formData.email,
          formData.password
        );

        console.log("[AUTH] Signup IPC returned");
        console.log("[AUTH] Result:", JSON.stringify(result, null, 2));

        if (result.success) {
          console.log("[AUTH] ✓ Signup successful!");
          console.log("[AUTH] User data:", result.data);
          console.log("[AUTH] Starting navigation to /home...");

          // User is automatically logged in after signup, redirect to home
          try {
            console.log("[AUTH] Calling router.push('/home')...");
            const pushResult = await router.push("/home");
            console.log("[AUTH] ✓ router.push completed");
            console.log("[AUTH] Push result:", pushResult);
          } catch (navError) {
            console.error("[AUTH] ✗ Navigation error:", navError);
            console.log("[AUTH] Falling back to window.location.href");
            window.location.href = "/home";
          }
          console.log("[AUTH] === SIGNUP FLOW END ===");
          return; // Exit early, keep loading state during redirect
        } else {
          console.error("[AUTH] ✗ Signup failed:", result.error);
          setError(result.error || "Signup failed");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("[AUTH] ✗ Unexpected error:", err);
      console.error(
        "[AUTH] Error details:",
        JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
      );
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{isLogin ? "Login" : "Sign Up"} - SnapFlow</title>
      </Head>
      <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
        {/* Titlebar with Window Controls - Draggable */}
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

        {/* Auth Content */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-800">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-100 mb-2">
                SnapFlow
              </h1>
              <p className="text-gray-400 text-sm">
                {isLogin
                  ? "Welcome back! Please login to continue."
                  : "Create your account to get started."}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-start">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm flex items-start">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required={!isLogin}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-600"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-600"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-600"
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required={!isLogin}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-600"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all duration-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Please wait...
                  </span>
                ) : isLogin ? (
                  "Login"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                  setFormData({
                    name: "",
                    email: "",
                    password: "",
                    confirmPassword: "",
                  });
                }}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-200"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
