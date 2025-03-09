import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { User } from '@/utils/Interfaces';
import { getData } from '@/utils/fetch-from-api';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
    title: 'Admin Panel - Cloud Base Cloud Storage Management',
    description: `Manage and monitor your Cloud Base storage system with ease. The Cloud Base Admin Panel provides powerful tools for secure file management, user access control, data backups, and scalable storage solutions.`,
    keywords: `Admin Panel, Cloud Base, Cloud Storage Management, File Management, Secure Storage, Data Backup, User Access Control, Cloud Dashboard, Storage Administration, Cloud Solutions, Enterprise Storage, Admin Dashboard, File Sharing, Scalable Cloud Storage, Cloud Hosting, Cloud Security`,
    robots: 'follow, index',
    publisher: 'Cloud Base Technologies',
    // openGraph: {
    //     title: 'Admin Panel - Cloud Base Cloud Storage Management',
    //     description: 'The Cloud Base Admin Panel offers powerful tools for managing your cloud storage, controlling user access, and ensuring secure data backup solutions.',
    //     url: 'https://cloudbase.com/admin',
    //     siteName: 'Cloud Base Admin Panel',
    //     images: [
    //         {
    //             url: 'https://cloudbase.com/assets/admin-panel-banner.png',
    //             width: 1200,
    //             height: 630,
    //             alt: 'Cloud Base Admin Panel - Manage Cloud Storage',
    //         },
    //     ],
    //     type: 'website',
    // },
    // twitter: {
    //     card: 'summary_large_image',
    //     title: 'Admin Panel - Cloud Base Cloud Storage Management',
    //     description: 'Manage and monitor your Cloud Base storage system with ease. The Cloud Base Admin Panel provides powerful tools for secure file management, user access control, data backups, and scalable storage solutions.',
    //     images: ['https://cloudbase.com/assets/admin-panel-banner.png'],
    // },
};

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {

    // Fetch the current session on the server side
    const { data: session } = await getData<{ data: User }>('api/user/profile') as { data: any };

    // If no session exists, render a 404 page
    if (!session) {
        return notFound();
    }

    // Check if the user is allowed to access this page
    const isAdmin = ['user', 'moderator'].includes(session?.role) ? false : true;

    if (!isAdmin) {
        return notFound(); // Redirect or 404 if the user is not an admin
    }

    return (
        <div>
            {children}
        </div>
    );
}