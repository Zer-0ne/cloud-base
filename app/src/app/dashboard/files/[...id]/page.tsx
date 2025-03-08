import { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { FileExplorer } from "@/components/file-explorer";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getData } from "@/utils/fetch-from-api";
import { PathItem, Token } from "@/utils/Interfaces";
import { BreadcrumbComponent } from "@/components/bread-crumb-component";

export const metadata: Metadata = {
    title: "Folder Contents",
    description: "View and manage folder contents",
};

interface FolderPageParams {
    id: string;
}

export default async function FolderPage({ params }: { params: any }) {
    const { data: tokens } = await getData<{ data: Token[] }>("api/user/api-keys", undefined) as { data: Token[] }
    const tokenString = tokens?.map((key) => key.token).join(" ")
    const response = await getData<{ data: PathItem[] }>(
        `api/user/files/metadata/${await params.id[0]}`,
        tokenString
    );
    // console.log(response)
    const path = response?.data?.sort((a, b) => b.index - a.index); // Sort by index descending

    return (
        <>
            <DashboardHeader />
            <DashboardShell>
                <Card>
                    <CardHeader>
                        <BreadcrumbComponent path={path!} />
                    </CardHeader>
                    <CardContent>
                        <FileExplorer folderId={await params.id[0]} />
                    </CardContent>
                </Card>
            </DashboardShell>
        </>
    );
}