import React from "react";

export function ReceiptCard({ school, student, className, amountDue, amountPaid, carried, nextPeriodLabel, manque, method, receiptNumber }: any) {
  return (
    <div className="mx-auto" style={{ width: "80mm", background: "#FFFFFF", color: "#000000", fontFamily: "'IBM Plex Mono', monospace", padding: "10mm 5mm", border: "1px dashed #ccc" }}>
      <div className="text-center mb-4">
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
        <p className="mt-2">*** MERCI ***</p>
      </div>
    </div>
  );
}
