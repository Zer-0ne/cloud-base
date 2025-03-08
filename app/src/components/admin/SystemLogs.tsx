// components/admin/SystemLogs.tsx
import { useEffect, useRef, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Log {
    id: number
    timestamp: string
    message: string
    type: string
}

interface SystemLogsProps {
    logs: Log[]
}

export const SystemLogs = ({ logs }: SystemLogsProps) => {
    const [visibleLogs, setVisibleLogs] = useState<Log[]>(logs?.slice(0, 50))
    const loadMoreRef = useRef<HTMLTableRowElement | null>(null)

    useEffect(() => {
        if (!loadMoreRef.current) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && visibleLogs.length < logs.length) {
                    setVisibleLogs((prev) => [
                        ...prev,
                        ...logs.slice(prev.length, prev.length + 50),
                    ])
                }
            }
        )

        observer.observe(loadMoreRef.current)
        return () => observer.disconnect()
    }, [visibleLogs, logs])

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Monitor system activities in real-time</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Message</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleLogs?.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell
                                        style={{
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            color: log.type === "error" ? "red" : log.type === "warn" ? "yellow" : undefined,
                                        }}
                                    >
                                        {log.timestamp}
                                    </TableCell>
                                    <TableCell
                                        className="relative whitespace-normal break-words"
                                        style={{
                                            color: log.type === "error" ? "red" : log.type === "warn" ? "yellow" : undefined,
                                        }}
                                    >
                                        <div className="group relative w-full">
                                            {log.message.replace(log.type, '')}
                                            <div className="absolute z-[1] transform -translate-x-1/2 -top-full mb-2 hidden w-max max-w-xs p-2 bg-black text-white text-sm rounded shadow-lg group-hover:block">
                                                {log.message.replace(log.type, '')}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow ref={loadMoreRef}>
                                <TableCell colSpan={2} style={{ textAlign: "center", fontStyle: "italic" }}>
                                    Loading more logs...
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}