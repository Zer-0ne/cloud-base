"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { UserPlus, Settings, Users, BarChart, Shield, Key, HardDrive, Check, ChevronDown, FileQuestion, Database } from 'lucide-react'
// import { getAllocatedStroage, getCloudStorage, getData, trackLog } from "@/utils/fetch-from-api"
import { formatBytes } from "@/utils/Algo"
import { DriveUsage } from "./drive-usage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import Api from "./admin/api-key-management"
import Setting from "./admin/settings"
import { RequestsComponent } from "./admin/requests-component"
import { DatabaseTables } from "./database-tables"

export interface Logs {
  id: number
  timestamp: string
  message: string
  type: string
}

// Mock user data
const mockUsers = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "Admin" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "User" },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "User" },
]

// Mock log data
const mockLogs = [
  { id: 1, timestamp: "2023-06-15 10:30:45", message: "User login: alice@example.com" },
  { id: 2, timestamp: "2023-06-15 11:15:22", message: "File uploaded: report.pdf" },
  { id: 3, timestamp: "2023-06-15 12:05:10", message: "API key created for user: bob@example.com" },
  { id: 4, timestamp: "2023-06-15 13:45:30", message: "Storage limit increased for user: charlie@example.com" },
  { id: 5, timestamp: "2023-06-15 14:20:15", message: "User logout: alice@example.com" },
]

