"use client";

import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { PathItem } from "@/utils/Interfaces";
import { ChevronRight, Home, Folder } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function BreadcrumbComponent({ path }: { path: PathItem[] }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <Breadcrumb>
            <BreadcrumbList className="flex flex-wrap items-center px-2 py-1 bg-[#f4f4f5] dark:bg-[#27272a] rounded-lg shadow-sm">
                {path?.map((item, index) => (
                    <BreadcrumbItem 
                        key={item.id} 
                        className={cn(
                            "transition-all duration-200 ease-in-out",
                            hoveredIndex === index && "scale-110"
                        )}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {index > 0 && (
                            <BreadcrumbSeparator>
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            </BreadcrumbSeparator>
                        )}
                        <BreadcrumbLink asChild>
                            <Link
                                href={
                                    item.name === "root"
                                        ? "/dashboard/files"
                                        : `/dashboard/files/${item.id}`
                                }
                                className={cn(
                                    "flex items-center px-2 py-1 rounded-md",
                                    index === path.length - 1 
                                        ? "font-semibold text-primary bg-primary/10" 
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[black]",
                                    hoveredIndex === index && "shadow-sm"
                                )}
                            >
                                {item.name === "root" ? (
                                    <Home className="h-4 w-4 mr-1.5" />
                                ) : (
                                    <Folder className="h-4 w-4 mr-1.5" />
                                )}
                                <span className="truncate max-w-[150px]">
                                    {item.name === "root" ? "Home" : item.name}
                                </span>
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}