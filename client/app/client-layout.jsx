"use client"

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Web3Provider } from "@/web3";
import { registerServiceWorker } from "@/utils/serviceWorker";

export default function ClientLayout({ children }) {
  // Register service worker on client side
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Web3Provider>
        {children}
      </Web3Provider>
    </ThemeProvider>
  );
}