export function AdminPanel() {
  const [users, setUsers] = useState(mockUsers)
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" })
  const [logs, setLogs] = useState<Logs[]>([])
  const [apiKeyUsage, setApiKeyUsage] = useState({ used: 65, total: 100 })
  const [overallUsage, setOverallUsage] = useState({ used: 7500, total: 10000 })
  const [allocatedStorage, setAllocatedStorage] = useState<number>(0)
  const logsRef = useRef<Logs[]>([]); // Mutable reference to logs

  // Update the ref whenever the logs state changes
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);


  const getLog = async () => {
    // const log = await trackLog(logsRef.current)
    // if (log?.length === logs.length) return
    // setLogs(log as Logs[])
  }
  // Simulating real-time updates
  useEffect(() => {

    const interval = setInterval(() => {
      setApiKeyUsage(prev => ({
        ...prev,
        used: Math.min(prev.total, prev.used + Math.random() * 2 - 1)
      }))
      // setOverallUsage(prev => ({
      //   ...prev,
      //   used: Math.min(prev.total, prev.used + Math.random() * 20 - 10)
      // }))
      // setLogs(prev => [
      //   { id: Date.now(), timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), message: `Random activity ${Math.floor(Math.random() * 1000)}` },
      //   ...prev.slice(0, 49)
      // ])
      getLog()
    }, 10000)
    getStorage()
    getUsers()
    // const eventSource = new EventSource('/api/admin/logs-stream');

    // eventSource.onmessage = (event) => {
    //   const log = JSON.parse(event.data);
    //   setLogs((prev) => [...log, ...prev]);
    // };

    // return () => {
    //   eventSource.close(); // Clean up on component unmount
    // };
    return () => clearInterval(interval)
  }, [])



  const getUsers = async () => {
    // const res = await getData<{
    //   data: object[]
    // }>('api/admin/user')
    // const { data } = res!
    // setUsers(data as any)
  }

  const getStorage = async () => {
    // const storage = await getCloudStorage();
    // const data = await getAllocatedStroage()
    // setAllocatedStorage(Number(data?.totalAllocatedSpace))
    // if (storage) {
    //   const used = Number(storage.usage);
    //   const total = Number(storage.limit);

    //   setOverallUsage({
    //     used, // Keep as number
    //     total, // Keep as number
    //   });
    // }
  };



  // console.log(apiKeys)

  const [visibleLogs, setVisibleLogs] = useState<Logs[]>(logs?.slice(0, 50));
  const loadMoreRef = useRef<HTMLTableRowElement | null>(null);
  // useEffect(() => {
  //   if (!loadMoreRef.current) return;

  //   const observer = new IntersectionObserver(
  //     ([entry]) => {
  //       if (entry.isIntersecting && visibleLogs.length < logsRef?.current?.length) {
  //         setVisibleLogs((prev) => [
  //           ...prev,
  //           ...logsRef?.current?.slice(prev.length, prev.length + 50),
  //         ]);
  //       }
  //     },
  //     // { threshold: 1.0 }
  //   );

  //   observer.observe(loadMoreRef.current);

  //   return () => observer.disconnect();
  // }, [visibleLogs, logs]);


  const addUser = () => {
    // setUsers([...users, { ...newUser, id: users.length + 1 }])
    // setNewUser({ name: "", email: "", role: "User" })
  }

  return (
    <Tabs  defaultValue="users">
      <TabsList className="grid w-full h-auto lg:grid-cols-8 md:grid-cols-6 grid-cols-2">
        <TabsTrigger value="users">
          <Users className="mr-2 h-4 w-4" />
          Users
        </TabsTrigger>
        <TabsTrigger value="content">
          <Shield className="mr-2 h-4 w-4" />
          Content
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart className="mr-2 h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="api-keys">
          <Key className="mr-2 h-4 w-4" />
          API Keys
        </TabsTrigger>
        <TabsTrigger value="logs">
          <HardDrive className="mr-2 h-4 w-4" />
          Logs
        </TabsTrigger>
        <TabsTrigger value="requests">
          <FileQuestion className="mr-2 h-4 w-4" />
          Requests
        </TabsTrigger>
        <TabsTrigger value="database">
          <Database className="mr-2 h-4 w-4" />
          Database
        </TabsTrigger>
      </TabsList>
      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Add, edit, or remove users</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Button variant="ghost">Edit</Button>
                      <Button variant="ghost" className="text-red-500">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-4">
              <h4 className="text-sm font-medium">Add New User</h4>
              <div className="grid gap-4 sm:grid-cols-4">
                <Input
                  placeholder="Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
                <Input
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-left"
                    >
                      {newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full" align="start">
                    <DropdownMenuItem
                      onClick={() => setNewUser({ ...newUser, role: "user" })}
                    >
                      {newUser.role === "user" && <Check className="mr-2 h-4 w-4 text-green-500" />}
                      User
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setNewUser({ ...newUser, role: "admin" })}
                    >
                      {newUser.role === "admin" && <Check className="mr-2 h-4 w-4 text-green-500" />}
                      Admin
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={addUser}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="content">
        <Card>
          <CardHeader>
            <CardTitle>Content Moderation</CardTitle>
            <CardDescription>Review and manage user-generated content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="auto-moderation" />
                <Label htmlFor="auto-moderation">Enable auto-moderation</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="profanity-filter" />
                <Label htmlFor="profanity-filter">Enable profanity filter</Label>
              </div>
              <Button>View Flagged Content</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics">
        <Card>
          <CardHeader>
            <CardTitle>System Analytics</CardTitle>
            <CardDescription>View system-wide analytics and usage statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button>Generate Analytics Report</Button>
              <Button>View User Activity Logs</Button>
              <Button>Export Data</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings">
        <Setting />
      </TabsContent>
      <TabsContent value="api-keys">
        <Api />
      </TabsContent>
      <TabsContent value="logs">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Monitor system activities in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleLogs?.map((log) => (
                      <TableRow key={`${log.id}-${log.timestamp}-${log.message}`}>
                        <TableCell
                          style={{
                            whiteSpace: "nowrap", // Prevent wrapping in Timestamp column
                            overflow: "hidden",
                            textOverflow: "ellipsis", // Optional for ellipsis in case of overflow
                            color:
                              log.type === "error"
                                ? "red"
                                : log.type === "warn"
                                  ? "yellow"
                                  : undefined,
                          }}
                        >
                          {log.timestamp}
                        </TableCell>
                        <TableCell
                          className="relative whitespace-normal break-words "
                          style={{
                            color:
                              log.type === "error"
                                ? "red"
                                : log.type === "warn"
                                  ? "yellow"
                                  : undefined,
                          }}
                        >
                          <div className="group relative w-full">
                            {log?.message?.replace(log.type, '')}
                            <div className="absolute z-[1] transform -translate-x-1/2 -top-full mb-2 hidden w-max max-w-xs p-2 bg-black text-white text-sm rounded shadow-lg group-hover:block">
                              {log?.message?.replace(log.type, '')}
                            </div>
                          </div>
                        </TableCell>

                      </TableRow>
                    ))}
                    <TableRow ref={loadMoreRef}>
                      <TableCell colSpan={2} style={{ textAlign: "center", fontStyle: "italic" }}>
                        Loading more logs...
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <DriveUsage />
            {/* <Card>
              <CardHeader>
                <CardTitle>Allotted API Key Usage</CardTitle>
                <CardDescription>Current API key storage usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={(apiKeyUsage.used / apiKeyUsage.total) * 100} />
                  <div className="text-sm text-muted-foreground">
                    {apiKeyUsage.used.toFixed(2)} GB used of {apiKeyUsage.total} GB
                  </div>
                </div>
              </CardContent>
            </Card> */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Cloud Storage Usage</CardTitle>
                <CardDescription>Total storage usage across all users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={overallUsage.total > 0 ? ((overallUsage.used / overallUsage.total) * 100) : 0} />
                  <div className="text-sm text-muted-foreground">
                    {formatBytes(overallUsage.used)} used of {formatBytes(overallUsage.total)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overall Allocated Cloud Storage Usage</CardTitle>
                <CardDescription>Total Allocated storage usage across all users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={overallUsage.total > 0 ? ((allocatedStorage / overallUsage.total) * 100) : 0} />
                  <div className="text-sm text-muted-foreground">
                    {formatBytes(allocatedStorage)} used of {formatBytes(overallUsage.total)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="requests">
        <Card>
          <CardHeader>
            <CardTitle>User Requests</CardTitle>
            <CardDescription>Manage and respond to user requests</CardDescription>
          </CardHeader>
          <CardContent>
            <RequestsComponent />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="database">
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
            <CardDescription>View and manage database records</CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseTables />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
