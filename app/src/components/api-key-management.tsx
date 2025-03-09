import { getCookie as get_cookies } from "@/utils/fetch-from-api";
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, Trash2 } from 'lucide-react'
import { createData, deleteData, getData } from "@/utils/fetch-from-api"
import useApiRequest from "@/hooks/useApiRequest"
import useFetch from "@/hooks/useFetch"
import { useMediaQuery } from "@/hooks/use-media-query" // Check screen size
import ModalDrawer from "./responsive-modal";

const predefinedNames = ["Development", "Production", "Testing", "Staging", "Custom"];

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showNameSelector, setShowNameSelector] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [customName, setCustomName] = useState("");
  const [generatedTokens, setGeneratedTokens] = useState<{ token: string; refreshToken: string; name: string } | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<{ token: string; name?: string; refreshToken?: string } | null>(null);
  const [showApiKeyDetails, setShowApiKeyDetails] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)"); // ✅ Check if it's a desktop

  const { execute: generateApiKey, data: generateTokenData } = useApiRequest<any>(
    () => createData('api/user/api-creation', { name: customName })
  );

  const { execute: deleteApiKey, data: deleteApiData } = useApiRequest<object, { token: string }>(
    (token) => token ? deleteData(`api/user/api-key`, { token }) : Promise.resolve(null)
  );

  const { data, refetch } = useFetch(() => getData('api/user/api-keys'));

  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchRefreshToken = async () => {
      try {
        const token = await get_cookies('token');
        setRefreshToken(token!);
      } catch (error) {
        console.error('Error fetching refresh token:', error);
      }
    };
    fetchRefreshToken();
  }, []);

  useEffect(() => {
    if (data) setApiKeys(data);
  }, [data]);

  useEffect(() => {
    if (deleteApiData) refetch();
  }, [deleteApiData]);

  useEffect(() => {
    if (generateTokenData && refreshToken) {
      setGeneratedTokens({ token: generateTokenData.token, refreshToken: refreshToken, name: customName });
      setShowTokenDialog(true);
      refetch();
      setShowNameSelector(false);
      setCustomName("");
    }
  }, [generateTokenData, refreshToken]);

  const handleGenerateClick = (name: string) => {
    setCustomName(name);
    generateApiKey();
  };

  const handleApiKeyClick = async (key: any) => {
    setSelectedApiKey({ ...key, refreshToken: refreshToken || '' });
    setShowApiKeyDetails(true);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        {apiKeys?.map((key) => (
          <div key={key.token} className="flex items-center space-x-2">
            <Input
              type="text"
              value={key.token}
              readOnly
              className="flex-grow font-mono text-sm cursor-pointer"
              onClick={() => handleApiKeyClick(key)}
            />
            <Button variant="ghost" size="icon" onClick={() => deleteApiKey(key.token)}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete API key</span>
            </Button>
          </div>
        ))}
      </div>

      {/* Name Selector ModalDrawer */}
      <ModalDrawer
        isOpen={showNameSelector}
        onOpenChange={setShowNameSelector}
        isDesktop={isDesktop}
        title="Select API Key Name"
        footer={<Button variant="outline" onClick={() => setShowNameSelector(false)}>Cancel</Button>}
      >
        <div className="space-y-2 py-4">
          {predefinedNames.map((name) => (
            <Button key={name} variant="outline" className="w-full justify-start" onClick={() => handleGenerateClick(name)}>
              {name}
            </Button>
          ))}
        </div>
      </ModalDrawer>

      {/* Generated API Keys ModalDrawer */}
      <ModalDrawer
        isOpen={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        isDesktop={isDesktop}
        title="Generated API Keys"
        footer={<Button onClick={() => setShowTokenDialog(false)}>Close</Button>}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={generatedTokens?.name || ""} readOnly className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">API Token</label>
            <Input value={generatedTokens?.token || ""} readOnly className="mt-1.5 font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium">Refresh Token</label>
            <Input value={generatedTokens?.refreshToken || ""} readOnly className="mt-1.5 font-mono" />
          </div>
        </div>
      </ModalDrawer>

      {/* ✅ API Key Details ModalDrawer */}
      <ModalDrawer
        isOpen={showApiKeyDetails}
        onOpenChange={setShowApiKeyDetails}
        isDesktop={isDesktop}
        title="API Key Details"
        footer={<Button onClick={() => setShowApiKeyDetails(false)}>Close</Button>}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={selectedApiKey?.name || ""} readOnly className="mt-1.5" />
          </div>
          <div>
            <label className="text-sm font-medium">API Token</label>
            <Input value={selectedApiKey?.token || ""} readOnly className="mt-1.5 font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium">Refresh Token</label>
            <Input value={selectedApiKey?.refreshToken || ""} readOnly className="mt-1.5 font-mono" />
          </div>
        </div>
      </ModalDrawer>
    </div>
  );
}

export default ApiKeyManagement;
