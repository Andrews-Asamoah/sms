import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "GHS",
  locale: string = "en-GH",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export function printElementById(elementId: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Create a hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    console.error("Could not access iframe document");
    document.body.removeChild(iframe);
    return;
  }

  // Clone stylesheets from the parent page
  const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((style) => style.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Print Report Card</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #report-card-page {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            margin: 0 !important;
          }
          /* Custom styles to match the report wrapper layout */
          .print-report-wrapper {
            background: white !important;
            padding: 0 !important;
            min-height: 0 !important;
          }
        </style>
      </head>
      <body class="bg-white">
        <div class="print-report-wrapper flex justify-center p-0">
          ${element.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const printWindow = iframe.contentWindow;
  if (printWindow) {
    // Wait for the iframe's stylesheets to load/parse before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Remove the iframe after the print dialog closes
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 600);
  } else {
    document.body.removeChild(iframe);
  }
}

