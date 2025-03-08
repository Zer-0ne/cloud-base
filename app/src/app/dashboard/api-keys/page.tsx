import { Metadata } from "next"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import ApiKeyManagement from "@/components/admin/api-key-management"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"

export const metadata: Metadata = {
    title: "API Keys",
    description: "Manage your API keys",
}

export default function ApiKeysPage() {
    return (
        <>
            <DashboardHeader />
            <DashboardShell>
                <Card>
                    {/* <CardHeader>
                        <CardTitle>API Key Management</CardTitle>
                        <CardDescription>Create and manage your API keys</CardDescription>
                    </CardHeader> */}
                    {/* <CardContent> */}
                    <ApiKeyManagement />
                    {/* </CardContent> */}
                </Card>
            </DashboardShell>
        </>
    )
}

