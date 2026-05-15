import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFReportData {
  title: string;
  engineer?: string;
  site?: string;
  period?: string;
  totalWorkers?: number;
  reportDate?: string;
  tableHead: string[][];
  tableBody: any[][];
  tableFooter?: any[];
  notes?: string[];
  filename?: string;
}

export const generateProfessionalPDF = (data: PDFReportData) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let currentY = 15;

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("HINDI ACADEMY", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("CONSTRUCTION DIVISION", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  // Bilingual Title Box
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, currentY, pageWidth - margin * 2, 18, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin * 2 + margin, currentY);
  doc.line(margin, currentY + 18, pageWidth - margin * 2 + margin, currentY + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.title.toUpperCase(), pageWidth / 2, currentY + 11, { align: "center" });
  currentY += 18;

  // --- Info Grid ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const leftLabelX = margin;
  const leftValueX = margin + 35;
  const rightLabelX = pageWidth / 2 + 5;
  const rightValueX = pageWidth / 2 + 45;

  // Row 1
  if (data.engineer || data.site) {
    doc.setFont("helvetica", "bold");
    doc.text(`ENGINEER / SITE:`, leftLabelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.engineer || "-"} / ${data.site || "-"}`, leftValueX, currentY);
  }

  if (data.period) {
    doc.setFont("helvetica", "bold");
    doc.text(`WEEK PERIOD:`, rightLabelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(data.period, rightValueX, currentY);
  }
  currentY += 6;

  // Row 2
  if (data.totalWorkers !== undefined) {
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL WORKERS:`, leftLabelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.totalWorkers} Nos.`, leftValueX, currentY);
  }

  doc.setFont("helvetica", "bold");
  doc.text(`REPORT DATE:`, rightLabelX, currentY);
  doc.setFont("helvetica", "normal");
  const reportDateStr = data.reportDate || new Date().toLocaleDateString("en-GB");
  doc.text(reportDateStr, rightValueX, currentY);
  currentY += 8;

  // --- Table ---
  autoTable(doc, {
    startY: currentY,
    head: data.tableHead,
    body: data.tableBody,
    foot: [data.tableFooter || []],
    margin: { left: margin, right: margin, bottom: 20 },
    theme: "grid",
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineWidth: 0.1
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [50, 50, 50],
      valign: "middle",
      lineWidth: 0.1
    },
    footStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontSize: 8,
      fontStyle: "bold",
      lineWidth: 0.1
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", textColor: [0, 0, 0] }, // Worker Name
      // We will let the other columns distribute automatically based on content
    },
    // Set specific alignment for columns
    didParseCell: (dataCell) => {
      const colIndex = dataCell.column.index;
      const totalCols = dataCell.table.columns.length;

      // Center align all date and duty columns (everything between index 2 and total-2)
      if (colIndex >= 2 && colIndex < totalCols - 1) {
        dataCell.cell.styles.halign = "center";
      }
      // Right align the last column (Amount)
      if (colIndex === totalCols - 1) {
        dataCell.cell.styles.halign = "right";
      }
    },
    didDrawPage: () => {
      // Signature blocks were here
    }
  });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer-generated document. Hindi Academy Construction Division.", pageWidth / 2, (doc as any).lastAutoTable.finalY + 10, { align: "center" });

  return doc;
};

export const shareToWhatsApp = async (doc: jsPDF, filename: string, summaryText: string) => {
  const pdfBlob = doc.output("blob");
  const file = new File([pdfBlob], `${filename}.pdf`, { type: "application/pdf" });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: summaryText,
      });
      return true;
    } catch (error) {
      console.error("Error sharing PDF:", error);
    }
  }

  // Fallback: Just open WhatsApp with summary text
  const encodedText = encodeURIComponent(summaryText + "\n\nDownload the full PDF report below.");
  window.open(`https://wa.me/?text=${encodedText}`, "_blank");
  doc.save(`${filename}.pdf`);
  return false;
};

