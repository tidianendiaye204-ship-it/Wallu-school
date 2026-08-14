import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ReceiptCard({ school, schoolLogo, schoolStamp, student, className, amountDue, amountPaid, carried, nextPeriodLabel, manque, method, receiptNumber }: any) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.walluschool.com';
        const qrData = `${baseUrl}/verify/${receiptNumber || "N/A"}`;
        const url = await QRCode.toDataURL(qrData, { margin: 1, width: 80, color: { dark: '#000000', light: '#FFFFFF' } });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error(err);
      }
    };
    generateQR();
  }, [receiptNumber]);

  return (
    <div className="mx-auto relative" style={{ width: "80mm", background: "#FFFFFF", color: "#000000", fontFamily: "'IBM Plex Mono', monospace", padding: "10mm 5mm", border: "1px dashed #ccc" }}>
      <div className="text-center mb-4 flex flex-col items-center">
        {schoolLogo && <img src={schoolLogo} alt="Logo" className="h-8 mb-2 object-contain" />}
        <h2 className="font-bold text-lg leading-tight uppercase" style={{ fontFamily: "'Fraunces', serif" }}>{school}</h2>
        <p className="text-[10px] uppercase border-b border-black pb-2 mt-1">Reçu de paiement</p>
      </div>
      
      <div className="text-[10px] mb-3 flex justify-between">
        <span>N°: {receiptNumber || "N/A"}</span>
        <span>Date: {new Date().toLocaleDateString("fr-FR")}</span>
      </div>

      <div className="text-[11px] mb-3 border-b border-dotted border-black pb-2">
        <div className="font-bold">ÉLÈVE: {student}</div>
        <div>CLASSE: {className}</div>
      </div>

      <div className="text-[11px] space-y-1 mb-3 border-b border-black pb-2">
        {nextPeriodLabel && <div className="font-bold mb-1">{nextPeriodLabel.toUpperCase()}</div>}
        <div className="flex justify-between"><span>DÛ:</span><span>{amountDue} FCFA</span></div>
        <div className="flex justify-between font-bold text-sm"><span>PAYÉ:</span><span>{amountPaid} FCFA</span></div>
        {carried > 0 && <div className="flex justify-between"><span>REPORT:</span><span>{carried} FCFA</span></div>}
        {manque > 0 && <div className="flex justify-between font-bold"><span>RESTE:</span><span>{manque} FCFA</span></div>}
      </div>

      <div className="text-[9px] text-center mt-4">
        <p>MÉTHODE: {method?.toUpperCase()}</p>
      </div>

      <div className="mt-4 flex justify-between items-end relative h-16">
        <div>
          {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" className="w-16 h-16" />}
        </div>
        <div className="text-right w-24 relative">
          <p className="text-[8px] text-gray-500 mb-6">Le Directeur</p>
          {schoolStamp && <img src={schoolStamp} alt="Tampon" className="absolute bottom-1 right-0 w-16 h-16 object-contain opacity-85" style={{ filter: 'grayscale(100%)' }} />}
          <div className="border-t border-gray-400 w-full mt-8"></div>
        </div>
      </div>

      <div className="mt-2 flex justify-center">
        <p className="text-[9px]">*** MERCI ***</p>
      </div>
    </div>
  );
}
