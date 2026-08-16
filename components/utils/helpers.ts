import { jsPDF, GState } from "jspdf";
import QRCode from "qrcode";

export function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getCurrentAcademicPeriod() {
  const d = new Date();
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month === 7 || month === 8) {
    return `${year}-10-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export function nextPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function formatPeriod(period: string) {
  if (!period) return "";
  const [y, m] = period.split("-").map(Number);
  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  return `${months[m - 1]} ${y}`;
}

export function generateAcademicMonths() {
  const current = new Date();
  let startYear = current.getFullYear();
  // Août (7) et Septembre (8) marquent le début de la NOUVELLE année scolaire
  if (current.getMonth() < 7) startYear--;
  
  const months = [];
  const d = new Date(startYear, 9, 1); // Octobre
  for (let i = 0; i < 10; i++) { // Octobre à Juillet = 10 mois
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    d.setMonth(d.getMonth() + 1);
  }
  return months;
}

export function money(n: number) {
  // Remplace l'espace insécable fin (\u202f ou \u00a0) par un espace normal
  // car jsPDF affiche un slash "/" pour ces caractères spéciaux.
  return n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, ' ') + " F";
}

export function makeReceiptNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${yy}${mm}-${rand}`;
}

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
};

export async function downloadReceiptPDF(r: any, schoolName: string, schoolLogo: string | null = null, schoolStamp: string | null = null) {
  const W = 80; // Largeur du ticket en mm (standard imprimante thermique)
  const extraLines = (r.carried > 0 ? 1 : 0) + (r.manque > 0 ? 1 : 0);
  const H = 200 + extraLines * 8; // Hauteur dynamique plus grande pour logo, QR code, et signature
  
  // Format personnalisé (80mm x Hauteur)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [W, H]
  });

  // Fond et en-tête (ticket noir et blanc/gris)
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, W, 26, "F");

  let logoHeight = 0;
  if (schoolLogo) {
    try {
      const img = await loadImage(schoolLogo);
      // Dimensions de l'image
      const imgRatio = img.width / img.height;
      const drawWidth = 14;
      const drawHeight = 14 / imgRatio;
      doc.addImage(img, 'PNG', W / 2 - drawWidth / 2, 2, drawWidth, drawHeight);
      logoHeight = drawHeight;
    } catch (err) {
      console.warn("Could not load logo", err);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  let currentY = logoHeight > 0 ? logoHeight + 6 : 10;
  doc.text((schoolName || "ÉCOLE").toUpperCase(), W / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text("REÇU DE PAIEMENT", W / 2, currentY, { align: "center" });

  currentY += 4;
  doc.setTextColor(180, 180, 180);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(r.receiptNumber || makeReceiptNumber(), W / 2, currentY, { align: "center" });

  // Corps du reçu
  let ty = currentY + 10;
  
  const infoRow = (y: number, label: string, value: string, align: "left" | "right" = "left") => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    const x = align === "left" ? 6 : W - 6;
    doc.text(label.toUpperCase(), x, y, { align });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(value, x, y + 4, { align });
  };

  infoRow(ty, "Élève", r.student, "left");
  infoRow(ty, "Classe", r.className, "right");
  ty += 12;
  infoRow(ty, "Téléphone", r.phone || "—", "left");
  infoRow(ty, "Paiement", r.method || "ESPÈCES", "right");
  ty += 14;

  // Séparateur
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(6, ty, W - 6, ty);
  ty += 6;

  // Tableau montants
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("DÉSIGNATION", 6, ty);
  doc.text("MONTANT", W - 6, ty, { align: "right" });
  ty += 2;
  doc.line(6, ty, W - 6, ty);
  ty += 5;

  const tableRow = (y: number, label: string, val: string, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 9 : 8);
    doc.setTextColor(50, 50, 50);
    doc.text(label, 6, y);
    
    doc.setTextColor(0, 0, 0);
    doc.text(val, W - 6, y, { align: "right" });
  };

  tableRow(ty, r.kind === "inscription" ? "Frais d'inscription" : (r.nextPeriodLabel || "Mensualité due"), money(r.amountDue));
  ty += 8;
  
  // Highlight background for Montant Reçu
  doc.setFillColor(240, 240, 240);
  doc.rect(4, ty - 5, W - 8, 7, "F");
  tableRow(ty, "Montant reçu", money(r.amountPaid), true);
  ty += 8;

  if (r.carried > 0) {
    tableRow(ty, `Avance reportée`, money(r.carried));
    ty += 6;
  }
  if (r.manque > 0) {
    tableRow(ty, "Solde restant dû", money(r.manque), true);
    ty += 6;
  }

  ty += 2;
  doc.line(6, ty, W - 6, ty);
  ty += 6;

  // Badge statut
  const isOk = r.manque === 0;
  const badgeLabel = isOk ? "PAIEMENT SOLDE" : `SOLDE : ${money(r.manque)}`;
  doc.setFillColor(isOk ? 230 : 255, isOk ? 230 : 230, isOk ? 230 : 230); // Gris clair pour OK, un peu plus foncé pour solde
  doc.rect(10, ty, W - 20, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(isOk ? 50 : 0);
  doc.text(badgeLabel, W / 2, ty + 5.5, { align: "center" });

  // Filigrane "PAYÉ" en arrière-plan si solde = 0
  if (isOk) {
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.1 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(50, 150, 80);
    // On dessine le texte incliné au milieu du ticket
    doc.text("PAYÉ", W / 2, ty - 20, { align: "center", angle: 45 });
    doc.restoreGraphicsState();
  }

  ty += 16;

  // Ligne de signature
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Le Directeur", W - 10, ty, { align: "right" });
  
  if (schoolStamp) {
    try {
      const stampImg = await loadImage(schoolStamp);
      const stampRatio = stampImg.width / stampImg.height;
      const stampWidth = 20; // 20mm width
      const stampHeight = stampWidth / stampRatio;
      // Position just above the signature line, slightly transparent
      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.85 }));
      doc.addImage(stampImg, 'PNG', W - 32, ty + 2, stampWidth, stampHeight);
      doc.restoreGraphicsState();
      ty += Math.max(18, stampHeight + 4);
    } catch (err) {
      console.warn("Could not load stamp", err);
      ty += 18;
    }
  } else {
    ty += 18;
  }
  
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(W - 35, ty - 6, W - 10, ty - 6);

  // QR Code
  try {
    // Determine the base URL dynamically based on where the app is running
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.walluschool.com';
    const qrData = `${baseUrl}/verify/${r.receiptNumber || "N/A"}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 80, color: { dark: '#1A1A1A', light: '#F5F5F5' } });
    doc.addImage(qrDataUrl, 'PNG', W / 2 - 12, ty, 24, 24);
    ty += 28;
  } catch (err) {
    console.warn("Erreur génération QR Code", err);
  }

  // Footer
  doc.setFillColor(245, 245, 245);
  doc.rect(0, ty, W, H - ty, "F");
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(0, ty, W, ty);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text("Wallu School - Reçu généré le", W / 2, ty + 6, { align: "center" });
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  doc.setFont("helvetica", "bold");
  doc.text(dateStr, W / 2, ty + 10, { align: "center" });

  const fileName = `recu-${(r.student || "eleve").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
}

export function allocatePayment(dues: any[], monthlyFee: number, amount: number) {
  let remaining = amount;
  const newDues = dues.map((d) => ({ ...d }));
  const allocations: { period: string; amount: number }[] = [];

  const sorted = [...newDues].sort((a, b) => (a.period < b.period ? -1 : 1));
  for (const due of sorted) {
    if (remaining <= 0) break;
    const owed = due.amountDue - due.amountAllocated;
    if (owed <= 0) continue;
    const alloc = Math.min(remaining, owed);
    due.amountAllocated += alloc;
    allocations.push({ period: due.period, amount: alloc });
    remaining -= alloc;
  }

  let lastPeriod = sorted.length ? sorted[sorted.length - 1].period : getCurrentAcademicPeriod();
  while (remaining > 0 && monthlyFee > 0) {
    lastPeriod = nextPeriod(lastPeriod);
    let due = newDues.find((d) => d.period === lastPeriod);
    const alloc = Math.min(remaining, monthlyFee - (due ? due.amountAllocated : 0));
    
    if (alloc > 0) {
      if (due) due.amountAllocated += alloc;
      else {
        due = { period: lastPeriod, amountDue: monthlyFee, amountAllocated: alloc };
        newDues.push(due);
      }
      allocations.push({ period: lastPeriod, amount: alloc });
      remaining -= alloc;
    } else {
      break; 
    }
  }

  return { newDues, allocations, remaining };
}

export function exportCSV(data: Record<string, any>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map(row => 
      headers.map(field => `"${(row[field] || "").toString().replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
