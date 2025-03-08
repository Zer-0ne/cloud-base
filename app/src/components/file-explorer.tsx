"use client"

import { useEffect, useState, useRef, Dispatch, SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { Folder, File, MoreVertical, Plus, ArrowLeft, Upload, Search, ExternalLink, Download, Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useFetch from "@/hooks/useFetch"
import { MediaItem, Token } from "@/utils/Interfaces"
import { createData, deleteData, getData, getURL } from "@/utils/fetch-from-api"
import { formatBytes } from "@/utils/Algo"
import useApiRequest from "@/hooks/useApiRequest"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "./ui/drawer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import ModalDrawer from "./responsive-modal"
import { FileUploader } from "./file-uploader"
import Image from "next/image"

export function FileExplorer({ folderId }: { folderId?: string }) {
  const [selectedToken, setSelectedToken] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [isFileUpload, setIsFileUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<MediaItem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { data: tokens } = useFetch<Token[]>(() =>
    getData("api/user/api-keys", undefined)
  )

  const { data: files, refetch, loading: fileLoading } = useFetch<MediaItem[]>(() => {
    if (!tokens) {
      return Promise.resolve(null)
    }
    const tokenString = tokens.map((key) => key.token).join(" ")
    return getData(folderId ? `api/user/files/${folderId}` : 'api/user/files', tokenString)
  })

  const { data: folderData, execute: handleCreateFolder } = useApiRequest(() =>
    createData<{
      folderName: string
      parentId: string
    }>("api/user/files/create-folder", {
      folderName: newFolderName,
      parentId: folderId || ''
    }, selectedToken)
  )

  const { execute: handleDelete, data: deleteResponse } = useApiRequest<object, string>(
    (id) => id ? deleteData("api/user/files/", {
      fileId: id,
    }, tokens?.map(item => item.token)?.join(' ')) : Promise.resolve(null)
  )

  // console.log(files)

  useEffect(() => {
    refetch()
  }, [tokens, folderData, deleteResponse, folderId])

  useEffect(() => {
    if (folderData) {
      setIsCreateFolderOpen(prev => !prev)
    }
  }, [folderData])

  const filteredItems = files?.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleItemClick = (item: MediaItem) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      router.push(`/dashboard/files/${item.id}`)
    } else {
      setSelectedFile(item)
      setIsPreviewOpen(true)
    }
  }

  console.log(files)

  return (
    <div className="space-y-4 max-h-[75vh] overflow-auto">
      <ModalDrawer
        isOpen={isFileUpload}
        onOpenChange={setIsFileUpload}
        isDesktop={isDesktop}
        title="Upload File"
        children={<FileUploader folderId={folderId} />}
        footer={<></>}
      />

      <ModalDrawer
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        isDesktop={isDesktop}
        title={selectedFile?.name || "File Preview"}
        children={
          <div className="flex flex-col rounded-lg items-center justify-center p-2">
            {selectedFile?.thumbnailLink && (
              <div className="relative">
                <div
                  className="-inset-2 !backdrop:blur-md"
                  style={{
                    // backgroundImage: `url(https://drive.usercontent.google.com/download?id=${selectedFile.id}&export=view&authuser=0)`,
                    backgroundImage: `url(${selectedFile.thumbnailLink})`,
                    position: "absolute",
                    // zIndex: "10",
                    filter: 'blur(10px)', // Blur effect for ambient shadow
                    transition: 'opacity 0.2s',
                    backgroundSize: 'contain',
                    objectFit: 'contain'
                  }}
                />
                <Image
                  src={selectedFile.thumbnailLink.replace(/=s220$/, "")}
                  alt={selectedFile.name}
                  width={200}
                  height={200}
                  className="max-w-full !w-full z-10 relative !h-full rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        }
        footer={<></>}
      />

      <div className="flex items-center justify-between gap-4">
        {/* {folderId && (
          <Button onClick={() => router.back()} className="mb-0 p-3 py-4 rounded-lg">
            <ArrowLeft className="h-[auto] w-[auto]" />
          </Button>
        )} */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setIsCreateFolderOpen(true)}>
              <Folder className="mr-2 h-4 w-4" />
              <span>New Folder</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsFileUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload File</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(!files?.length && !fileLoading) && <div className="text-[red]">No files found</div>}
      {(fileLoading) && <div>Loading...</div>}

      {isDesktop ? (
        <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <CreateFolderContent
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              selectedToken={selectedToken}
              setSelectedToken={setSelectedToken}
              tokens={tokens || []}
            />
            <DialogFooter>
              <FooterContent
                handleCreateFolder={handleCreateFolder}
                newFolderName={newFolderName}
                selectedToken={selectedToken}
                setIsCreateFolderOpen={setIsCreateFolderOpen}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Create New Folder</DrawerTitle>
            </DrawerHeader>
            <div className="px-4">
              <CreateFolderContent
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                tokens={tokens || []}
              />
            </div>
            <DrawerFooter>
              <FooterContent
                handleCreateFolder={handleCreateFolder}
                newFolderName={newFolderName}
                selectedToken={selectedToken}
                setIsCreateFolderOpen={setIsCreateFolderOpen}
              />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {(files && files.length > 0) && (
        <Table className="max-h-[10vh] overflow-auto">
          <TableHeader>
            <TableRow className="flex w-full">
              <TableHead className="flex-1">Name</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-24">Size</TableHead>
              <TableHead className="w-32">Modified</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody >
            {filteredItems.map((item) => (
              <TableRow key={item.id} className="flex w-full items-center border-b">
                <TableCell className="flex-1" onClick={() => handleItemClick(item)} >
                  <Button variant="link" className="flex items-center">
                    {item.mimeType === 'application/vnd.google-apps.folder' ? (
                      <Folder className="mr-2 h-4 w-4" />
                    ) : (
                      <File className="mr-2 h-4 w-4" />
                    )}
                    <span className="truncate max-w-[500px]">{item.name}</span>
                  </Button>
                </TableCell>
                <TableCell className="w-24">
                  {item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file'}
                </TableCell>
                <TableCell className="w-24">
                  {item.mimeType === 'application/vnd.google-apps.folder' ? '-' : formatBytes(Number(item.size))}
                </TableCell>
                <TableCell className="w-32">
                  {new Date(item.modifiedTime).toLocaleDateString()}
                </TableCell>
                <TableCell className="w-16">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {item.mimeType !== 'application/vnd.google-apps.folder' && (
                        <DropdownMenuItem onClick={async () => {
                          const url = await getURL(item.thumbnailLink as string);
                          window.open(item.thumbnailLink?.replace(/=s220$/, ""), '_blank');
                        }}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          <span>Open in New Tab</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => window.open(item.webContentLink)}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Download</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

const CreateFolderContent = ({
  newFolderName,
  setNewFolderName,
  selectedToken,
  setSelectedToken,
  tokens
}: {
  newFolderName: string,
  setNewFolderName: Dispatch<SetStateAction<string>>,
  selectedToken: string,
  setSelectedToken: Dispatch<SetStateAction<string>>,
  tokens: Token[]
}) => (
  <div className="space-y-4 py-4">
    <div className="space-y-2">
      <label htmlFor="folderName" className="text-sm font-medium">
        Folder Name
      </label>
      <Input
        id="folderName"
        placeholder="Enter folder name"
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
      />
    </div>

    <div className="space-y-2">
      <label htmlFor="tokenSelect" className="text-sm font-medium">
        Select Token
      </label>
      <Select
        value={selectedToken}
        onValueChange={setSelectedToken}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a token" />
        </SelectTrigger>
        <SelectContent>
          {tokens.map((token, index) => (
            <SelectItem key={index} value={token.token}>
              {token.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
)

const FooterContent = ({
  setIsCreateFolderOpen,
  handleCreateFolder,
  newFolderName,
  selectedToken
}: {
  setIsCreateFolderOpen: Dispatch<SetStateAction<boolean>>,
  handleCreateFolder: () => void,
  newFolderName: string,
  selectedToken: string
}) => (
  <>
    <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
      Cancel
    </Button>
    <Button
      onClick={() => handleCreateFolder()}
      disabled={!selectedToken || !newFolderName}
    >
      Create
    </Button>
  </>
)