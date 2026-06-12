"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--border-radius": "0px",
          "--normal-bg":      "var(--brand-panel)",
          "--normal-text":    "var(--brand-ink)",
          "--normal-border":  "var(--brand-ink)",
          "--success-bg":     "var(--brand-green)",
          "--success-text":   "var(--brand-green-ink)",
          "--success-border": "var(--brand-ink)",
          "--error-bg":       "var(--brand-coral)",
          "--error-text":     "var(--brand-panel)",
          "--error-border":   "var(--brand-ink)",
          "--info-bg":        "var(--brand-yellow)",
          "--info-text":      "var(--brand-ink)",
          "--info-border":    "var(--brand-ink)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
