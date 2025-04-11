"use client"

import { AppSidebar } from "./app-sidebar"
import { SiteHeader } from "./site-header"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar className="hidden lg:block" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  )
} 