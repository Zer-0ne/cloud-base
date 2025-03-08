import { Activity } from 'lucide-react'

const activities = [
  { id: 1, action: "File uploaded", timestamp: "2 minutes ago" },
  { id: 2, action: "API key created", timestamp: "1 hour ago" },
  { id: 3, action: "Storage limit increased", timestamp: "3 hours ago" },
  { id: 4, action: "New folder created", timestamp: "Yesterday" },
]

export function RecentActivity() {
  return (
    <div className="space-y-8">
      {activities?.map((activity) => (
        <div key={activity.id} className="flex">
          <div className="relative mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Activity className="h-4 w-4" />
            <span className="absolute right-0 top-0 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
            </span>
          </div>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{activity.action}</p>
            <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

