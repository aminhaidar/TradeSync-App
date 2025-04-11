import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset } from "@/components/ui/sidebar"

export default function AlertsPage() {
  return (
    <>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Trade Alerts</h2>
                <p className="text-muted-foreground">
                  Your trading alerts will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  )
} 