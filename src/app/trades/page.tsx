import { Layout } from "@/components/layout"

export default function TradesPage() {
  return (
    <Layout>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Trades</h2>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              New Trade
            </button>
          </div>
          <div className="mt-4">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Symbol
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Entry
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Exit
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      P/L
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle">AAPL</td>
                    <td className="p-4 align-middle">Long</td>
                    <td className="p-4 align-middle">$150.25</td>
                    <td className="p-4 align-middle">$155.75</td>
                    <td className="p-4 align-middle text-green-600">+$550.00</td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Closed
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle">TSLA</td>
                    <td className="p-4 align-middle">Short</td>
                    <td className="p-4 align-middle">$180.50</td>
                    <td className="p-4 align-middle">$175.25</td>
                    <td className="p-4 align-middle text-green-600">+$525.00</td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Closed
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle">MSFT</td>
                    <td className="p-4 align-middle">Long</td>
                    <td className="p-4 align-middle">$280.75</td>
                    <td className="p-4 align-middle">-</td>
                    <td className="p-4 align-middle">-</td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        Open
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 