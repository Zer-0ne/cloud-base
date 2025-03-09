"use client"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Shield, Zap, Smartphone, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedCloudLogo } from "@/components/animated-cloud-logo"
import { AnimatedFeatureCard } from "@/components/animated-feature-card"
import { AnimatedBackground } from "@/components/animated-background"
import { getData, setCookie } from "@/utils/fetch-from-api"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import useFetch from "@/hooks/useFetch"
import { useMediaQuery } from "@/hooks/use-media-query"
import ModalDrawer from "./responsive-modal"

export default function WelcomePage() {
    const router = useRouter()
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [customTokenModalOpen, setCustomTokenModalOpen] = useState(false)
    const [customToken, setCustomToken] = useState("")
    
    const handleInitializeApp = async () => {
        try {
            const authUrl = await getData("google-service/auth");
            const popupWidth = 500;
            const popupHeight = 600;
            const left = (window.screen.width / 2) - (popupWidth / 2);
            const top = (window.screen.height / 2) - (popupHeight / 2);

            window.open(
                authUrl as string,
                'Google Authentication',
                `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`
            );
        } catch (error) {
            console.error("Error initializing app:", error);
            throw error;
        }
    };

    const handleMessage = async () => {
        // Create a URLSearchParams object from the query string
        const searchParams = new URLSearchParams(window.location.search);

        // Extract the value of the 'token' parameter
        const token = searchParams.get('token');
        if (token) {
            await setCookie(token!)
            window.close()
        }
        router.refresh()
        return token
    }
    
    const { data: token } = useFetch(() => handleMessage())
    
    useEffect(() => {
        // Add event listener for messages
        const handSave = async () => {
            if (token) {
                await setCookie(token!)
                window.close()
            }
            router.refresh()
        }
        handSave()
    }, [token])

    const handleCustomTokenSubmit = async () => {
        if (customToken.trim()) {
            try {
                await setCookie(customToken)
                setCustomTokenModalOpen(false)
                router.refresh()
            } catch (error) {
                console.error("Error setting custom token:", error)
            }
        }
    }

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
            {/* Animated background elements */}
            {/* <AnimatedBackground /> */}

            {/* Animated frame border overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ borderWidth: "4px", borderStyle: "solid" }}
            />

            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12 z-10"
            >
                <AnimatedCloudLogo />
                <motion.h1
                    className="text-4xl sm:text-5xl font-bold mt-8 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    {/* Animated grayscale gradient text */}
                    <span
                        className="inline-block bg-gradient-to-r from-white to-gray-500  bg-clip-text text-transparent"
                        style={{ backgroundSize: "400% 100%", animation: "gradientAnimation 5s ease infinite" }}
                    >
                        Welcome to Cloud Storage
                    </span>
                </motion.h1>
                <motion.p
                    className="text-xl text-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                >
                    Your secure and efficient cloud storage solution
                </motion.p>
            </motion.div>

            <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 w-full max-w-5xl z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
            >
                <AnimatedFeatureCard
                    icon={<Shield className="w-12 h-12 text-white" />}
                    title="Secure"
                    description="Your data is encrypted and protected with state-of-the-art security measures."
                />
                <AnimatedFeatureCard
                    icon={<Zap className="w-12 h-12 text-white" />}
                    title="Fast"
                    description="Lightning-fast upload and download speeds for efficient file management."
                />
                <AnimatedFeatureCard
                    icon={<Smartphone className="w-12 h-12 text-white" />}
                    title="Accessible"
                    description="Access your files from any device, anywhere, anytime."
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
                transition={{
                    delay: 1.5,
                    duration: 0.5,
                    scale: { duration: 3, repeat: Infinity, repeatType: "mirror" }
                }}
                className="z-10 flex flex-col sm:flex-row gap-4 items-center"
            >
                <Button
                    size="lg"
                    className="text-lg bg-white text-black hover:bg-gray-200"
                >
                    <motion.div
                        onClick={handleInitializeApp}
                        whileHover={{
                            scale: 1.1,
                            rotate: 1,
                            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)"
                        }}
                        whileTap={{ scale: 0.95, rotate: -3 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex items-center"
                    >
                        Initialize <ArrowRight className="ml-2 h-5 w-5" />
                    </motion.div>
                </Button>

                <Button
                    size="lg"
                    variant="outline"
                    className="text-lg border-white text-white hover:bg-white/10"
                    onClick={() => setCustomTokenModalOpen(true)}
                >
                    <motion.div
                        whileHover={{
                            scale: 1.1,
                            rotate: 1,
                            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)"
                        }}
                        whileTap={{ scale: 0.95, rotate: -3 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex items-center"
                    >
                        Add Custom Token <Key className="ml-2 h-5 w-5" />
                    </motion.div>
                </Button>
            </motion.div>

            {/* Custom Token Modal */}
            <ModalDrawer
                isOpen={customTokenModalOpen}
                onOpenChange={setCustomTokenModalOpen}
                isDesktop={isDesktop}
                title="Enter Custom Token"
                className="space-y-4"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setCustomTokenModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCustomTokenSubmit}
                            disabled={!customToken.trim()}
                        >
                            Submit
                        </Button>
                    </div>
                }
            >
                <div className="py-4">
                    <p className="text-sm text-gray-400 mb-4">
                        If you already have a token, you can enter it manually below:
                    </p>
                    <Input
                        value={customToken}
                        onChange={(e) => setCustomToken(e.target.value)}
                        placeholder="Paste your token here"
                        className="w-full"
                    />
                </div>
            </ModalDrawer>

            {/* Global CSS for animated gradient keyframes */}
            <style jsx global>{`
                @keyframes gradientAnimation {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }
            `}</style>
        </div>
    )
}