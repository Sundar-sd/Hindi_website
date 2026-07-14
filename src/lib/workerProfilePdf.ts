import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { WorkerProfile } from "../types";

const getApiOrigin = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith("http")) {
    try {
      return new URL(envUrl).origin;
    } catch {
      // fallback
    }
  }
  return "https://api.codingboss.in";
};
const NGROK_BASE = getApiOrigin();

/**
 * Generates a professional PDF document for a worker profile.
 * Includes all details and the profile image.
 */
export const downloadWorkerProfilePDF = async (worker: WorkerProfile) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let currentY = 15;

  // 1. Image Processing
  let imageData: string | null = null;
  if (worker.profileImage) {
    try {
      const fullUrl = worker.profileImage.startsWith('http')
        ? worker.profileImage
        : `${NGROK_BASE}${worker.profileImage.startsWith('/') ? '' : '/'}${worker.profileImage}`;

      const res = await fetch(fullUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (res.ok) {
        const blob = await res.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.error("Failed to load image for PDF:", e);
    }
  }

  // 2. Banner Header
  doc.setFillColor(31, 41, 55); // Dark Slate
  doc.rect(0, 0, pageWidth, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("WORKFORCE REGISTRY", margin, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL PERSONNEL DEPLOYMENT RECORD — HINDI ACADEMY", margin, 24);

  currentY = 45;

  // 3. Profile Header (Name and Passport Photo)
  const imgWidth = 35;
  const imgHeight = 45;
  const imgX = pageWidth - margin - imgWidth;

  if (imageData) {
    // Add border for image
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(0.5);
    doc.rect(imgX - 1, currentY - 1, imgWidth + 2, imgHeight + 2);
    try {
      doc.addImage(imageData, "JPEG", imgX, currentY, imgWidth, imgHeight);
    } catch (e) {
      console.error("Error adding image to PDF:", e);
      doc.rect(imgX, currentY, imgWidth, imgHeight);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("IMAGE ERROR", imgX + imgWidth / 2, currentY + imgHeight / 2, { align: "center" });
    }
  } else {
    doc.setDrawColor(200, 200, 200);
    doc.rect(imgX, currentY, imgWidth, imgHeight);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("NO PHOTO", imgX + imgWidth / 2, currentY + imgHeight / 2, { align: "center" });
  }

  // Worker ID Badge
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.roundedRect(margin, currentY, 40, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`ID: ${worker.workerid}`, margin + 20, currentY + 5.5, { align: "center" });

  doc.setFontSize(24);
  doc.setTextColor(17, 24, 39); // Gray-900
  doc.text(worker.fullname.toUpperCase(), margin, currentY + 22);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(worker.category.toUpperCase(), margin, currentY + 30);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);
  doc.text(`Current Status: ${worker.status}`, margin, currentY + 36);

  currentY = Math.max(currentY + imgHeight + 15, currentY + 45);

  // Helper for Section Titles
  const addSectionTitle = (title: string, y: number) => {
    doc.setFillColor(243, 244, 246); // Gray-100
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setDrawColor(209, 213, 219); // Gray-300
    doc.line(margin, y, margin, y + 8); // Sidebar accent

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text(title.toUpperCase(), margin + 4, y + 5.5);
    return y + 10;
  };

  // 4. Personal & Identification
  currentY = addSectionTitle("I. Personal Identification & Contact", currentY);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: [
      ["Mobile Number", worker.mobile || "—", "Blood Group", worker.bloodgroup || "—"],
      ["Aadhaar Number", worker.aadhar || "—", "PAN Number", worker.pan_num || "—"]
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      3: { cellWidth: 55 }
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. Address Details
  currentY = addSectionTitle("II. Residence & Native Address", currentY);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: [
      ["Village/Area", worker.village || "—"],
      ["District", worker.district || "—"],
      ["State", worker.state || "—"]
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] } }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 6. Employment Tenures
  currentY = addSectionTitle("III. Employment History & Tenures", currentY);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: [
      ["Date of Joining", worker.date_of_joining || "—", "Relieving Date", worker.date_of_relieving || "NOT APPLICABLE"]
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      3: { cellWidth: 55 }
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 7. Family & Nominee
  currentY = addSectionTitle("IV. Family & Legal Nominee Details", currentY);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: [
      ["Marital Status", worker.marital_sts || "UNMARRIED"],
      ["Nominee Name", worker.nominee_name || worker.parent_name || "—"],
      ["Nominee Contact", worker.nominee_phone || worker.parentmob_num || "—"],
      ["Children Info", worker.children_details || "—"]
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] } }
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 8. Reference & Insurance
  currentY = addSectionTitle("V. Reference & Insurance Verification", currentY);
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    body: [
      ["Referred By", worker.referred_by || "DIRECT WALK-IN", "Insurance Status", worker.insurance_status === 'Yes' ? 'ENROLLED' : 'NOT ENROLLED'],
      ...(worker.insurance_status === 'Yes' ? [
        ["Premium Amount", `₹${worker.profile_premium || "0"}`, "Policy Number", worker.policy_num || "—"],
        ["Life Insured", `₹${worker.life_insured_amount || "0"}`, "Medical Insured", `₹${worker.medical_insured_amount || "0"}`],
        ["Insurance Co.", worker.insurancecompany || "—", "Insurance Date", worker.insurance_date || "—"]
      ] : [])
    ],
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [55, 65, 81] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35, textColor: [107, 114, 128] },
      3: { cellWidth: 55 }
    }
  });

  // 9. Verification Footer
  const finalY = Math.max((doc as any).lastAutoTable.finalY + 25, 260);

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, finalY, margin + 60, finalY);
  doc.line(pageWidth - margin - 60, finalY, pageWidth - margin, finalY);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("WORKER SIGNATURE / THUMB", margin + 30, finalY + 4, { align: "center" });
  doc.text("AUTHORIZED SIGNATORY / SEAL", pageWidth - margin - 30, finalY + 4, { align: "center" });

  doc.text("This is an official computer-generated document. No manual signature required for validation.", pageWidth / 2, 285, { align: "center" });
  doc.text(`Doc ID: ${worker.id} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 290, { align: "center" });

  doc.save(`worker_${worker.workerid}.pdf`);
};
