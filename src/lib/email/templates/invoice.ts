interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceEmailData {
  invoice: {
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    subtotal: number;
    tax: number | null;
    taxRate: number | null;
    total: number;
    amountPaid: number;
    lineItems: LineItem[];
    notes: string | null;
  };
  businessName: string;
  businessEmail: string;
  businessPhone: string | null;
  contactName: string;
  projectName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function generateInvoiceEmailHtml(data: InvoiceEmailData): string {
  const { invoice, businessName, businessEmail, businessPhone, contactName, projectName } = data;
  const balance = invoice.total - invoice.amountPaid;

  const lineItemsHtml = invoice.lineItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.amount)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1f2937; padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">INVOICE</h1>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">${invoice.invoiceNumber}</p>
            </td>
          </tr>

          <!-- Business Info -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="vertical-align: top; width: 50%;">
                    <p style="margin: 0 0 4px; font-weight: 600; color: #374151;">From</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${businessName}<br>
                      ${businessEmail}${businessPhone ? `<br>${businessPhone}` : ""}
                    </p>
                  </td>
                  <td style="vertical-align: top; width: 50%; text-align: right;">
                    <p style="margin: 0 0 4px; font-weight: 600; color: #374151;">Bill To</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${contactName}<br>
                      ${projectName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dates -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                <tr>
                  <td style="padding: 8px 16px;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Invoice Date</p>
                    <p style="margin: 4px 0 0; color: #374151; font-weight: 500;">${formatDate(invoice.invoiceDate)}</p>
                  </td>
                  <td style="padding: 8px 16px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Due Date</p>
                    <p style="margin: 4px 0 0; color: #374151; font-weight: 500;">${formatDate(invoice.dueDate)}</p>
                  </td>
                  <td style="padding: 8px 16px; text-align: right;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Balance Due</p>
                    <p style="margin: 4px 0 0; color: #1f2937; font-weight: 700; font-size: 18px;">${formatCurrency(balance)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Line Items -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Description</th>
                    <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Rate</th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="width: 60%;"></td>
                  <td style="width: 40%;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
                        <td style="padding: 8px 0; text-align: right; color: #374151;">${formatCurrency(invoice.subtotal)}</td>
                      </tr>
                      ${
                        invoice.tax
                          ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Tax (${invoice.taxRate}%)</td>
                        <td style="padding: 8px 0; text-align: right; color: #374151;">${formatCurrency(invoice.tax)}</td>
                      </tr>
                      `
                          : ""
                      }
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding: 12px 0 8px; color: #1f2937; font-weight: 600;">Total</td>
                        <td style="padding: 12px 0 8px; text-align: right; color: #1f2937; font-weight: 600;">${formatCurrency(invoice.total)}</td>
                      </tr>
                      ${
                        invoice.amountPaid > 0
                          ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280;">Amount Paid</td>
                        <td style="padding: 8px 0; text-align: right; color: #059669;">-${formatCurrency(invoice.amountPaid)}</td>
                      </tr>
                      <tr style="background-color: #fef3c7; margin-top: 8px;">
                        <td style="padding: 12px 8px; color: #92400e; font-weight: 700;">Balance Due</td>
                        <td style="padding: 12px 8px; text-align: right; color: #92400e; font-weight: 700;">${formatCurrency(balance)}</td>
                      </tr>
                      `
                          : ""
                      }
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            invoice.notes
              ? `
          <!-- Notes -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                <p style="margin: 0 0 8px; font-weight: 600; color: #374151; font-size: 14px;">Notes</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px; white-space: pre-wrap;">${invoice.notes}</p>
              </div>
            </td>
          </tr>
          `
              : ""
          }

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Thank you for your business!
              </p>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">
                Questions? Contact us at ${businessEmail}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
