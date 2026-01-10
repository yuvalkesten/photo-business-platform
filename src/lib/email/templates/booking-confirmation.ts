import { wrapEmailTemplate } from "@/lib/google/gmail"

export interface BookingConfirmationData {
  clientName: string
  projectName: string
  projectType: string
  totalPrice: number | null
  deposit: number | null
  eventDate: Date | null
  sessions: Array<{
    title: string
    date: Date
    startTime: Date
    location: string | null
  }>
  photographerName: string
  photographerEmail: string
  photographerPhone: string | null
}

export function generateBookingConfirmationEmail(data: BookingConfirmationData): {
  subject: string
  htmlBody: string
  textBody: string
} {
  const {
    clientName,
    projectName,
    projectType,
    totalPrice,
    deposit,
    eventDate,
    sessions,
    photographerName,
    photographerEmail,
    photographerPhone,
  } = data

  const formatCurrency = (amount: number | null) =>
    amount ? `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "TBD"

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

  const subject = `Booking Confirmed: ${projectName}`

  const sessionsHtml = sessions.length > 0
    ? `
      <h2>Scheduled Sessions</h2>
      ${sessions.map((session) => `
        <div class="highlight-box">
          <strong>${session.title}</strong><br>
          ${formatDate(session.date)} at ${formatTime(session.startTime)}<br>
          ${session.location ? `Location: ${session.location}` : "Location TBD"}
        </div>
      `).join("")}
    `
    : ""

  const content = `
    <div class="card">
      <div class="header">
        <h1>Booking Confirmed!</h1>
      </div>

      <div class="content">
        <p>Hi ${clientName},</p>

        <p>Great news! Your ${projectType.toLowerCase().replace("_", " ")} photography session has been confirmed. We're excited to work with you!</p>

        <h2>Project Details</h2>
        <div class="detail-row">
          <span class="detail-label">Project</span>
          <span class="detail-value">${projectName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Type</span>
          <span class="detail-value">${projectType.replace("_", " ")}</span>
        </div>
        ${eventDate ? `
        <div class="detail-row">
          <span class="detail-label">Event Date</span>
          <span class="detail-value">${formatDate(eventDate)}</span>
        </div>
        ` : ""}

        ${totalPrice ? `
        <h2>Investment</h2>
        <div class="highlight-box">
          <div class="price">${formatCurrency(totalPrice)}</div>
          ${deposit ? `<p style="margin: 8px 0 0; color: #666;">Deposit required: ${formatCurrency(deposit)}</p>` : ""}
        </div>
        ` : ""}

        ${sessionsHtml}

        <h2>What's Next?</h2>
        <p>Here's what you can expect:</p>
        <ol>
          <li>We'll reach out to discuss any final details</li>
          <li>You'll receive a reminder before each session</li>
          <li>After the shoot, your photos will be delivered via a private gallery</li>
        </ol>

        <h2>Questions?</h2>
        <p>Feel free to reach out anytime:</p>
        <div class="detail-row">
          <span class="detail-label">Photographer</span>
          <span class="detail-value">${photographerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email</span>
          <span class="detail-value"><a href="mailto:${photographerEmail}">${photographerEmail}</a></span>
        </div>
        ${photographerPhone ? `
        <div class="detail-row">
          <span class="detail-label">Phone</span>
          <span class="detail-value"><a href="tel:${photographerPhone}">${photographerPhone}</a></span>
        </div>
        ` : ""}
      </div>

      <div class="footer">
        <p>Thank you for choosing us for your photography needs!</p>
        <p style="color: #aaa; font-size: 12px;">This is an automated confirmation email.</p>
      </div>
    </div>
  `

  const htmlBody = wrapEmailTemplate(content, `Your ${projectType.toLowerCase()} session with ${photographerName} is confirmed!`)

  // Plain text version
  const textBody = `
Booking Confirmed: ${projectName}

Hi ${clientName},

Great news! Your ${projectType.toLowerCase().replace("_", " ")} photography session has been confirmed.

PROJECT DETAILS
---------------
Project: ${projectName}
Type: ${projectType.replace("_", " ")}
${eventDate ? `Event Date: ${formatDate(eventDate)}` : ""}
${totalPrice ? `Total: ${formatCurrency(totalPrice)}` : ""}
${deposit ? `Deposit: ${formatCurrency(deposit)}` : ""}

${sessions.length > 0 ? `
SCHEDULED SESSIONS
------------------
${sessions.map((s) => `
${s.title}
${formatDate(s.date)} at ${formatTime(s.startTime)}
${s.location ? `Location: ${s.location}` : "Location TBD"}
`).join("\n")}
` : ""}

WHAT'S NEXT?
------------
1. We'll reach out to discuss any final details
2. You'll receive a reminder before each session
3. After the shoot, your photos will be delivered via a private gallery

QUESTIONS?
----------
${photographerName}
Email: ${photographerEmail}
${photographerPhone ? `Phone: ${photographerPhone}` : ""}

Thank you for choosing us for your photography needs!
`.trim()

  return { subject, htmlBody, textBody }
}
