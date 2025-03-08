'use client'
import DashboardPage from "@/components/home-page";
import WelcomePage from "@/components/welcome-page";
import { getCookie as get_cookies } from "@/utils/fetch-from-api";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    (async () => {
      const token = await get_cookies('token');
      if (token) {
        setIsAuthenticated(true);
      }
    })();
  })
  return (
    // <DashboardPage />
    <>
      {
        isAuthenticated ? <DashboardPage /> : <WelcomePage />
      }
      {/* <button onClick={openPopup} className="bg-[red] w-full">k</button> */}
      {/* <WelcomePage /> */}
    </>
  );
}
