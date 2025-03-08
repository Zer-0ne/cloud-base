"use client";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModalDrawer from "../responsive-modal";
import useApiRequest from "@/hooks/useApiRequest";
import { createData, getData } from "@/utils/fetch-from-api";

interface AdminRequestModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDesktop: boolean;
}

export function AdminRequestModal({ isOpen, onOpenChange, isDesktop }: AdminRequestModalProps) {
  const [requestType, setRequestType] = useState<"admin" | "api">("admin");
  const [adminTab, setAdminTab] = useState<"admin" | "otp">("admin");
  const [apiTab, setApiTab] = useState<"has_api_access" | "can_make_multiple_apis">("has_api_access");
  const [otpTab, setOtpTab] = useState<"request" | "verify">("request");
  const [otp, setOtp] = useState("");

  // Purana useApiRequest for admin requests
  const { execute: submitAdminRequest, data: adminResponse } = useApiRequest(
    (otp?: string) => createData("api/admin/request/request-admin", { otp })
  );

  // Naya useApiRequest for API requests
  const { execute: submitApiRequest, data: apiResponse } = useApiRequest(
    (type: string | undefined) => type ? createData(`api/admin/request/api-creation-request/${type}`, { type }) : Promise.resolve(null)
  );

  // OTP request ke liye existing hook
  const { execute: requestOtp } = useApiRequest(() =>
    getData("api/admin/request/request-for-secret-key")
  );

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requestType === "admin") {
      if (adminTab === "admin") {
        // Direct admin request without OTP
        await submitAdminRequest();
      } else if (otpTab === "request") {
        // OTP request karna
        await requestOtp();
        setOtpTab("verify");
        return; // Modal band nahi karna
      } else {
        // OTP verify karna
        if (otp.length !== 6) {
          toast.error("Invalid OTP", {
            description: "Please enter a valid 6-digit OTP.",
          });
          return;
        }
        await submitAdminRequest(otp);
      }
    } else if (requestType === "api") {
      // API request submit karna
      await submitApiRequest(apiTab);
    }
    onOpenChange(false); // Final request ke baad modal band karna
  };

  // Modal band karne ka logic
  useEffect(() => {
    if (adminResponse || apiResponse) {
      onOpenChange(false);
    }
  }, [adminResponse, apiResponse]);

  return (
    <ModalDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
      title="Request Access"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} type="submit" form="request-form">
            {requestType === "admin"
              ? adminTab === "admin"
                ? "Submit Request"
                : otpTab === "request"
                  ? "Request OTP"
                  : "Verify OTP"
              : "Submit Request"}
          </Button>
        </div>
      }
    >
      <Tabs
        defaultValue="admin"
        onValueChange={(value) => setRequestType(value as "admin" | "api")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin">Request Admin Access</TabsTrigger>
          <TabsTrigger value="api">Request for API</TabsTrigger>
        </TabsList>

        {/* Admin Access Tab */}
        <TabsContent value="admin" className="mt-4">
          <Tabs
            defaultValue="admin"
            onValueChange={(value) => setAdminTab(value as "admin" | "otp")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin">Request to Admin</TabsTrigger>
              <TabsTrigger value="otp">Request via OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="mt-4">
              <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Your request will be sent to the admin for approval. You will be notified once it is processed.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="otp" className="mt-4">
              {otpTab === "request" ? (
                <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    A 6-digit OTP will be sent to your registered email address for verification.
                  </p>
                </form>
              ) : (
                <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      pattern="\d{6}"
                    />
                    <p className="text-sm text-muted-foreground">
                      Please enter the 6-digit OTP sent to your registered email.
                    </p>
                  </div>
                  <div className="flex justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        await requestOtp();
                      }}
                    >
                      Resend OTP
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* API Request Tab */}
        <TabsContent value="api" className="mt-4">
          <Tabs
            defaultValue="has_api_access"
            onValueChange={(value) => setApiTab(value as "has_api_access" | "can_make_multiple_apis")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="has_api_access">Can Make API</TabsTrigger>
              <TabsTrigger value="can_make_multiple_apis">Can Make Multiple APIs</TabsTrigger>
            </TabsList>

            <TabsContent value="has_api_access" className="mt-4">
              <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Request permission to create API keys.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="can_make_multiple_apis" className="mt-4">
              <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Request permission to create multiple API keys.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </ModalDrawer>
  );
}