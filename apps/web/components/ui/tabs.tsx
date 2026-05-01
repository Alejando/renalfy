"use client"

import * as React from "react"
import { Tabs as TabsAPI } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsAPI.Root>,
  React.ComponentPropsWithoutRef<typeof TabsAPI.Root>
>(({ ...props }, ref) => (
  <TabsAPI.Root ref={ref} data-slot="tabs" {...props} />
))
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsAPI.List>,
  React.ComponentPropsWithoutRef<typeof TabsAPI.List>
>(({ className, ...props }, ref) => (
  <TabsAPI.List
    ref={ref}
    data-slot="tabs-list"
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsAPI.Tab>,
  React.ComponentPropsWithoutRef<typeof TabsAPI.Tab>
>(({ className, ...props }, ref) => (
  <TabsAPI.Tab
    ref={ref}
    data-slot="tabs-trigger"
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:bg-background data-selected:text-foreground data-selected:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsAPI.Panel>,
  React.ComponentPropsWithoutRef<typeof TabsAPI.Panel>
>(({ className, ...props }, ref) => (
  <TabsAPI.Panel
    ref={ref}
    data-slot="tabs-content"
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
