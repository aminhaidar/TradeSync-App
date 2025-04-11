"use client"

import type * as React from "react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

interface NavSecondaryProps {
  items: {
    title: string
    url: string
    icon: React.ElementType
  }[]
  className?: string
}

export function NavSecondary({ items, className }: NavSecondaryProps) {
  return (
    <SidebarMenu className={className}>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <a href={item.url}>
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