export const generateWorkerProfilePDF = (worker: any, photoBase64?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let currentY = 20;

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("HINDI ACADEMY", pageWidth / 2, currentY, { align: "center" });
  currentY += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CONSTRUCTION & MANPOWER DIVISION", pageWidth / 2, currentY, { align: "center" });
  currentY += 12;

  // Title Stripe
  doc.setFillColor(31, 41, 55);
  doc.rect(0, currentY, pageWidth, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("OFFICIAL WORKER DEPLOYMENT REGISTRY", pageWidth / 2, currentY + 8, { align: "center" });
  doc.setTextColor(0, 0, 0);
  currentY += 25;

  // --- Photo & QR Section ---
  if (photoBase64) {
    try {
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.rect(pageWidth - margin - 35, currentY - 5, 35, 40); // Photo box
      doc.addImage(photoBase64, "JPEG", pageWidth - margin - 34.5, currentY - 4.5, 34, 39);
    } catch (e) {
      console.error("PDF Image Error:", e);
    }
  }

  // --- Core ID ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(worker.fullname?.toUpperCase() || "NAME NOT SPECIFIED", margin, currentY);
  currentY += 6;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`PROFESSIONAL ${worker.category || "GENERAL"}`, margin, currentY);
  currentY += 12;

  const drawSection = (title: string, y: number) => {
    doc.setFillColor(243, 244, 246);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(title.toUpperCase(), margin + 2, y + 5.5);
    return y + 14;
  };

  const drawField = (label: string, value: string, x: number, y: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(156, 163, 175);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(value || "—", x, y + 5);
  };

  // 1. Identification
  currentY = drawSection("Identification & Authentication", currentY);
  drawField("Worker ID", worker.workerid, margin, currentY);
  drawField("Status", worker.active ? "ACTIVE" : "INACTIVE", margin + 60, currentY);
  drawField("Category", worker.category, margin + 110, currentY);
  currentY += 15;
  drawField("Aadhaar Number", worker.aadhar, margin, currentY);
  drawField("PAN Number", worker.pan_num, margin + 60, currentY);
  drawField("Blood Group", worker.bloodgroup, margin + 110, currentY);
  currentY += 18;

  // 2. Communication
  currentY = drawSection("Communication & Native Contact", currentY);
  drawField("Mobile Number", worker.mobile, margin, currentY);
  drawField("Village", worker.village, margin + 60, currentY);
  drawField("District", worker.district, margin + 110, currentY);
  currentY += 15;
  drawField("State", worker.state, margin, currentY);
  currentY += 18;

  // 3. Family & Nominee
  currentY = drawSection("Family & Legal Nominee", currentY);
  drawField("Marital Status", worker.marital_sts, margin, currentY);
  drawField("Nominee/Parent", worker.nominee_name || worker.parent_name, margin + 60, currentY);
  drawField("Nominee Phone", worker.nominee_phone || worker.parentmob_num, margin + 110, currentY);
  currentY += 18;

  // 4. Employment
  currentY = drawSection("Employment Summary", currentY);
  drawField("Joining Date", worker.date_of_joining, margin, currentY);
  drawField("Relieving Date", worker.date_of_relieving || (worker.active ? "N/A" : "PROCESSED"), margin + 60, currentY);
  drawField("Referred By", worker.referred_by || "DIRECT", margin + 110, currentY);
  currentY += 15;
  drawField("Insurance Status", worker.insurance_status === "Yes" ? "ENROLLED" : "NOT ENROLLED", margin, currentY);
  if (worker.insurance_status === "Yes") {
    drawField("Policy Num", worker.policy_num, margin + 60, currentY);
    drawField("Policy Duration", worker.policy_duration, margin + 110, currentY);
  }
  currentY += 25;

  // --- Verification Seal ---
  const sealY = 240;
  doc.setDrawColor(200);
  doc.line(margin, sealY, pageWidth - margin, sealY);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("CERTIFIED PROFILE REGISTRY DOCUMENT", margin, sealY + 5);
  doc.text("GENERATED VIA INTERNAL WORKFORCE DATABASE", margin, sealY + 10);

  doc.text("AUTHORIZED SEAL / SIGNATURE", pageWidth - margin - 50, sealY + 5);
  doc.setDrawColor(100);
  doc.line(pageWidth - margin - 50, sealY + 20, pageWidth - margin, sealY + 20);

  // Footer
  doc.setFontSize(7);
  doc.text("This is a computer-generated document. Hindi Academy. Valid for internal distribution only.", pageWidth / 2, 285, { align: "center" });

  return doc;
};
