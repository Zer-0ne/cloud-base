// components/admin/UserManagement.tsx
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserPlus, Check, ChevronDown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface User {
    id: number
    name: string
    email: string
    role: string
}

export const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([])
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" })

    const addUser = () => {
        setUsers([...users, { ...newUser, id: users.length + 1 }])
        setNewUser({ name: "", email: "", role: "user" })
    }

    return (
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
                                <Button variant="outline" className="w-full justify-between text-left">
                                    {newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)}
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-full" align="start">
                                <DropdownMenuItem onClick={() => setNewUser({ ...newUser, role: "user" })}>
                                    {newUser.role === "user" && <Check className="mr-2 h-4 w-4 text-green-500" />}
                                    User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setNewUser({ ...newUser, role: "admin" })}>
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
    )
}