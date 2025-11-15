"use client"

import * as React from "react"
import Link from "next/link"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type ActionCardProps = React.ComponentProps<typeof Card>

function ActionCard({ className, ...props }: ActionCardProps) {
  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all duration-200 hover:border-primary/20 hover:shadow-lg",
        className
      )}
      {...props}
    />
  )
}

type ActionCardLinkProps = React.ComponentProps<typeof Link>

function ActionCardLink({ className, tabIndex, ...props }: ActionCardLinkProps) {
  return (
    <Link
      className={cn("absolute inset-0 z-10", className)}
      tabIndex={tabIndex ?? -1}
      {...props}
    />
  )
}

type ActionCardTopProps = React.ComponentProps<"div">

function ActionCardTop({ className, ...props }: ActionCardTopProps) {
  return <div className={cn("z-20", className)} {...props} />
}

export { ActionCard, ActionCardLink, ActionCardTop }


