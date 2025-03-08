"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { getData } from "@/utils/fetch-from-api"
import { Token, userAlloctedSpace, Drive } from "@/utils/Interfaces"
import { formatBytes } from "@/utils/Algo"
import useFetch from "@/hooks/useFetch"
import ModalDrawer from "./responsive-modal"

export function DriveUsage() {
    const { data: tokens } = useFetch(() =>
        getData<Token[]>(`api/user/api-keys`, undefined)
    )
    const { data, refetch, loading } = useFetch(() =>
        getData<userAlloctedSpace>(`api/user/storage`, tokens?.map((key) => key.token).join(" "))
    )

    useEffect(() => {
        if (tokens) {
            refetch()
        }
    }, [tokens])

    // Overall usage values (fallback if not loaded)
    const usedSpace = data ? parseFloat(data.usage) : 0
    const totalSpace = data ? parseFloat(data.limit) : 0
    const freeSpace = totalSpace - usedSpace
    const usagePercentage = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0

    // State for selected drive to show details
    const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null)
    const [showDriveDialog, setShowDriveDialog] = useState(false)

    // State to determine if it's desktop or mobile
    const [isDesktop, setIsDesktop] = useState(true)
    useEffect(() => {
        const checkIsDesktop = () => {
            setIsDesktop(window.innerWidth >= 768) // md breakpoint
        }
        checkIsDesktop()
        window.addEventListener("resize", checkIsDesktop)
        return () => window.removeEventListener("resize", checkIsDesktop)
    }, [])

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Drive Usage</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                    <div className="space-y-6">
                        {/* Overall Drive Usage */}
                        <div className="space-y-2">
                            <Progress value={usagePercentage} className="w-full" />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{formatBytes(Number(usedSpace.toFixed(2)))} used</span>
                                <span>{formatBytes(Number(freeSpace.toFixed(2)))} free</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {usagePercentage.toFixed(1)}% of {formatBytes(Number(totalSpace.toFixed(2)))} used
                            </p>
                        </div>
                        {/* List of Drives (only drive IDs) */}
                        <div>
                            <h3 className="text-md font-medium mb-2">Drives</h3>
                            <div className="grid overflow-y-auto max-h-[120px] grid-cols-1 gap-2">
                                {data?.drives.map((drive) => (
                                    <div
                                        key={drive.id}
                                        className="cursor-pointer p-2 rounded border hover:bg-gray-100 hover:text-black transition-colors"
                                        onClick={() => {
                                            setSelectedDrive(drive)
                                            setShowDriveDialog(true)
                                        }}
                                    >
                                        {drive.driveId.split(".")[0]}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            {/* Drive Details ModalDrawer */}
            {selectedDrive && (
                <ModalDrawer
                    isOpen={showDriveDialog}
                    onOpenChange={(open) => {
                        setShowDriveDialog(open)
                        if (!open) setSelectedDrive(null)
                    }}
                    isDesktop={isDesktop}
                    title={selectedDrive.driveId.split(".")[0].split('@')[0]}
                    children={
                        <div className="space-y-2">
                            <p>
                                <strong>Allocated:</strong> {formatBytes(Number(selectedDrive.allocatedSpace))}
                            </p>
                            <p>
                                <strong>Used:</strong> {formatBytes(Number(selectedDrive.usage))}
                            </p>
                            {Number(selectedDrive.allocatedSpace) > 0 && (
                                <>
                                    <Progress
                                        value={
                                            (Number(selectedDrive.usage) / Number(selectedDrive.allocatedSpace)) * 100
                                        }
                                        className="w-full"
                                    />
                                    <p className="text-xs text-right text-muted-foreground">
                                        {(
                                            (Number(selectedDrive.usage) / Number(selectedDrive.allocatedSpace)) * 100
                                        ).toFixed(0)}
                                        % used
                                    </p>
                                </>
                            )}
                        </div>
                    }
                    footer={null} // No footer content needed as per original
                />
            )}
        </Card>
    )
}