"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  Search,
  Settings,
  FileText,
  Key,
  Users,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import useSession from "@/hooks/useSession";
import { AdminRequestModal } from "./admin/admin-request-modal";
import { RequestStatusModal } from "./request-status-modal"; 

// Check user session role (mock function)
function isAdminUser() {
  const session = useSession();
  return session.session?.role === "admin";
}

export function DashboardHeader() {
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const isAdmin = isAdminUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false); // State for request modal
  const [isDesktop, setIsDesktop] = useState(true);

  // Navigation links
  const navigation = [
    { name: "Dashboard", href: "/", icon: FileText },
    { name: "Files", href: "/dashboard/files", icon: FileText },
    { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
  ];
  if (isAdmin) {
    navigation.push({ name: "Admin", href: "/dashboard/admin", icon: Users });
  }

  // Check viewport width for responsive adjustments
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur shadow-md">
      <div className="container mx-auto max-w-[1200px] flex items-center justify-between px-4 h-14">
        {/* Left: Mobile Hamburger Menu */}
        <div className="flex items-center">
          <div className="md:hidden mr-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] sm:w-[300px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Cloud Storage</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col space-y-4 mt-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center py-2 px-3 rounded-md transition-colors ${
                        pathname === item.href
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/60 hover:text-foreground hover:bg-accent"
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}
                  {/* Separator */}
                  <hr className="my-4" />
                  {/* Theme, Settings, and Pending Requests */}
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center py-2 px-3 rounded-md transition-colors text-foreground/60 hover:text-foreground hover:bg-accent cursor-pointer">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-3 h-5 w-5"
                          >
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2" />
                            <path d="M12 20v2" />
                            <path d="m4.93 4.93 1.41 1.41" />
                            <path d="m17.66 17.66 1.41 1.41" />
                            <path d="M2 12h2" />
                            <path d="M20 12h2" />
                            <path d="m6.34 17.66-1.41 1.41" />
                            <path d="m19.07 4.93-1.41 1.41" />
                          </svg>
                          Theme
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          System
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isAdmin && (
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center py-2 px-3 rounded-md transition-colors text-foreground/60 hover:text-foreground hover:bg-accent"
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                      </Link>
                    )}
                    {/* Pending Requests Option */}
                    <div
                      className="flex items-center py-2 px-3 rounded-md transition-colors text-foreground/60 hover:text-foreground hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setIsRequestModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <FileText className="mr-3 h-5 w-5" />
                      Pending Requests
                    </div>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <div className="md:hidden">
            <Link href="/" className="font-bold text-lg">
              Cloud Storage
            </Link>
          </div>
        </div>

        {/* Center: Navigation & Search for Desktop */}
        <div className="hidden md:flex flex-1 items-center justify-between">
          <nav className="flex space-x-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center transition-colors ${
                  pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center space-x-4">
            <form className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search files..."
                className="pl-8 w-[300px] md:w-[250px] lg:w-[300px] transition-shadow duration-300 focus:shadow-outline"
              />
            </form>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-gray-800 transition-colors duration-300"
                onClick={() => {}}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            )}
            {/* Pending Requests Button */}
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-gray-800 transition-colors duration-300"
              onClick={() => setIsRequestModalOpen(true)}
            >
              <FileText className="h-5 w-5" />
              <span className="sr-only">Pending Requests</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-9 px-0"
                  aria-label="Toggle theme"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Right: Admin Request Button */}
        <div className="flex items-center ml-2">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600"
            onClick={() => setIsAdminModalOpen(true)}
          >
            <Shield className="h-4 w-4 mr-1" />
            Request Admin Access
          </Button>
        </div>
      </div>
      {/* Modals */}
      <AdminRequestModal
        isOpen={isAdminModalOpen}
        onOpenChange={setIsAdminModalOpen}
        isDesktop={isDesktop}
      />
      <RequestStatusModal
        isOpen={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        isDesktop={isDesktop}
      />
    </header>
  );
}