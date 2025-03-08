import { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { FileExplorer } from "@/components/file-explorer"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
    title: "Files",
    description: "Manage your files and folders",
}

export default function FilesPage() {
    return (
        <>
            <DashboardHeader />
            <DashboardShell>
                <Card >
                    <CardHeader>
                        <CardTitle>File Explorer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FileExplorer />
                    </CardContent>
                </Card>
            </DashboardShell>
        </>
    )
}