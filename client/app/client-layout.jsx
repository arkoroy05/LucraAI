"use client"

import { ThemeProvider } from "next-themes";
import { Web3Provider } from "@/web3";

export default function ClientLayout({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Web3Provider>
        {children}
      </Web3Provider>
    </ThemeProvider>
  );
}
