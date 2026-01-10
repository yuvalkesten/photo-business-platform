import { wrapEmailTemplate } from "@/lib/google/gmail"

export interface GalleryReadyData {
  clientName: string
  galleryTitle: string
  projectName: string
  shareUrl: string
  photoCount: number
  expiresAt: Date | null
  allowDownload: boolean
  hasPassword: boolean
  password?: string
  photographerName: string
  photographerEmail: string
}

export function generateGalleryReadyEmail(data: GalleryReadyData): {
  subject: string
  htmlBody: string
  textBody: string
} {
  const {
    clientName,
    galleryTitle,
    projectName,
    shareUrl,
    photoCount,
    expiresAt,
    allowDownload,
    hasPassword,
    password,
    photographerName,
    photographerEmail,
  } = data

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

  const subject = `Your Photos Are Ready: ${galleryTitle}`

  const expirationNotice = expiresAt
    ? `<div class="highlight-box" style="border-left-color: #f59e0b;">
        <strong>Important:</strong> This gallery will expire on ${formatDate(expiresAt)}.
        Please download your photos before then.
       </div>`
    : ""

  const passwordSection = hasPassword && password
    ? `<div class="highlight-box">
        <strong>Gallery Password:</strong><br>
        <code style="font-size: 18px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${password}</code>
       </div>`
    : hasPassword
    ? `<p><em>This gallery is password protected. Use the password you were given.</em></p>`
    : ""

  const downloadNote = allowDownload
    ? `<p>Downloads are enabled for this gallery. You can download individual photos or the entire collection.</p>`
    : `<p><em>Note: Downloads are not enabled for this gallery. Contact me if you need high-resolution files.</em></p>`

  const content = `
    <div class="card">
      <div class="header">
        <h1>Your Photos Are Ready!</h1>
      </div>

      <div class="content">
        <p>Hi ${clientName},</p>

        <p>I'm thrilled to share that your photos from <strong>${projectName}</strong> are ready for viewing!</p>

        <div class="highlight-box" style="text-align: center; padding: 24px;">
          <p style="margin: 0 0 16px; color: #666;">Your private gallery contains</p>
          <div class="price">${photoCount} Photos</div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${shareUrl}" class="button" style="font-size: 16px; padding: 16px 32px;">
            View Your Gallery
          </a>
        </div>

        ${passwordSection}

        ${expirationNotice}

        <h2>Gallery Details</h2>
        <div class="detail-row">
          <span class="detail-label">Gallery</span>
          <span class="detail-value">${galleryTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Project</span>
          <span class="detail-value">${projectName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Photos</span>
          <span class="detail-value">${photoCount}</span>
        </div>
        ${expiresAt ? `
        <div class="detail-row">
          <span class="detail-label">Expires</span>
          <span class="detail-value">${formatDate(expiresAt)}</span>
        </div>
        ` : ""}

        ${downloadNote}

        <h2>Love Your Photos?</h2>
        <p>I'd be so grateful if you could:</p>
        <ul>
          <li>Share your favorites on social media and tag me!</li>
          <li>Leave a review to help others find my work</li>
          <li>Refer friends and family for their photography needs</li>
        </ul>

        <h2>Questions or Need Changes?</h2>
        <p>If you have any questions about your gallery or would like any edits, just reply to this email or reach out:</p>
        <p>
          <strong>${photographerName}</strong><br>
          <a href="mailto:${photographerEmail}">${photographerEmail}</a>
        </p>
      </div>

      <div class="footer">
        <p>Thank you for trusting me with your memories!</p>
        <p style="margin-top: 16px;">
          <a href="${shareUrl}" class="button button-secondary">View Gallery</a>
        </p>
        <p style="color: #aaa; font-size: 12px; margin-top: 16px;">
          Can't click the button? Copy this link: ${shareUrl}
        </p>
      </div>
    </div>
  `

  const htmlBody = wrapEmailTemplate(content, `${photoCount} photos from ${projectName} are ready to view!`)

  // Plain text version
  const textBody = `
Your Photos Are Ready: ${galleryTitle}

Hi ${clientName},

I'm thrilled to share that your photos from ${projectName} are ready for viewing!

YOUR GALLERY
------------
${photoCount} photos are waiting for you.

View your gallery: ${shareUrl}

${hasPassword ? (password ? `Password: ${password}` : "This gallery is password protected.") : ""}

${expiresAt ? `IMPORTANT: This gallery expires on ${formatDate(expiresAt)}. Please download your photos before then.` : ""}

GALLERY DETAILS
---------------
Gallery: ${galleryTitle}
Project: ${projectName}
Photos: ${photoCount}
${expiresAt ? `Expires: ${formatDate(expiresAt)}` : ""}
Downloads: ${allowDownload ? "Enabled" : "Contact me for high-res files"}

LOVE YOUR PHOTOS?
-----------------
- Share on social media and tag me!
- Leave a review
- Refer friends and family

QUESTIONS?
----------
${photographerName}
${photographerEmail}

Thank you for trusting me with your memories!

Gallery Link: ${shareUrl}
`.trim()

  return { subject, htmlBody, textBody }
}
