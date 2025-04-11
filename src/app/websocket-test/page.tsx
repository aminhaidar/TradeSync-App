import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import WebSocketTest from '@/components/WebSocketTest'

export default function WebSocketTestPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">WebSocket Test</h2>
                <p className="text-muted-foreground mb-4">
                  This page is used for testing WebSocket connections and functionality.
                </p>
                <WebSocketTest />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 