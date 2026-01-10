"use client"

import Link from "next/link"
import { ContactType, ContactStatus, type Contact, type Organization } from "@prisma/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, Mail, Phone, FolderKanban, ImageIcon } from "lucide-react"

interface ContactCardProps {
  contact: Contact & {
    organization?: Organization | null
    _count?: {
      projects: number
      galleries: number
    }
  }
}

const contactTypeColors: Record<ContactType, string> = {
  LEAD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CLIENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PAST_CLIENT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  COLLABORATOR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SUPPLIER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  REFERRAL_SOURCE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
}

const contactTypeLabels: Record<ContactType, string> = {
  LEAD: "Lead",
  CLIENT: "Client",
  PAST_CLIENT: "Past Client",
  COLLABORATOR: "Collaborator",
  SUPPLIER: "Supplier",
  REFERRAL_SOURCE: "Referral",
}

const contactStatusColors: Record<ContactStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INACTIVE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export function ContactCard({ contact }: ContactCardProps) {
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase()

  return (
    <Link href={`/dashboard/contacts/${contact.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">
                  {contact.firstName} {contact.lastName}
                </h3>
                <Badge variant="secondary" className={contactTypeColors[contact.type]}>
                  {contactTypeLabels[contact.type]}
                </Badge>
              </div>
              {contact.organization && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-3 w-3" />
                  {contact.organization.name}
                  {contact.jobTitle && ` - ${contact.jobTitle}`}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact._count && (
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>{contact._count.projects} projects</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>{contact._count.galleries} galleries</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
