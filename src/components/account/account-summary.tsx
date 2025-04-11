"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ErrorBoundary } from "@/components/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import * as LucideIcons from "lucide-react"

interface AccountData {
  // Account Summary
  netAccountValue: number;
  dayChange: number;
  dayChangePercent: number;
  openPL: number;
  accountInvested: number;
  
  // Performance
  realizedPLYTD: number;
  realizedPLMTD: number;
  avgTradePL: number;
  beta: number;
  winRate: number;
  
  // Positions
  marketValue: number;
  totalPositions: number;
  equityPositions: number;
  equityValue: number;
  optionsPositions: number;
  optionsValue: number;
  
  // Buying Power
  buyingPower: number;
  cashBalance: number;
  marginUsed: number;
  marginMaintenance: number;
}

// Mock data for testing
const mockData: AccountData = {
  // Account Summary
  netAccountValue: 158327.74,
  dayChange: 3245.61,
  dayChangePercent: 2.12,
  openPL: 6872.63,
  accountInvested: 62.3,
  
  // Performance
  realizedPLYTD: 22450.00,
  realizedPLMTD: 4125.00,
  avgTradePL: 325.00,
  beta: 0.94,
  winRate: 70,
  
  // Positions
  marketValue: 90245.00,
  totalPositions: 12,
  equityPositions: 8,
  equityValue: 53245.00,
  optionsPositions: 4,
  optionsValue: 37000.00,
  
  // Buying Power
  buyingPower: 449613.92,
  cashBalance: 120280.00,
  marginUsed: 18.3,
  marginMaintenance: 85500.00
}

