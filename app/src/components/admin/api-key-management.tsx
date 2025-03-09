'use client'
import React, { useEffect, useState } from 'react'
import { createData, deleteData, getData } from '@/utils/fetch-from-api'
import { formatBytes } from '@/utils/Algo'
import useApiRequest from '@/hooks/useApiRequest'
import useDebounce from '@/hooks/useDebounce'
import dynamic from 'next/dynamic'
import useFetch from '@/hooks/useFetch'

const Card = dynamic(() => import('../ui/card').then(mod => mod.Card));
const CardContent = dynamic(() => import('../ui/card').then(mod => mod.CardContent));
const CardDescription = dynamic(() => import('../ui/card').then(mod => mod.CardDescription));
const CardHeader = dynamic(() => import('../ui/card').then(mod => mod.CardHeader));
const CardTitle = dynamic(() => import('../ui/card').then(mod => mod.CardTitle));

const Table = dynamic(() => import('../ui/table').then(mod => mod.Table));
const TableBody = dynamic(() => import('../ui/table').then(mod => mod.TableBody));
const TableCell = dynamic(() => import('../ui/table').then(mod => mod.TableCell));
const TableHead = dynamic(() => import('../ui/table').then(mod => mod.TableHead));
const TableHeader = dynamic(() => import('../ui/table').then(mod => mod.TableHeader));
const TableRow = dynamic(() => import('../ui/table').then(mod => mod.TableRow));

const Input = dynamic(() => import('../ui/input').then(mod => mod.Input));
const Button = dynamic(() => import('../ui/button').then(mod => mod.Button));

type ApiKey = {
    name: string;
    token: string;
    storage: {
        usage: string;
        limit: string;
        drives: {
            id: string;
            allocatedSpace: string;
            usage: string;
            driveId: string;
        }[];
    }
}

const ApiManagement = () => {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [pendingUpdates, setPendingUpdates] = useState<Map<string, string>>(new Map())

    const { data: tokenData, refetch: fetchApiKey } = useFetch(() => getData('api/user/api-keys'));

    useEffect(() => {
        if (tokenData) {
            setApiKeys(tokenData || tokenData);
        }
    }, [tokenData]);

    const { execute: alloteStorage, loading: isAllocating } = useApiRequest<any, { key: string, space: string } | undefined>(
        (params: { key: string, space: string } | undefined) =>
            createData('api/admin/allocate-storage', params!)
    );

    const { execute: generateApiKey, data: generateTokenData } = useApiRequest(
        () => createData<{ token: string; message: string }>('api/user/api-creation', { name: 'sahil khans' })
    );

    const { execute: deleteApi, data: deleteApiData } = useApiRequest<object, { token: string }>(
        (params) => params?.token ? deleteData(`api/user/api-key`, { token: params.token }) : Promise.resolve(null)
    );

    useEffect(() => {
        if (generateTokenData || deleteApiData) {
            fetchApiKey();
        }
    }, [generateTokenData, deleteApiData]);

    // Handle storage input changes
    const handleStorageChange = (key: string, value: string, unit: string) => {
        const newSpace = `${value} ${unit}`;
        setPendingUpdates(prev => new Map(prev).set(key, newSpace));
    };

    // Update storage for a specific API key
    const updateStorage = async (key: string) => {
        const newSpace = pendingUpdates.get(key);
        if (!newSpace) return;

        try {
            await alloteStorage({ key, space: newSpace });
            // On success, clear the pending update and refresh the list
            setPendingUpdates(prev => {
                const updated = new Map(prev);
                updated.delete(key);
                return updated;
            });
            await fetchApiKey();
        } catch (error) {
            console.error('Error updating storage:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>API Key Management</CardTitle>
                <CardDescription>Manage API keys and their storage allocations</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>API Key Name</TableHead>
                            <TableHead>Token</TableHead>
                            <TableHead>Storage Allocation</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {apiKeys?.map((key, idx) => {
                            const currentLimit = formatBytes(Number(key.storage.limit));
                            const [value, unit] = currentLimit.split(' ');

                            return (
                                <TableRow key={idx}>
                                    <TableCell className="truncate overflow-hidden max-w-[150px]">
                                        {key.name}
                                    </TableCell>
                                    <TableCell className="truncate overflow-hidden max-w-[200px]">
                                        {key.token.slice(0, 20)}...
                                    </TableCell>
                                    <TableCell className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            defaultValue={Number(value)}
                                            className="w-20"
                                            onChange={(e) => handleStorageChange(key.token, e.target.value, unit)}
                                        />
                                        <span className="text-sm text-gray-500">{unit}</span>
                                        {pendingUpdates.has(key.token) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isAllocating}
                                                onClick={() => updateStorage(key.token)}
                                            >
                                                Update
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            onClick={() => deleteApi({ token: key.token })}
                                            className="text-red-500"
                                        >
                                            Revoke
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                <div className="mt-4">
                    <Button onClick={() => generateApiKey()}>Generate New API Key</Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default ApiManagement;