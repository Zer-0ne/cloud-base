"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import ModalDrawer from "./responsive-modal"
import useFetch from "@/hooks/useFetch"
import { getData } from "@/utils/fetch-from-api"
import useSession from "@/hooks/useSession"
import { useEffect } from "react"
import { Request } from "./admin/requests-component"

interface RequestStatusModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    isDesktop: boolean
}

// Mock data for user requests
const mockRequests = [
    {
        id: "req-001",
        type: "Admin Access",
        status: "pending",
        submittedDate: "2023-11-15",
        description: "Request for admin privileges",
    },
    {
        id: "req-002",
        type: "Storage Increase",
        status: "approved",
        submittedDate: "2023-11-10",
        description: "Request for additional 50GB storage",
    },
    {
        id: "req-003",
        type: "API Key",
        status: "rejected",
        submittedDate: "2023-11-05",
        description: "Request for new API key with extended permissions",
    },
    {
        id: "req-004",
        type: "Admin Access",
        status: "pending",
        submittedDate: "2023-11-01",
        description: "Request for admin access via OTP",
    },
]

export function RequestStatusModal({ isOpen, onOpenChange, isDesktop }: RequestStatusModalProps) {
    const { session } = useSession()
    const { data: requests, refetch, } = useFetch<Request[]>(() =>
        getData(`api/admin/request/user/${session?.username}`, undefined)
    )
    useEffect(() => {
        if (session) {
            refetch()
        }
    }, [session, isOpen])
    // if (loading) return <div>Loading...</div>
    return (
        <ModalDrawer
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            title="My Request Status"
            isDesktop={isDesktop}
            footer={
                <div className="flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            }
        >
            <div className="py-4">
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests?.reverse()?.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.type}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                request.status === "approved"
                                                    ? "default"
                                                    : request.status === "rejected"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {request.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{request.createdAt.replace('T', ' ').split('.')[0]}</TableCell>
                                    {/* <TableCell>{request.submittedDate}</TableCell> */}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>

                {mockRequests.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                        You have no active requests
                    </div>
                ) : null}

                <div className="mt-4 text-sm text-muted-foreground">
                    <p>
                        Pending requests are typically processed within 24-48 hours. You will be notified via email once your request has been reviewed.
                    </p>
                </div>
            </div>
        </ModalDrawer>
    )
}
