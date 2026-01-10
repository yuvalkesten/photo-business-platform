import { config } from "dotenv"
const result = config({ path: ".env.local" })

console.log("Dotenv loaded:", result.parsed ? "yes" : "no")
console.log("DATABASE_URL present:", process.env.DATABASE_URL ? "yes" : "no")

import { PrismaClient, ContactType, ProjectType, ProjectStatus, LeadTemperature, LostReason, PhotoSessionStatus } from "@prisma/client"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined")
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

async function main() {
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: "yuvalkesten@gmail.com" },
  })

  if (!user) {
    console.error("User not found: yuvalkesten@gmail.com")
    process.exit(1)
  }

  console.log(`Found user: ${user.name || user.email} (${user.id})`)

  // Clear existing data for this user (optional - comment out if you want to keep existing data)
  console.log("Clearing existing data...")
  await prisma.gallery.deleteMany({ where: { userId: user.id } })
  await prisma.photoSession.deleteMany({ where: { project: { userId: user.id } } })
  await prisma.project.deleteMany({ where: { userId: user.id } })
  await prisma.contact.deleteMany({ where: { userId: user.id } })
  await prisma.organization.deleteMany({ where: { userId: user.id } })

  console.log("Creating organizations...")
  // Create organizations
  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        userId: user.id,
        name: "Elegant Events Co.",
        email: "info@elegantevents.com",
        phone: "+1 (555) 123-4567",
        website: "https://elegantevents.com",
        address: "123 Event Plaza, San Francisco, CA 94102",
        notes: "High-end wedding planning company. Refer many couples.",
      },
    }),
    prisma.organization.create({
      data: {
        userId: user.id,
        name: "Bay Area Tech Corp",
        email: "events@bayareatech.com",
        phone: "+1 (555) 987-6543",
        website: "https://bayareatech.com",
        address: "500 Innovation Drive, Palo Alto, CA 94301",
        notes: "Corporate headshots and event photography. Quarterly retainer.",
      },
    }),
    prisma.organization.create({
      data: {
        userId: user.id,
        name: "Golden Gate Venues",
        email: "booking@ggvenues.com",
        phone: "+1 (555) 456-7890",
        address: "Golden Gate Park, San Francisco, CA",
        notes: "Venue partner - they recommend us to their clients.",
      },
    }),
  ])

  console.log("Creating contacts...")
  // Create contacts - mix of leads and clients
  const contacts = await Promise.all([
    // Hot leads
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Sarah",
        lastName: "Mitchell",
        email: "sarah.mitchell@gmail.com",
        phone: "+1 (555) 234-5678",
        type: ContactType.LEAD,
        source: "Instagram",
        notes: "Very engaged, responded quickly to inquiry",
      },
    }),
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Michael",
        lastName: "Chen",
        email: "m.chen@outlook.com",
        phone: "+1 (555) 345-6789",
        type: ContactType.LEAD,
        source: "Referral from Elegant Events",
        organizationId: organizations[0].id,
      },
    }),
    // Warm leads
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Emily",
        lastName: "Rodriguez",
        email: "emily.r@yahoo.com",
        phone: "+1 (555) 456-7891",
        type: ContactType.LEAD,
        source: "Wedding Wire",
        notes: "Budget conscious, comparing photographers",
      },
    }),
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "David",
        lastName: "Thompson",
        email: "dthompson@techstartup.io",
        phone: "+1 (555) 567-8901",
        type: ContactType.LEAD,
        source: "LinkedIn",
        organizationId: organizations[1].id,
      },
    }),
    // Cold lead
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Jennifer",
        lastName: "Park",
        email: "jpark@email.com",
        phone: "+1 (555) 678-9012",
        type: ContactType.LEAD,
        source: "Google Search",
        notes: "Initial inquiry, no response to follow-up",
      },
    }),
    // Existing clients
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Amanda",
        lastName: "Foster",
        email: "amanda.foster@gmail.com",
        phone: "+1 (555) 789-0123",
        type: ContactType.CLIENT,
        source: "The Knot",
        notes: "Wedding completed - very happy with results",
      },
    }),
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "James",
        lastName: "Wilson",
        email: "jwilson@bayareatech.com",
        phone: "+1 (555) 890-1234",
        type: ContactType.CLIENT,
        source: "Corporate referral",
        organizationId: organizations[1].id,
      },
    }),
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Lisa",
        lastName: "Nakamura",
        email: "lisa.nakamura@icloud.com",
        phone: "+1 (555) 901-2345",
        type: ContactType.CLIENT,
        source: "Instagram",
      },
    }),
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Robert",
        lastName: "Garcia",
        email: "rgarcia@gmail.com",
        phone: "+1 (555) 012-3456",
        type: ContactType.CLIENT,
        source: "Referral",
      },
    }),
    // Vendor
    prisma.contact.create({
      data: {
        userId: user.id,
        firstName: "Christina",
        lastName: "Lee",
        email: "christina@elegantevents.com",
        phone: "+1 (555) 111-2222",
        type: ContactType.VENDOR,
        organizationId: organizations[0].id,
        notes: "Event planner - sends referrals regularly",
      },
    }),
  ])

  console.log("Creating projects and leads...")

  const now = new Date()
  const addDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const subtractDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Create leads (INQUIRY and PROPOSAL_SENT)
  const leads = await Promise.all([
    // Hot lead - inquiry
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[0].id,
        name: "Mitchell-Anderson Wedding",
        description: "Intimate garden wedding at Golden Gate Park. 80 guests, full day coverage requested.",
        projectType: ProjectType.WEDDING,
        status: ProjectStatus.INQUIRY,
        source: "Instagram DM",
        leadTemperature: LeadTemperature.HOT,
        budgetMin: 4000,
        budgetMax: 6000,
        eventDate: addDays(120),
        nextFollowUpDate: addDays(1),
        lastContactDate: subtractDays(1),
        expectedCloseDate: addDays(14),
        closeProbability: 85,
        notes: "Engaged couple, very responsive. Love our style. Meeting scheduled for next week.",
      },
    }),
    // Hot lead - proposal sent
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[1].id,
        organizationId: organizations[0].id,
        name: "Chen-Williams Wedding",
        description: "Luxury wedding at Fairmont Hotel. 200 guests, second shooter required.",
        projectType: ProjectType.WEDDING,
        status: ProjectStatus.PROPOSAL_SENT,
        source: "Referral - Elegant Events",
        leadTemperature: LeadTemperature.HOT,
        budgetMin: 8000,
        budgetMax: 12000,
        totalPrice: 9500,
        eventDate: addDays(180),
        nextFollowUpDate: addDays(3),
        lastContactDate: subtractDays(2),
        expectedCloseDate: addDays(7),
        closeProbability: 90,
        notes: "High-value client. Proposal sent, awaiting signature. Very positive feedback so far.",
      },
    }),
    // Warm lead - inquiry
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[2].id,
        name: "Rodriguez Family Portrait",
        description: "Extended family portrait session. 15 family members, outdoor location.",
        projectType: ProjectType.FAMILY,
        status: ProjectStatus.INQUIRY,
        source: "Wedding Wire",
        leadTemperature: LeadTemperature.WARM,
        budgetMin: 400,
        budgetMax: 800,
        eventDate: addDays(45),
        nextFollowUpDate: subtractDays(2), // Overdue!
        lastContactDate: subtractDays(5),
        expectedCloseDate: addDays(21),
        closeProbability: 60,
        notes: "Interested but comparing prices. Need to follow up on our competitive rates.",
      },
    }),
    // Warm lead - proposal sent
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[3].id,
        organizationId: organizations[1].id,
        name: "Bay Area Tech Headshots Q2",
        description: "Corporate headshots for new hires. 25 employees, on-site at their office.",
        projectType: ProjectType.CORPORATE,
        status: ProjectStatus.PROPOSAL_SENT,
        source: "LinkedIn",
        leadTemperature: LeadTemperature.WARM,
        budgetMin: 2000,
        budgetMax: 3000,
        totalPrice: 2500,
        eventDate: addDays(30),
        nextFollowUpDate: addDays(5),
        lastContactDate: subtractDays(3),
        expectedCloseDate: addDays(14),
        closeProbability: 70,
        notes: "Waiting for budget approval from their finance team.",
      },
    }),
    // Cold lead - overdue follow-up
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[4].id,
        name: "Park Engagement Session",
        description: "Engagement photos at Baker Beach.",
        projectType: ProjectType.ENGAGEMENT,
        status: ProjectStatus.INQUIRY,
        source: "Google Search",
        leadTemperature: LeadTemperature.COLD,
        budgetMin: 300,
        budgetMax: 500,
        eventDate: addDays(60),
        nextFollowUpDate: subtractDays(7), // Very overdue!
        lastContactDate: subtractDays(14),
        expectedCloseDate: addDays(30),
        closeProbability: 25,
        notes: "No response to last two emails. May need to mark as lost soon.",
      },
    }),
  ])

  // Create booked and active projects
  const projects = await Promise.all([
    // Booked - upcoming wedding
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[5].id,
        name: "Foster-Martinez Wedding",
        description: "Beach wedding at Half Moon Bay. Full day coverage with engagement session included.",
        projectType: ProjectType.WEDDING,
        status: ProjectStatus.BOOKED,
        source: "The Knot",
        totalPrice: 5500,
        deposit: 1500,
        paidAmount: 1500,
        eventDate: addDays(60),
        bookedAt: subtractDays(30),
        notes: "Contract signed. Engagement session scheduled.",
      },
    }),
    // In Progress - corporate event
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[6].id,
        organizationId: organizations[1].id,
        name: "Tech Corp Annual Conference",
        description: "3-day conference coverage. Keynotes, breakout sessions, networking events.",
        projectType: ProjectType.EVENT,
        status: ProjectStatus.IN_PROGRESS,
        source: "Corporate referral",
        totalPrice: 4500,
        deposit: 2000,
        paidAmount: 2000,
        eventDate: subtractDays(5),
        bookedAt: subtractDays(45),
        notes: "Day 1 and 2 complete. Final day tomorrow.",
      },
    }),
    // Post-production - family session
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[7].id,
        name: "Nakamura Family Session",
        description: "Family portraits at Japanese Tea Garden. Parents + 3 kids.",
        projectType: ProjectType.FAMILY,
        status: ProjectStatus.POST_PRODUCTION,
        source: "Instagram",
        totalPrice: 650,
        deposit: 200,
        paidAmount: 650,
        eventDate: subtractDays(10),
        bookedAt: subtractDays(25),
        notes: "Great session! Editing in progress, client excited to see photos.",
      },
    }),
    // Delivered - newborn session
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[8].id,
        name: "Garcia Newborn Session",
        description: "In-home newborn session. Baby girl, 8 days old.",
        projectType: ProjectType.NEWBORN,
        status: ProjectStatus.DELIVERED,
        source: "Referral",
        totalPrice: 450,
        deposit: 150,
        paidAmount: 450,
        eventDate: subtractDays(21),
        bookedAt: subtractDays(60),
        notes: "Gallery delivered. Client loved the photos!",
      },
    }),
    // Completed - wedding
    prisma.project.create({
      data: {
        userId: user.id,
        contactId: contacts[5].id,
        name: "Foster Engagement Session",
        description: "Engagement photos at Palace of Fine Arts.",
        projectType: ProjectType.ENGAGEMENT,
        status: ProjectStatus.COMPLETED,
        source: "The Knot",
        totalPrice: 500,
        paidAmount: 500,
        eventDate: subtractDays(45),
        bookedAt: subtractDays(60),
        notes: "Part of wedding package. Used some for save-the-dates.",
      },
    }),
  ])

  console.log("Creating photo sessions...")
  // Create photo sessions
  await Promise.all([
    // Upcoming sessions
    prisma.photoSession.create({
      data: {
        projectId: projects[0].id,
        title: "Engagement Session - Foster/Martinez",
        description: "Sunset session at Lands End. Casual attire.",
        scheduledAt: addDays(14),
        startTime: new Date(addDays(14).setHours(17, 0, 0)),
        endTime: new Date(addDays(14).setHours(19, 0, 0)),
        location: "Lands End Trail, San Francisco",
        status: PhotoSessionStatus.SCHEDULED,
        locationNotes: "Golden hour timing. Backup location: Palace of Fine Arts",
      },
    }),
    prisma.photoSession.create({
      data: {
        projectId: projects[0].id,
        title: "Wedding Day - Foster/Martinez",
        description: "Full day wedding coverage",
        scheduledAt: addDays(60),
        startTime: new Date(addDays(60).setHours(10, 0, 0)),
        endTime: new Date(addDays(60).setHours(22, 0, 0)),
        location: "Half Moon Bay Beach",
        status: PhotoSessionStatus.SCHEDULED,
        locationNotes: "Ceremony at 4pm. Getting ready coverage from 10am.",
      },
    }),
    prisma.photoSession.create({
      data: {
        projectId: projects[1].id,
        title: "Conference Day 3",
        description: "Final day - closing keynote and awards",
        scheduledAt: addDays(1),
        startTime: new Date(addDays(1).setHours(8, 0, 0)),
        endTime: new Date(addDays(1).setHours(17, 0, 0)),
        location: "Moscone Center, San Francisco",
        status: PhotoSessionStatus.SCHEDULED,
      },
    }),
    // Completed sessions
    prisma.photoSession.create({
      data: {
        projectId: projects[1].id,
        title: "Conference Day 1",
        scheduledAt: subtractDays(5),
        startTime: new Date(subtractDays(5).setHours(8, 0, 0)),
        endTime: new Date(subtractDays(5).setHours(18, 0, 0)),
        location: "Moscone Center, San Francisco",
        status: PhotoSessionStatus.COMPLETED,
      },
    }),
    prisma.photoSession.create({
      data: {
        projectId: projects[1].id,
        title: "Conference Day 2",
        scheduledAt: subtractDays(4),
        startTime: new Date(subtractDays(4).setHours(8, 0, 0)),
        endTime: new Date(subtractDays(4).setHours(18, 0, 0)),
        location: "Moscone Center, San Francisco",
        status: PhotoSessionStatus.COMPLETED,
      },
    }),
    prisma.photoSession.create({
      data: {
        projectId: projects[2].id,
        title: "Family Portrait Session",
        scheduledAt: subtractDays(10),
        startTime: new Date(subtractDays(10).setHours(9, 0, 0)),
        endTime: new Date(subtractDays(10).setHours(11, 0, 0)),
        location: "Japanese Tea Garden, San Francisco",
        status: PhotoSessionStatus.COMPLETED,
      },
    }),
    prisma.photoSession.create({
      data: {
        projectId: projects[3].id,
        title: "Newborn Session",
        scheduledAt: subtractDays(21),
        startTime: new Date(subtractDays(21).setHours(10, 0, 0)),
        endTime: new Date(subtractDays(21).setHours(13, 0, 0)),
        location: "Client's home - 123 Oak St, SF",
        status: PhotoSessionStatus.COMPLETED,
      },
    }),
    prisma.photoSession.create({
      data: {
        projectId: projects[4].id,
        title: "Engagement Session",
        scheduledAt: subtractDays(45),
        startTime: new Date(subtractDays(45).setHours(16, 0, 0)),
        endTime: new Date(subtractDays(45).setHours(18, 0, 0)),
        location: "Palace of Fine Arts, San Francisco",
        status: PhotoSessionStatus.COMPLETED,
      },
    }),
  ])

  console.log("Creating galleries...")
  // Create galleries - using the actual schema fields
  await Promise.all([
    prisma.gallery.create({
      data: {
        userId: user.id,
        projectId: projects[2].id,
        contactId: contacts[7].id, // Lisa Nakamura
        title: "Nakamura Family Portraits",
        description: "Beautiful family portraits at the Japanese Tea Garden",
        isPublic: false,
        expiresAt: addDays(90),
        allowDownload: true,
      },
    }),
    prisma.gallery.create({
      data: {
        userId: user.id,
        projectId: projects[3].id,
        contactId: contacts[8].id, // Robert Garcia
        title: "Baby Garcia - Newborn Session",
        description: "Precious moments with baby Sofia",
        isPublic: false,
        password: "sofia2025",
        expiresAt: addDays(60),
        allowDownload: true,
      },
    }),
    prisma.gallery.create({
      data: {
        userId: user.id,
        projectId: projects[4].id,
        contactId: contacts[5].id, // Amanda Foster
        title: "Amanda & Josh - Engagement",
        description: "Romantic sunset engagement session at Palace of Fine Arts",
        isPublic: true,
        expiresAt: addDays(30),
        allowDownload: true,
      },
    }),
  ])

  // Create a lost lead for demo
  await prisma.project.create({
    data: {
      userId: user.id,
      contactId: contacts[4].id,
      name: "Kim Anniversary Photos",
      description: "25th wedding anniversary portraits",
      projectType: ProjectType.PORTRAIT,
      status: ProjectStatus.CANCELLED,
      source: "Yelp",
      lostReason: LostReason.BUDGET,
      lostNotes: "Client went with a less expensive photographer. Quoted $400, they found someone for $200.",
      budgetMin: 200,
      budgetMax: 300,
      eventDate: subtractDays(30),
    },
  })

  console.log("\n✅ Mock data created successfully!")
  console.log(`
Summary:
- 3 Organizations
- 10 Contacts (5 leads, 4 clients, 1 vendor)
- 5 Leads (2 HOT, 2 WARM, 1 COLD)
- 5 Active Projects (1 BOOKED, 1 IN_PROGRESS, 1 POST_PRODUCTION, 1 DELIVERED, 1 COMPLETED)
- 1 Lost Lead
- 8 Photo Sessions
- 3 Galleries
  `)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
