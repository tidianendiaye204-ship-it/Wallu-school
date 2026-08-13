import React from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { CheckCircle, XCircle, Building2, User, Calendar, CreditCard } from 'lucide-react';

export default async function VerifyReceiptPage({ params }: { params: { id: string } }) {
  const receiptNumber = params.id;
  
  // Appeler la fonction RPC (elle est publique grâce à SECURITY DEFINER)
  const { data, error } = await supabase.rpc('verify_receipt', { p_receipt_number: receiptNumber });
  
  const receipt = data;

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="bg-[#242424] p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-red-500/30">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Reçu Introuvable</h1>
          <p className="text-gray-400 text-sm">
            Ce numéro de reçu ({receiptNumber}) n'existe pas dans notre base de données ou n'a pas encore été synchronisé.
          </p>
        </div>
      </div>
    );
  }

  // Format the date
  const paidDate = new Date(receipt.paid_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  
  const formattedAmount = receipt.amount.toLocaleString('fr-FR') + ' F';

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center p-6 text-white font-sans">
      <div className="bg-[#242424] p-8 rounded-2xl shadow-2xl max-w-md w-full border border-green-500/30">
        <div className="text-center mb-6">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-400">Reçu Valide</h1>
          <p className="text-gray-400 text-sm mt-1">Authentifié par Wallu School</p>
        </div>

        <div className="space-y-4 bg-[#1E1E1E] p-4 rounded-xl border border-[#333]">
          <div className="flex items-center justify-between border-b border-[#333] pb-3">
            <div className="flex items-center gap-3 text-gray-400">
              <Building2 size={18} />
              <span className="text-sm">École</span>
            </div>
            <span className="font-semibold text-right">{receipt.school_name}</span>
          </div>
          
          <div className="flex items-center justify-between border-b border-[#333] pb-3">
            <div className="flex items-center gap-3 text-gray-400">
              <User size={18} />
              <span className="text-sm">Élève</span>
            </div>
            <span className="font-semibold text-right">{receipt.student_name}</span>
          </div>

          <div className="flex items-center justify-between border-b border-[#333] pb-3">
            <div className="flex items-center gap-3 text-gray-400">
              <CreditCard size={18} />
              <span className="text-sm">Montant</span>
            </div>
            <span className="font-bold text-[#E5B25D] text-lg text-right">{formattedAmount}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-gray-400">
              <Calendar size={18} />
              <span className="text-sm">Date</span>
            </div>
            <span className="text-sm text-right">{paidDate}</span>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          Reçu N° {receipt.receipt_number}
        </div>
      </div>
    </div>
  );
}
