"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import authClient from "@/lib/auth-client";
import { toast } from "sonner";

export function EmailAuthForm({ mode = "login" }: { mode?: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0], // Default to email username if no name provided
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
      // Note: Magic link requires email provider to be configured
      // For now, we'll show a message that it's not available yet
      toast.info("Magic link authentication will be available once email provider is configured.");
      setMagicLinkSent(true);
      
      // Uncomment when email provider is set up:
      // await authClient.signIn.magicLink({ email });
      // setMagicLinkSent(true);
      // toast.success("Check your email for the magic link!");
    } catch (error) {
      toast.error("Failed to send magic link");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
      </TabsList>
      
      <TabsContent value="password">
        <form onSubmit={handlePasswordAuth} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
            {mode === "register" && (
              <p className="text-muted-foreground text-xs">
                Must be at least 8 characters
              </p>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
          </Button>
        </form>
      </TabsContent>
      
      <TabsContent value="magic-link">
        <form onSubmit={handleMagicLink} className="space-y-4">
          {magicLinkSent ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">
                Check your email for the magic link!
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setMagicLinkSent(false)}
              >
                Send another link
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-muted-foreground text-xs">
                  We&apos;ll send you a secure link to sign in
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send magic link"}
              </Button>
            </>
          )}
        </form>
      </TabsContent>
    </Tabs>
  );
}
