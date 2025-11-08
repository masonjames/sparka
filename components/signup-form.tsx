"use client";

import Link from "next/link";
import { EmailAuthForm } from "@/components/email-auth-form";
import { SocialAuthProviders } from "@/components/social-auth-providers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <div className="flex flex-col gap-6" {...props}>
      <Card {...props}>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Create an account</CardTitle>
          <CardDescription>Get started with your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <EmailAuthForm mode="register" />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Or continue with
                </span>
              </div>
            </div>
            <SocialAuthProviders />
            <div className="text-center text-sm">
              Already have an account?{" "}
              <a className="underline underline-offset-4" href="/login">
                Sign in
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-muted-foreground text-xs [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By clicking continue, you agree to our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </div>
    </div>
  );
}
