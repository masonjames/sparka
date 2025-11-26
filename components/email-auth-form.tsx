"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import authClient from "@/lib/auth-client";

export function EmailAuthForm({
  mode = "login",
}: {
  mode?: "login" | "register";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  let submitText = "Sign in";
  if (loading) {
    submitText = "Please wait...";
  } else if (mode === "register") {
    submitText = "Create account";
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0], // Default to email username if no name provided
        });

        if (result.error) {
          toast.error(result.error.message || "Registration failed");
        } else {
          toast.success("Account created! Redirecting...");
          window.location.href = "/";
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          toast.error(result.error.message || "Login failed");
        } else {
          toast.success("Login successful!");
          window.location.href = "/";
        }
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMagicLinkSent(true);
        toast.success(data.message || "Check your email for the magic link!");
      } else {
        toast.error(data.error || "Failed to send magic link");
      }
    } catch (error) {
      toast.error("Failed to send magic link. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs className="w-full" defaultValue="password">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <form className="space-y-4" onSubmit={handlePasswordAuth}>
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                disabled={loading}
                id="name"
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                value={name}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              disabled={loading}
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              disabled={loading}
              id="password"
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
            {mode === "register" && (
              <p className="text-muted-foreground text-xs">
                Must be at least 8 characters
              </p>
            )}
          </div>

          <Button className="w-full" disabled={loading} type="submit">
            {submitText}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="magic-link">
        <form className="space-y-4" onSubmit={handleMagicLink}>
          {magicLinkSent ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">
                Check your email for the magic link!
              </p>
              <Button
                className="w-full"
                onClick={() => setMagicLinkSent(false)}
                type="button"
                variant="outline"
              >
                Send another link
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  disabled={loading}
                  id="magic-email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
                <p className="text-muted-foreground text-xs">
                  We&apos;ll send you a secure link to sign in
                </p>
              </div>

              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "Sending..." : "Send magic link"}
              </Button>
            </>
          )}
        </form>
      </TabsContent>
    </Tabs>
  );
}
