import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "sonner";
import { SessionProvider } from "@/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Cloud Base - Secure & Scalable Cloud Storage',
  description: `Cloud Base is a secure, scalable, and high-performance cloud storage solution for individuals and businesses. Easily store, share, and access your data from anywhere with industry-leading security and reliability.`,
  keywords: `Cloud Storage, Secure File Sharing, Data Backup, Cloud Solutions, Cloud Base, Online Storage, Enterprise Cloud, File Management, Cloud Security, Cloud Hosting, Remote Storage, SaaS, Backup and Restore, Cloud Collaboration, Private Cloud, Scalable Storage, Data Protection, Cloud Drive, Encrypted Storage, Cloud File Transfer, Cloud Sync`,
  robots: 'follow, index',
  publisher: 'Cloud Base Technologies',
  // openGraph: {
  //     title: 'Cloud Base - Secure & Scalable Cloud Storage',
  //     description: 'Cloud Base offers encrypted cloud storage with seamless file sharing and backup solutions for individuals and enterprises.',
  //     url: 'https://cloudbase.com',
  //     siteName: 'Cloud Base',
  //     images: [
  //         {
  //             url: 'https://cloudbase.com/assets/cloud-storage-banner.png',
  //             width: 1200,
  //             height: 630,
  //             alt: 'Cloud Base - Secure Cloud Storage',
  //         },
  //     ],
  //     type: 'website',
  // },
  // twitter: {
  //     card: 'summary_large_image',
  //     title: 'Cloud Base - Secure & Scalable Cloud Storage',
  //     description: 'Cloud Base offers encrypted cloud storage with seamless file sharing and backup solutions for individuals and enterprises.',
  //     images: ['https://cloudbase.com/assets/cloud-storage-banner.png'],
  // },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <SessionProvider>

          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <Toaster
              visibleToasts={9}
              position="bottom-right"
              toastOptions={{
                style: { background: 'black', color: 'white' },
                className: 'my-toast',
              }}
            />

            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
