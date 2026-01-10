import { google } from "googleapis"
import { prisma } from "@/lib/db"

export async function getGmailClient(userId: string) {
  // Get user's Google account with tokens
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  })

  if (!account || !account.access_token) {
    throw new Error("No Google account connected or access token missing")
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          refresh_token: tokens.refresh_token || account.refresh_token,
        },
      })
    }
  })

  return google.gmail({ version: "v1", auth: oauth2Client })
}

export interface SendEmailParams {
  to: string
  subject: string
  htmlBody: string
  textBody?: string
}

function createEmailMessage(params: SendEmailParams, fromEmail: string): string {
  const { to, subject, htmlBody, textBody } = params

  const boundary = "boundary_" + Date.now().toString(16)

  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    textBody || htmlBody.replace(/<[^>]*>/g, ""), // Strip HTML for plain text
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ]

  const message = messageParts.join("\r\n")

  // Base64 URL-safe encoding
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function sendEmail(userId: string, params: SendEmailParams) {
  const gmail = await getGmailClient(userId)

  // Get user's email from their account
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, businessEmail: true, businessName: true, name: true },
  })

  if (!user?.email) {
    throw new Error("User email not found")
  }

  // Use business email if available, otherwise user email
  const fromName = user.businessName || user.name || "PhotoBiz"
  const fromEmail = user.businessEmail || user.email
  const fromHeader = `${fromName} <${fromEmail}>`

  const rawMessage = createEmailMessage(params, fromHeader)

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage,
    },
  })

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  }
}

// Email template helpers
export function wrapEmailTemplate(content: string, previewText?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${previewText ? `<meta name="x-apple-disable-message-reformatting">` : ""}
  <title>Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      padding: 32px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #eee;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      color: #111;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      color: #444;
    }
    .content h2 {
      color: #111;
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .content p {
      margin: 0 0 16px;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-label {
      font-weight: 500;
      color: #666;
      width: 140px;
      flex-shrink: 0;
    }
    .detail-value {
      color: #111;
    }
    .button {
      display: inline-block;
      background: #111;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background: #333;
    }
    .button-secondary {
      background: #f5f5f5;
      color: #111 !important;
      border: 1px solid #ddd;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid #eee;
      margin-top: 24px;
      color: #888;
      font-size: 14px;
    }
    .highlight-box {
      background: #f8f9fa;
      border-left: 4px solid #111;
      padding: 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
    }
    .price {
      font-size: 28px;
      font-weight: 700;
      color: #111;
    }
    ${previewText ? `.preview-text { display: none; max-height: 0; overflow: hidden; }` : ""}
  </style>
</head>
<body>
  ${previewText ? `<div class="preview-text">${previewText}</div>` : ""}
  <div class="container">
    ${content}
  </div>
</body>
</html>
`
}
