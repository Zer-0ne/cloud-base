'use client'
import { SessionContext } from "@/providers/session-provider";
import { SessionContextType } from "@/utils/Interfaces";
import { useContext } from "react";

const useSession = (): SessionContextType => {
    const context = useContext(SessionContext);
    if (context === null) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context as SessionContextType;
};

export default useSession