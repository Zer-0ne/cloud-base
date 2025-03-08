import { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AdminPanel } from "@/components/admin-panel"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"

export const metadata: Metadata = {
    title: "Admin Dashboard",
    description: "Manage users, content, and system settings",
}

export default function AdminPage() {
    return (
        <>
            <DashboardHeader />
            <DashboardShell>
                <Card>
                    <CardHeader>
                        <CardTitle>Admin Panel</CardTitle>
                        <CardDescription>Manage users, content, and system settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AdminPanel />
                    </CardContent>
                </Card>
            </DashboardShell>
        </>
    )
}

