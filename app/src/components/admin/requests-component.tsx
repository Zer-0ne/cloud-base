import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StateBtn } from "../state-btn";
import { createData, getData } from "@/utils/fetch-from-api";
import useFetch from "@/hooks/useFetch";
import useApiRequest from "@/hooks/useApiRequest";

export type Request = {
    id: string;
    userId: string;
    type: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
};

const initialRequests = [
    {
        id: "8cd8cc7f-52c5-4883-9e2c-04a04df7ed56",
        userId: "100877281662383247377",
        type: "admin_request",
        status: "pending",
        createdAt: "2025-03-03T08:25:51.640Z",
    },
    {
        id: "194c9001-490e-45ea-b612-0ed914fe5061",
        userId: "100877281662383247377",
        type: "admin_request",
        status: "pending",
        createdAt: "2025-03-03T08:27:04.540Z",
    },
    {
        id: "1cd4ea6e-055a-46b3-bce7-169ad96c6b09",
        userId: "100877281662383247377",
        type: "admin_request",
        status: "pending",
        createdAt: "2025-03-03T08:29:24.271Z",
    },
    {
        id: "f829b8ac-7ba8-4981-8c26-d4f6d721e924",
        userId: "100877281662383247377",
        type: "admin_request",
        status: "pending",
        createdAt: "2025-03-03T08:34:00.851Z",
    },
];

export function RequestsComponent() {
    // const [requests, setRequests] = useState<Request[]>([]);

    const { data: requests, refetch, loading } = useFetch<Request[]>(() =>
        getData("api/admin/request/", undefined)
    )

    const { execute: handleAction, data: actionData } = useApiRequest((data: {
        status: string,
        id: string
        type: string
    } | undefined) => data ? createData(`api/admin/request/${data?.id}`, {
        status: data?.status,
        type: data?.type
    }) : Promise.resolve(null))

    useEffect(() => {
        // if (actionData) {
        refetch()
        // }
    }, [actionData])



    if (loading) {
        return <div>Loading...</div>
    }


    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Pending Requests</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests?.reverse()?.map((request) => (
                        <TableRow key={request.id}>
                            <TableCell>{request.userId}</TableCell>
                            <TableCell>{request.type}</TableCell>
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
                            <TableCell>{request.createdAt}</TableCell>
                            <TableCell>
                                {request.status === "pending" && (
                                    <StateBtn onClick={(selectedStatus: any) =>
                                        handleAction({ id: request.id, status: selectedStatus.value, type: request.type })
                                    } />
                                    // <StateBtn />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
