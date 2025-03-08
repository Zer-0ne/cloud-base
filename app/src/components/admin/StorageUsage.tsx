// components/admin/StorageUsage.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/utils/Algo"

interface StorageUsageProps {
  title: string
  description: string
  used: number
  total: number
  formatInBytes?: boolean
}

export const StorageUsage = ({ title, description, used, total, formatInBytes = true }: StorageUsageProps) => {
  const percentage = total > 0 ? ((used / total) * 100) : 0
  const formattedUsed = formatInBytes ? formatBytes(used) : `${used.toFixed(2)} GB`
  const formattedTotal = formatInBytes ? formatBytes(total) : `${total} GB`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Progress value={percentage} />
          <div className="text-sm text-muted-foreground">
            {formattedUsed} used of {formattedTotal}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}