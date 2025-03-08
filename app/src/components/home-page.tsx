import { Metadata } from "next";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { ApiKeyManagement } from "@/components/api-key-management";
import { MediaDisplay } from "@/components/media-display";
import { FileUploader } from "@/components/file-uploader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DriveUsage } from "@/components/drive-usage";
import useSession from "@/hooks/useSession";
import { FileExplorer } from "./file-explorer";

export const metadata: Metadata = {
    title: "Dashboard",
    description: "Cloud Storage Dashboard",
};

const CyberBackground = () => {
    const { theme } = useTheme();

    return (
        <div className="fixed inset-0 -z-10">
            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="neon-grid" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={theme === 'dark' ? '#00ff8c' : '#2563eb'} stopOpacity="0.5" />
                            <stop offset="100%" stopColor={theme === 'dark' ? '#00a6ff' : '#3b82f6'} stopOpacity="0.2" />
                        </linearGradient>
                    </defs>

                    <pattern id="cyber-grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="url(#neon-grid)" strokeWidth="0.2" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#cyber-grid)" className={`${theme === 'dark' ? 'opacity-30' : 'opacity-10'}`} />

                    <motion.circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="none"
                        stroke={theme === 'dark' ? '#00ff8c' : '#2563eb'}
                        strokeWidth="0.1"
                        initial={{ scale: 0.8, opacity: 0.3 }}
                        animate={{
                            scale: [0.8, 1.2, 0.8],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                    />
                </svg>
            </div>
        </div>
    );
};

const NeonCard = ({ children, className = "", accentColor = "#00ff8c", height }: {
    children: React.ReactNode;
    className?: string;
    accentColor?: string;
    height?: number;
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <motion.div
            className={`group relative ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            style={{ height }}
        >
            <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: `linear-gradient(45deg, ${accentColor}33, transparent)`,
                    filter: 'blur(8px)'
                }}
            />
            <Card className={`relative overflow-hidden rounded-xl h-full
                ${isDark ? 'border-gray-800 bg-black/80' : 'border-gray-200 bg-white/80'} 
                backdrop-blur-lg`}>
                <div
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ backgroundColor: accentColor }}
                />
                {children}
            </Card>
        </motion.div>
    );
};

export default function DashboardPage() {
    const { session } = useSession();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const accentColors = {
        dark: {
            drive: '#00a6ff',
            api: '#ff00ea',
            upload: '#ffff00',
            media: '#00ffff'
        },
        light: {
            drive: '#2563eb',
            api: '#9333ea',
            upload: '#ca8a04',
            media: '#0891b2'
        }
    };

    const colors = isDark ? accentColors.dark : accentColors.light;

    return (
        <div className={`min-h-screen ${isDark ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
            <CyberBackground />
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`sticky top-0 z-50 backdrop-blur-xl border-b
                    ${isDark ? 'bg-black/80 border-[#00ff8c33]' : 'bg-white/80 border-gray-200'}`}
            >
                <DashboardHeader />
            </motion.div>

            <DashboardShell className="max-w-7xl mx-auto p-4">
                <div className="grid grid-cols-12 gap-4 auto-rows-[minmax(100px,auto)]">
                    {/* Usage Analytics - Slightly reduced height */}
                    {/* <div className="col-span-12 lg:col-span-8 row-span-2 min-h-[400px]">
                        <NeonCard accentColor="#00ff8c" className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[#00ff8c] text-2xl font-mono">Usage Analytics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <UsageAnalytics />
                            </CardContent>
                        </NeonCard>
                    </div> */}
                    <div className="col-span-12 lg:col-span-6 min-h-[200px]">
                        <NeonCard accentColor={colors.drive} className="h-full">
                            <DriveUsage />
                        </NeonCard>
                    </div>

                    <div className="col-span-12 lg:col-span-6 min-h-[200px]">
                        <NeonCard accentColor={colors.api} className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className={`text-xl font-mono`} style={{ color: colors.api }}>
                                    API Keys
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ApiKeyManagement />
                            </CardContent>
                        </NeonCard>
                    </div>

                    <div className="col-span-12 lg:col-span-6 min-h-[200px]">
                        <NeonCard accentColor={colors.upload} className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className={`text-xl font-mono`} style={{ color: colors.upload }}>
                                    Upload Files
                                </CardTitle>
                                <CardDescription className={`font-mono text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Secure file storage
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FileUploader />
                            </CardContent>
                        </NeonCard>
                    </div>

                    <div className="col-span-12 lg:col-span-6 min-h-[200px]">
                        <NeonCard accentColor={colors.media} className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className={`text-xl font-mono`} style={{ color: colors.media }}>
                                    Media Files
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MediaDisplay />
                                {/* <FileExplorer /> */}
                            </CardContent>
                        </NeonCard>
                    </div>
                    {/* Recent Activity - Wider but shorter */}
                    {/* <div className="col-span-12 lg:col-span-4 min-h-[200px]">
                        <NeonCard accentColor="#ff3366" className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[#ff3366] text-xl font-mono">Activity Log</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RecentActivity />
                            </CardContent>
                        </NeonCard>
                    </div> */}

                    {/* User Profile - Full width but compact */}
                    {/* <div className="col-span-12 min-h-[200px]">
                        <NeonCard accentColor="#9900ff" className="h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[#9900ff] text-xl font-mono">User Profile</CardTitle>
                                <CardDescription className="text-gray-400 font-mono text-sm">Security and preferences</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserProfile />
                            </CardContent>
                        </NeonCard>
                    </div> */}
                </div>
            </DashboardShell>
        </div>
    );
}