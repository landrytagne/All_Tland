"use client";

import * as React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  showSidebar?: boolean;
}

export function MainLayout({ children, showFooter = true, showSidebar = false }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        {showSidebar && <DesktopSidebar />}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      {showFooter && !showSidebar && <Footer />}
      <MobileNav />
    </div>
  );
}
