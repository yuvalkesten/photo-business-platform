/**
 * Other/Miscellaneous Email Test Fixtures
 *
 * Sample emails that should be classified as OTHER.
 * These include newsletters, spam, automated notifications, and unrelated emails.
 */

import { EmailContent } from "../../types";

export interface OtherTestCase {
  name: string;
  email: EmailContent;
  expectedClassification: "OTHER";
}

export const otherEmails: OtherTestCase[] = [
  {
    name: "Newsletter subscription",
    email: {
      messageId: "other-1",
      threadId: null,
      subject: "This Week in Photography: 10 Tips for Better Portraits",
      from: "newsletter@photographyblog.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `Photography Weekly Newsletter

10 Tips for Better Portrait Photography

1. Use natural light whenever possible
2. Get your focus on the eyes
3. Consider your background carefully
...

Read more: https://photographyblog.com/tips

Unsubscribe: https://photographyblog.com/unsubscribe

You're receiving this because you subscribed at photographyblog.com`,
      htmlBody: null,
      snippet: "Photography Weekly Newsletter 10 Tips for Better Portrait Photography...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Promotional marketing email",
    email: {
      messageId: "other-2",
      threadId: null,
      subject: "FLASH SALE: 50% off all camera bags!",
      from: "deals@cameragear.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-09"),
      body: `FLASH SALE! 50% OFF!

Don't miss our biggest sale of the year!

ALL CAMERA BAGS - 50% OFF
Today only!

Shop now: https://cameragear.com/sale

Use code: FLASH50

Hurry - sale ends at midnight!

---
To unsubscribe: https://cameragear.com/unsub`,
      htmlBody: null,
      snippet: "FLASH SALE! 50% OFF! Don't miss our biggest sale of the year!...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Google Calendar notification",
    email: {
      messageId: "other-3",
      threadId: null,
      subject: "Reminder: Team Meeting @ Mon Jan 13, 2026 10am (EST)",
      from: "calendar-notification@google.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-12"),
      body: `Google Calendar

Reminder: Team Meeting

When: Monday January 13, 2026 10:00am - 11:00am (Eastern Time)
Where: Zoom Meeting
Calendar: photographer@studio.com

Join Zoom Meeting: https://zoom.us/j/123456789

More details: https://calendar.google.com/event/abc123`,
      htmlBody: null,
      snippet: "Google Calendar Reminder: Team Meeting...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Social media notification",
    email: {
      messageId: "other-4",
      threadId: null,
      subject: "@johndoe tagged you in a photo on Instagram",
      from: "no-reply@mail.instagram.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `Instagram

johndoe tagged you in a photo.

"Amazing work by @photographer! Best wedding photos ever!"

See the photo: https://instagram.com/p/ABC123

Turn off notifications: https://instagram.com/settings`,
      htmlBody: null,
      snippet: "Instagram johndoe tagged you in a photo...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Password reset request",
    email: {
      messageId: "other-5",
      threadId: null,
      subject: "Reset your password",
      from: "noreply@adobe.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-08"),
      body: `Adobe

Password Reset Request

We received a request to reset your Adobe password.

Click here to reset your password:
https://adobe.com/reset/ABC123

This link expires in 24 hours.

If you didn't request this, please ignore this email.

Adobe Security Team`,
      htmlBody: null,
      snippet: "Adobe Password Reset Request We received a request to reset your Adobe password...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Shipping notification",
    email: {
      messageId: "other-6",
      threadId: null,
      subject: "Your order has shipped!",
      from: "shipping@bhphoto.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-07"),
      body: `B&H Photo Video

Your order has shipped!

Order #: 12345
Ship Date: January 7, 2026
Carrier: UPS Ground
Tracking: 1Z999AA10123456784

Track your package:
https://ups.com/track/1Z999AA10123456784

Estimated delivery: January 10-12, 2026

Thanks for shopping with B&H!`,
      htmlBody: null,
      snippet: "B&H Photo Video Your order has shipped!...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Out of office auto-reply",
    email: {
      messageId: "other-7",
      threadId: "thread-999",
      subject: "Re: Project proposal - Out of Office",
      from: "contact@client.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-06"),
      body: `Hi,

Thank you for your email. I am currently out of the office with limited access to email.

I will be back on January 15, 2026.

For urgent matters, please contact:
John Smith - john@client.com

Best regards,
Auto-Reply`,
      htmlBody: null,
      snippet: "Hi, Thank you for your email. I am currently out of the office...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Spam - lottery winner",
    email: {
      messageId: "other-8",
      threadId: null,
      subject: "CONGRATULATIONS! You've won $1,000,000!!!",
      from: "winner@lotteryprize.xyz",
      to: "photographer@studio.com",
      date: new Date("2026-01-10"),
      body: `CONGRATULATIONS!!!

You have been selected as the winner of $1,000,000 USD!

To claim your prize, send your bank details to:
claimprize@lotteryprize.xyz

ACT NOW! This offer expires in 24 hours!

Lottery Commission International`,
      htmlBody: null,
      snippet: "CONGRATULATIONS!!! You have been selected as the winner of $1,000,000...",
    },
    expectedClassification: "OTHER",
  },
  {
    name: "Personal email from friend",
    email: {
      messageId: "other-9",
      threadId: null,
      subject: "Dinner Saturday?",
      from: "bestfriend@gmail.com",
      to: "photographer@studio.com",
      date: new Date("2026-01-09"),
      body: `Hey!

Are you free for dinner Saturday? It's been forever since we hung out.

That new Italian place downtown looks good. 7pm work for you?

Let me know!
- Alex`,
      htmlBody: null,
      snippet: "Hey! Are you free for dinner Saturday? It's been forever since we hung out...",
    },
    expectedClassification: "OTHER",
  },
];