export function AccountSummary() {
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<AccountData>(mockData)
  
  useEffect(() => {
    setMounted(true)
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Helper function to format numbers safely
  const formatNumber = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  // Helper function to format percentages safely
  const formatPercent = (value: number) => {
    return (value ?? 0).toFixed(2)
  }

  // Animated value component for smoother transitions
  function AnimatedNumber({ 
    value, 
    prefix = '', 
    suffix = '', 
    duration = 0.5,
    formatFn = formatNumber,
    className = '' 
  }: { 
    value: number | string | undefined, 
    prefix?: string, 
    suffix?: string, 
    duration?: number,
    formatFn?: (n: number) => string,
    className?: string
  }) {
    const numericValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
    
    if (isNaN(numericValue)) {
      return <span className={cn("tabular-nums", className)}>{prefix}0.00{suffix}</span>;
    }
    
    if (numericValue === 0 && value !== 0 && value !== "0" && value !== "0.00") {
      return <span className={cn("tabular-nums", className)}>{prefix}{formatFn(parseFloat(String(value)))}{suffix}</span>;
    }
    
    const motionValue = useMotionValue(numericValue);
    const [prevValue, setPrevValue] = useState(numericValue);
    
    const formattedValue = useTransform(motionValue, (latest) => {
      return `${prefix}${formatFn(latest)}${suffix}`;
    });
    
    useEffect(() => {
      motionValue.set(numericValue);
      
      if (prevValue !== numericValue) {
        const controls = animate(motionValue, numericValue, { 
          duration,
          ease: "easeOut" 
        });
        
        setPrevValue(numericValue);
        return controls.stop;
      }
    }, [numericValue, motionValue, prevValue, duration]);
    
    return <motion.span className={cn("tabular-nums", className)}>{formattedValue}</motion.span>;
  }

  // Animated percentage component
  function AnimatedPercentage({ 
    value,
    showIcon = true,
    duration = 0.5,
    className = ''
  }: {
    value: number,
    showIcon?: boolean,
    duration?: number, 
    className?: string
  }) {
    const isPositive = value >= 0;
    const Icon = isPositive ? LucideIcons.TrendingUp : LucideIcons.TrendingDown;
    const prefix = isPositive ? '+' : '';
    
    return (
      <span className={cn(
        "flex items-center gap-1",
        isPositive ? "text-green-600" : "text-destructive",
        className
      )}>
        {showIcon && <Icon className="h-4 w-4" />}
        <AnimatedNumber 
          value={value} 
          prefix={prefix} 
          suffix="%" 
          duration={duration}
          formatFn={formatPercent} 
        />
      </span>
    );
  }

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pt-4 px-6 pb-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 mt-2" />
            </CardHeader>
            <CardFooter className="pt-0 pb-4 px-6">
              <Skeleton className="h-4 w-48" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  // Basic card class with consistent border
  const cardClass = "border"
  
  // Badge positioning
  const badgeContainerClass = "absolute right-4 top-4 flex gap-2 z-10"
  
  // Header container to allow relative positioning for badges
  const titleContainerClass = "relative pt-4 px-6"

  return (
    <ErrorBoundary>
      <div 
        className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4"
        role="region"
        aria-label="Account Summary"
      >
        {/* Account Summary Card */}
        <Card className={cardClass}>
          <CardHeader className={`${titleContainerClass} pb-1`}>
            <CardDescription>Account Summary</CardDescription>
            <div className="h-9 relative">
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle 
                  key={`nav-${data.netAccountValue}`}
                  className="text-2xl font-semibold"
                >
                  <div title={`Net Account Value: ${data.netAccountValue}`}>
                    <AnimatedNumber 
                      key={`nav-val-${data.netAccountValue}`}
                      value={data.netAccountValue} 
                      prefix="$" 
                      duration={0.4}
                    />
                  </div>
                </CardTitle>
              )}
            </div>
            <div className={badgeContainerClass}>
              {!isLoading && (
                <Badge 
                  key={`nav-day-${data.dayChangePercent}`}
                  variant="outline" 
                  className={cn(
                    "flex gap-1 transition-colors duration-300",
                    data.dayChangePercent >= 0 ? "text-green-600" : "text-destructive"
                  )}
                >
                  <AnimatedPercentage 
                    value={data.dayChangePercent} 
                    duration={0.4}
                  />
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 pt-0 pb-4 px-6 text-sm">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Day's P&L: <span className={cn(
                      "transition-colors duration-300",
                      data.dayChange >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      <AnimatedNumber 
                        key={`nav-day-${data.dayChange}`}
                        value={Math.abs(data.dayChange)} 
                        prefix={data.dayChange >= 0 ? '+$' : '-$'} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Open P&L: <span className={cn(
                      "transition-colors duration-300",
                      data.openPL >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      <AnimatedNumber 
                        key={`nav-open-${data.openPL}`}
                        value={Math.abs(data.openPL)} 
                        prefix={data.openPL >= 0 ? '+$' : '-$'} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Invested: <span className="text-muted-foreground">
                      <AnimatedNumber 
                        key={`nav-invested-${data.accountInvested}`}
                        value={data.accountInvested} 
                        suffix="%" 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardFooter>
        </Card>

        {/* Performance Card */}
        <Card className={cardClass}>
          <CardHeader className={`${titleContainerClass} pb-1`}>
            <CardDescription>Performance YTD</CardDescription>
            <div className="h-9 relative">
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle 
                  key={`perf-${data.realizedPLYTD}`}
                  className={cn(
                    "text-2xl font-semibold",
                    data.realizedPLYTD >= 0 ? "text-green-600" : "text-destructive"
                  )}
                >
                  <div title={`Realized P&L YTD: ${data.realizedPLYTD}`}>
                    <AnimatedNumber 
                      key={`perf-val-${data.realizedPLYTD}`}
                      value={Math.abs(data.realizedPLYTD)} 
                      prefix={data.realizedPLYTD >= 0 ? '+$' : '-$'} 
                      duration={0.4}
                    />
                  </div>
                </CardTitle>
              )}
            </div>
            <div className={badgeContainerClass}>
              {!isLoading && (
                <Badge 
                  key={`perf-win-${data.winRate}`}
                  variant="outline" 
                  className="hover:bg-primary/20 transition-colors"
                >
                  <AnimatedNumber 
                    value={data.winRate} 
                    prefix="" 
                    suffix="% Win" 
                    duration={0.4}
                  />
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 pt-0 pb-4 px-6 text-sm">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    MTD: <span className={cn(
                      "transition-colors duration-300",
                      data.realizedPLMTD >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      <AnimatedNumber 
                        key={`perf-mtd-${data.realizedPLMTD}`}
                        value={Math.abs(data.realizedPLMTD)} 
                        prefix={data.realizedPLMTD >= 0 ? '+$' : '-$'} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Avg Trade: <span className={cn(
                      "transition-colors duration-300",
                      data.avgTradePL >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      <AnimatedNumber 
                        key={`perf-avg-${data.avgTradePL}`}
                        value={Math.abs(data.avgTradePL)} 
                        prefix={data.avgTradePL >= 0 ? '+$' : '-$'} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Beta: <span className="text-muted-foreground">
                      <AnimatedNumber 
                        key={`perf-beta-${data.beta}`}
                        value={data.beta} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardFooter>
        </Card>

        {/* Positions Card */}
        <Card className={cardClass}>
          <CardHeader className={`${titleContainerClass} pb-1`}>
            <CardDescription>Positions</CardDescription>
            <div className="h-9 relative">
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle 
                  key={`pos-${data.marketValue}`}
                  className="text-2xl font-semibold"
                >
                  <div title={`Market Value: ${data.marketValue}`}>
                    <AnimatedNumber 
                      key={`pos-val-${data.marketValue}`}
                      value={data.marketValue} 
                      prefix="$" 
                      duration={0.4}
                    />
                  </div>
                </CardTitle>
              )}
            </div>
            <div className={badgeContainerClass}>
              {!isLoading && (
                <Badge 
                  key={`pos-invested-${data.accountInvested}`}
                  variant="outline" 
                  className="hover:bg-primary/20 transition-colors"
                >
                  <AnimatedNumber 
                    value={data.accountInvested} 
                    prefix="" 
                    suffix="% Invested" 
                    duration={0.4}
                  />
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 pt-0 pb-4 px-6 text-sm">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Open: <span className="text-muted-foreground">
                      <AnimatedNumber 
                        key={`pos-total-${data.totalPositions}`}
                        value={data.totalPositions} 
                        formatFn={(n) => Math.round(n).toString()}
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Equity: <span className="text-muted-foreground">
                      ({data.equityPositions}) $
                      <AnimatedNumber 
                        key={`pos-equity-${data.equityValue}`}
                        value={data.equityValue} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Options: <span className="text-muted-foreground">
                      ({data.optionsPositions}) $
                      <AnimatedNumber 
                        key={`pos-options-${data.optionsValue}`}
                        value={data.optionsValue} 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardFooter>
        </Card>

        {/* Buying Power Card */}
        <Card className={cardClass}>
          <CardHeader className={`${titleContainerClass} pb-1`}>
            <CardDescription>Buying Power</CardDescription>
            <div className="h-9 relative">
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle 
                  key={`bp-${data.buyingPower}`}
                  className="text-2xl font-semibold"
                >
                  <div title={`Buying power: ${data.buyingPower}`}>
                    <AnimatedNumber 
                      key={`bp-val-${data.buyingPower}`}
                      value={data.buyingPower} 
                      prefix="$" 
                      duration={0.4}
                    />
                  </div>
                </CardTitle>
              )}
            </div>
            <div className={badgeContainerClass}>
              {!isLoading && (
                <Badge 
                  key={`bp-margin-${data.marginUsed}`}
                  variant="outline" 
                  className="hover:bg-primary/20 transition-colors"
                >
                  <AnimatedNumber 
                    value={data.marginUsed} 
                    prefix="" 
                    suffix="% Margin" 
                    duration={0.4}
                  />
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 pt-0 pb-4 px-6 text-sm">
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Cash: <span className="text-muted-foreground">
                      <AnimatedNumber 
                        key={`bp-cash-${data.cashBalance}`}
                        value={data.cashBalance} 
                        prefix="$" 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Margin Used: <span className="text-muted-foreground">
                      <AnimatedNumber 
                        key={`bp-margin-${data.marginUsed}`}
                        value={data.marginUsed} 
                        suffix="%" 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
                <div className="h-6 relative">
                  <div className="line-clamp-1 flex gap-2 font-medium">
                    Maintenance: <span className="text-muted-foreground">
                      <AnimatedNumber 
                        key={`bp-maint-${data.marginMaintenance}`}
                        value={data.marginMaintenance} 
                        prefix="$" 
                        duration={0.4}
                      />
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </ErrorBoundary>
  )
} 