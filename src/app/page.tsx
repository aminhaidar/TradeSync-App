import Link from 'next/link'
import { WebSocketTest } from '../components/WebSocketTest'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-bold mb-4">TradeSync</h1>
      <p className="text-xl mb-8 max-w-md">AI-Powered Crowd-Sourced Trading Assistant</p>
      <Link 
        href="/dashboard" 
        className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
      <WebSocketTest />
    </div>
  )
}
