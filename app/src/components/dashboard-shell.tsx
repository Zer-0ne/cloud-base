'use client'
import { cn } from "@/lib/utils"

interface DashboardShellProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardShell({
  children,
  className,
  ...props
}: DashboardShellProps) {
  return (
    <div className={cn("container space-y-6 max-w-[1200px] mx-auto pb-16 pt-6", className)} {...props}>
      {children}
    </div>
  )
}

