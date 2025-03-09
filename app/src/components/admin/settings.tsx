'use client'
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import useFetch from "@/hooks/useFetch";
import { getData } from "@/utils/fetch-from-api";


const Settings = () => {
    const [ws, setWs] = useState<WebSocket | null>(null);

    // Local states for the three fields
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [defaultQuota, setDefaultQuota] = useState("5 GB");
    const [maxFileSize, setMaxFileSize] = useState("100 MB");
    const { data: tokens } = useFetch(() => getData('api/user/api-keys'));

    // Open WebSocket and set up event listeners
    useEffect(() => {
        // Use the correct WebSocket URL for your environment
        const socket = new WebSocket(`ws://${window.location.hostname || 'localhost'}:5000/ws/system-setting`);

        // Keep a reference to the socket in state so we can send messages later
        setWs(socket);

        socket.onopen = () => {
            console.log("WebSocket connected.");

            // 1) Send auth message with token
            const token = tokens?.[0];
            socket.send(
                JSON.stringify({
                    type: "auth",
                    token: { token },
                })
            );

            // 2) Fetch existing system settings
            socket.send(
                JSON.stringify({
                    type: "system_setting",
                    action: "fetch",
                })
            );
        };

        socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            // Handle system_setting responses
            if (msg.type === "system_setting") {
                // On fetch success, update local states
                if (msg.status === "fetch_success") {
                    const { maintenance_mode, storage_limit, max_file_size } = msg.data;
                    setMaintenanceMode(!!maintenance_mode);
                    setDefaultQuota(`${storage_limit} GB`);
                    setMaxFileSize(`${max_file_size} MB`);
                }
                // On update success, you could show a toast or confirmation if desired
                else if (msg.status === "update_success") {
                    console.log("System settings updated successfully.");
                }
            }
            // Handle errors
            else if (msg.type === "error") {
                console.error("WebSocket error:", msg.message);
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket encountered error:", error);
        };

        return () => {
            // Cleanup: close WebSocket on unmount
            socket.close();
        };
    }, [tokens]);

    // Toggle maintenance mode immediately on switch change
    const handleMaintenanceToggle = (checked: boolean) => {
        setMaintenanceMode(checked);
        if (ws) {
            ws.send(
                JSON.stringify({
                    type: "system_setting",
                    action: "update",
                    payload: { maintenance_mode: checked },
                })
            );
        }
    };

    // Send updates for storage limit and max file size
    const handleSubmit = () => {
        if (!ws) return;

        // Extract numeric part from e.g. "5 GB"
        const [quotaValue] = defaultQuota.split(" ");
        const [maxFileValue] = maxFileSize.split(" ");

        ws.send(
            JSON.stringify({
                type: "system_setting",
                action: "update",
                payload: {
                    // We can include maintenance_mode here as well, if you want to update all at once
                    maintenance_mode: maintenanceMode,
                    storage_limit: parseInt(quotaValue, 10),
                    max_file_size: parseInt(maxFileValue, 10),
                },
            })
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure global system settings</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Maintenance Mode Switch */}
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="maintenance-mode"
                            checked={maintenanceMode}
                            onCheckedChange={handleMaintenanceToggle}
                        />
                        <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                    </div>

                    {/* Default Storage Limit */}
                    <div className="grid gap-2">
                        <Label htmlFor="storage-limit">Default Storage Limit (GB)</Label>
                        <Input
                            id="storage-limit"
                            type="number"
                            value={defaultQuota.split(" ")[0]}
                            onChange={(e) => setDefaultQuota(`${e.target.value} GB`)}
                        />
                    </div>

                    {/* Max File Size */}
                    <div className="grid gap-2">
                        <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                        <Input
                            id="max-file-size"
                            type="number"
                            value={maxFileSize.split(" ")[0]}
                            onChange={(e) => setMaxFileSize(`${e.target.value} MB`)}
                        />
                    </div>

                    {/* Save Button */}
                    <Button onClick={handleSubmit}>Save Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default Settings;
