"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import useFetch from "@/hooks/useFetch"
import { getData } from "@/utils/fetch-from-api"
// import { fetchTableData } from "@/app/actions/database"

interface TableProps {
    tableName: string
    columns: string[]
}

interface TableResponse {
    serializedData: any[]
    totalPages: number
}

export interface TableConfig {
    columns: string[]
}

function DataTable({ tableName, columns }: TableProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const { data, refetch } = useFetch<TableResponse>(() =>
        getData<TableResponse>(`api/database/${tableName}?page=${currentPage}&search=${encodeURIComponent(searchTerm)}`),
    )

    useEffect(() => {
        setTotalPages(data?.totalPages!)
    }, [data])

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                refetch()
                setTotalPages(data?.totalPages!);
            } catch (err) {
                setError("Failed to fetch data");
                console.error("Error fetching data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchData, 300);
        return () => clearTimeout(debounceTimer);
    }, [tableName, currentPage, searchTerm]);

    if (error) {
        return (
            <div className="text-center p-4 text-red-500">
                {error}
                <Button variant="outline" onClick={() => setCurrentPage(1)} className="ml-2">
                    Retry
                </Button>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center p-4 text-red-500">
                {error}
                <Button variant="outline" onClick={() => setCurrentPage(1)} className="ml-2">
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                    }}
                    className="max-w-sm"
                />
            </div>

            <ScrollArea className="h-[600px] border rounded-md">
                <div className="min-w-[800px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHead key={column} className="min-w-[150px] whitespace-nowrap">
                                        {column}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : data?.serializedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        No results found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.serializedData.map((item, index) => (
                                    <TableRow key={index}>
                                        {columns.map((column) => (
                                            <TableCell key={column}>
                                                {typeof item[column] === "boolean"
                                                    ? item[column]
                                                        ? "Yes"
                                                        : "No"
                                                    : item[column]?.toString() || "-"}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Add both vertical and horizontal scrollbars */}
                <ScrollBar orientation="vertical" />
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || isLoading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

const tableConfigs = {
    users: {
        columns: ["id", "username", "email", "role", "max_allocated_space", "hasApiAccess", "canMakeMultipleApis"],
    },
    posts: {
        columns: ["id", "name", "mimeType", "size", "userId"],
    },
    drives: {
        columns: ["id", "serviceId", "limit", "usage", "alloted"],
    },
    apiKeys: {
        columns: ["id", "accessKey", "userId", "limit", "totalUsage"],
    },
    userAnalytics: {
        columns: ["userId", "totalStorageUsed", "totalApiUsage", "totalFilesUploaded", "userType"],
    },
}

export function DatabaseTables() {
    return (
        <Tabs defaultValue="users" className="w-full">
            <TabsList className="grid w-full h-auto lg:grid-cols-5 grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="drives">Drives</TabsTrigger>
                <TabsTrigger value="apiKeys">API Keys</TabsTrigger>
                <TabsTrigger value="userAnalytics">Analytics</TabsTrigger>
            </TabsList>

            {Object.entries(tableConfigs).map(([tableName, config]) => (
                <TabsContent key={tableName} value={tableName}>
                    <DataTable tableName={tableName} columns={config.columns} />
                </TabsContent>
            ))}
        </Tabs>
    )
}

