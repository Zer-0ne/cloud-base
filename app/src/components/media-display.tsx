'use client'
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { MoreVertical, Star, Trash, Share, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getData, deleteData, getURL } from "@/utils/fetch-from-api";
import { MediaItem, Token } from "@/utils/Interfaces";
import useFetch from "@/hooks/useFetch";
import useApiRequest from "@/hooks/useApiRequest";

export const MediaDisplay = () => {
    const [starred, setStarred] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [Token, setToken] = useState('');
    const { theme } = useTheme();

    const { data: tokens } = useFetch<Token[]>(() =>
        getData("api/user/api-keys", undefined)
    );

    const { data, refetch } = useFetch<MediaItem[]>(() =>
        getData("api/user/files", tokens?.map((key) => key.token).join(" "))
    );

    const { execute: handleDelete, data: deleteApiData } = useApiRequest<object, { fileId: string }>(
        (fileId) => fileId ? deleteData(`api/user/files`, { fileId: fileId.fileId }, Token) : Promise.resolve(null)
    );

    useEffect(() => {
        if (tokens) {
            refetch()
            setToken(tokens?.map((key) => key.token).join(" "))
        };
    }, [tokens, deleteApiData]);

    const toggleStar = (id: string) => {
        setStarred(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    // const handleDelete = async (fileId: string) => {
    //     try {
    //         const apiKeys = JSON.parse(localStorage.getItem("apiKeys") || "[]");
    //         await deleteData("api/user/files", { fileId }, apiKeys);
    //         refetch();
    //     } catch (error) {
    //         console.error("Error deleting file:", error);
    //     }
    // };

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-500">Loading media...</div>
            </div>
        );
    }

    return (
        <div className={`relative ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
            <div className="max-w-7xl mx-auto">
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                        {data.filter(item => item.mimeType !== "application/vnd.google-apps.folder").map((item) => (
                            <div
                                key={item.id}
                                className={`group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-gray-50'
                                    }`}
                                onMouseEnter={() => setHoveredId(item.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <div className="relative h-24 w-full overflow-hidden">
                                    <Image
                                        src={item.thumbnailLink?.replace(/=s220$/, "") || "/api/placeholder/400/300"}
                                        alt={item.name}
                                        width={400}
                                        height={300}
                                        className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                <div className="p-2">
                                    <div className="flex items-start justify-between">
                                        <h3 className={`text-sm font-medium truncate pr-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'
                                            }`}>
                                            {item.name}
                                        </h3>
                                        {item.fullFileExtension && (
                                            <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">
                                                {item.fullFileExtension}
                                            </span>
                                        )}
                                    </div>

                                    <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                            onClick={() => toggleStar(item.id)}
                                            variant="ghost"
                                            size="sm"
                                            className={`h-6 w-6 p-0 shadow-sm rounded-full ${theme === 'dark' ? 'bg-black/90 hover:bg-white' : 'bg-white/90 hover:bg-gray-100'
                                                }`}
                                        >
                                            <Star
                                                className={`h-3 w-3 ${starred.includes(item.id)
                                                        ? "fill-yellow-400 text-yellow-400"
                                                        : theme === 'dark' ? "text-gray-400" : "text-gray-600"
                                                    }`}
                                            />
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className={`h-6 w-6 p-0 shadow-sm rounded-full ${theme === 'dark' ? 'bg-black/90 hover:bg-white' : 'bg-white/90 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    <MoreVertical className={`h-3 w-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                                        }`} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem className="flex items-center text-xs" onClick={async () => {
                                                    const url = await getURL(item.thumbnailLink as string);
                                                    window.open(item.thumbnailLink?.replace(/=s220$/, ""), '_blank');
                                                }}>
                                                    <ExternalLink className="mr-2 h-3 w-3" />
                                                    <span>Open</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="flex items-center text-xs">
                                                    <Share className="mr-2 h-3 w-3" />
                                                    <span>Share</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="flex items-center text-xs" onClick={() => window.open(item.webContentLink)}>
                                                    <Download className="mr-2 h-3 w-3" />
                                                    <span>Download</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="flex items-center text-xs text-red-600"
                                                    onClick={() => handleDelete({ fileId: item.id! })}
                                                >
                                                    <Trash className="mr-2 h-3 w-3" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className={`mt-1 text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-600'
                                        }`}>
                                        {new Date(item.modifiedTime).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    border-radius: 20px;
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    border-radius: 20px;
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    border-radius: 20px;
                    background-color: rgba(155, 155, 155, 0.5);
                    border: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(155, 155, 155, 0.7);
                }
            `}</style>
        </div>
    );
};