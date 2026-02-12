"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  Users,
  Building2,
  FolderKanban,
  ImageIcon,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Camera,
  Target,
  Calendar,
  Mail,
  MessageCircle,
  Receipt,
  Search,
  Bell,
  Plus,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Emails", href: "/dashboard/emails", icon: Mail },
  { name: "Messages", href: "/dashboard/messages", icon: MessageCircle },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Organizations", href: "/dashboard/organizations", icon: Building2 },
  { name: "Leads", href: "/dashboard/leads", icon: Target },
  { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { name: "Invoices", href: "/dashboard/invoices", icon: Receipt },
  { name: "Galleries", href: "/dashboard/galleries", icon: ImageIcon },
]

function NavLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-white/12 text-white"
          : "text-white/70 hover:bg-white/8 hover:text-white"
      )}
    >
      <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-white/50")} />
      {children}
    </Link>
  )
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-white/8 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-white">
          <Camera className="h-6 w-6" />
          <span>PhotoBiz</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              href={item.href}
              icon={item.icon}
              onClick={onNavClick}
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* Settings at bottom */}
      <div className="border-t border-white/8 p-3">
        <NavLink href="/dashboard/settings" icon={Settings} onClick={onNavClick}>
          Settings
        </NavLink>
      </div>
    </div>
  )
}

function UserMenu() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="hidden md:inline-block max-w-[150px] truncate">
            {user?.name || user?.email}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 md:block">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4">
          {/* Mobile Menu Button */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-none">
              <SidebarContent onNavClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Mobile Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold md:hidden">
            <Camera className="h-6 w-6" />
            <span>PhotoBiz</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 rounded-full bg-secondary border-none h-9"
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* + New Button */}
            <Button size="sm" asChild>
              <Link href="/dashboard/projects/new">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Link>
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>

            {/* User Menu */}
            <UserMenu />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-white">
          {children}
        </main>
      </div>
    </div>
  )
}
