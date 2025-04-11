import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AccountSummary } from "@/components/account/account-summary"

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Welcome to TradeSync</h2>
                <p className="text-muted-foreground">
                  This is a placeholder for your dashboard content. We'll build up the components step by step.
                </p>
              </div>
              <AccountSummary />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 