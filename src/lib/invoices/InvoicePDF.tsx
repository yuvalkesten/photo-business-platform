import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string | null;
  clientName: string;
  clientEmail: string;
  projectName: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number | null;
  taxRate: number | null;
  total: number;
  amountPaid: number;
  notes: string | null;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    textAlign: "right",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoBlock: {
    flex: 1,
  },
  infoBlockRight: {
    flex: 1,
    textAlign: "right",
  },
  infoText: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 2,
  },
  infoTextBold: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    padding: 12,
    marginBottom: 20,
  },
  dateBlock: {
    flex: 1,
  },
  dateBlockCenter: {
    flex: 1,
    textAlign: "center",
  },
  dateBlockRight: {
    flex: 1,
    textAlign: "right",
  },
  dateLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 8,
  },
  colDescription: {
    flex: 3,
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  colQty: {
    width: 50,
    textAlign: "center",
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  colRate: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  colAmount: {
    width: 80,
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  cellDescription: {
    flex: 3,
    fontSize: 10,
    color: "#374151",
  },
  cellQty: {
    width: 50,
    textAlign: "center",
    fontSize: 10,
    color: "#374151",
  },
  cellRate: {
    width: 80,
    textAlign: "right",
    fontSize: 10,
    color: "#374151",
  },
  cellAmount: {
    width: 80,
    textAlign: "right",
    fontSize: 10,
    color: "#374151",
  },
  totals: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsTable: {
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalsRowBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  totalsValue: {
    fontSize: 10,
    color: "#374151",
  },
  totalsBold: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
  },
  notes: {
    backgroundColor: "#f9fafb",
    padding: 12,
    marginTop: 20,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 10,
    color: "#6b7280",
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const balance = data.total - data.amountPaid;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* From / To */}
        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>From</Text>
            <Text style={styles.infoTextBold}>{data.businessName}</Text>
            <Text style={styles.infoText}>{data.businessEmail}</Text>
            {data.businessPhone && (
              <Text style={styles.infoText}>{data.businessPhone}</Text>
            )}
          </View>
          <View style={styles.infoBlockRight}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.infoTextBold}>{data.clientName}</Text>
            <Text style={styles.infoText}>{data.clientEmail}</Text>
            <Text style={styles.infoText}>{data.projectName}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.dateRow}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Invoice Date</Text>
            <Text style={styles.dateValue}>{data.invoiceDate}</Text>
          </View>
          <View style={styles.dateBlockCenter}>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{data.dueDate}</Text>
          </View>
          <View style={styles.dateBlockRight}>
            <Text style={styles.dateLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.cellDescription}>{item.description}</Text>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellRate}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.cellAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(data.subtotal)}</Text>
            </View>
            {data.tax !== null && data.tax > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Tax ({data.taxRate}%)</Text>
                <Text style={styles.totalsValue}>{formatCurrency(data.tax)}</Text>
              </View>
            )}
            <View style={styles.totalsRowBorder}>
              <Text style={styles.totalsBold}>Total</Text>
              <Text style={styles.totalsBold}>{formatCurrency(data.total)}</Text>
            </View>
            {data.amountPaid > 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Amount Paid</Text>
                  <Text style={styles.totalsValue}>
                    -{formatCurrency(data.amountPaid)}
                  </Text>
                </View>
                <View style={styles.totalsRowBorder}>
                  <Text style={styles.totalsBold}>Balance Due</Text>
                  <Text style={styles.totalsBold}>{formatCurrency(balance)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}
