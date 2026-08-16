import React, { useState } from "react";
import { Receipt, User, Key, School, Phone, MapPin, Users } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { createSchool } from "../../../lib/api";
import { T } from "../../utils/theme";
import { Field } from "../../common/Field";

export function InscriptionScreen({ onGoLogin }: { onGoLogin: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", ecole: "", directeur: "", telephone: "", ville: "", effectif: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const update = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.ecole || !form.directeur || !form.telephone) return;
    setLoading(true);
    setError("");
    
    // 1. Inscription Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }
    
    const user = authData?.user;
    if (!user) {
      setLoading(false);
      setError("Erreur lors de la création du compte.");
      return;
    }

    // Si la confirmation par email est activée sur Supabase, la session est null après le signUp.
    if (!authData.session) {
      setLoading(false);
      setError("Inscription réussie. Veuillez vérifier votre email pour confirmer votre compte avant de continuer.");
      return;
    }

    // 2. Création de l'école et de l'utilisateur
    try {
      await createSchool({ 
        name: form.ecole, 
        directorName: form.directeur, 
        phone: form.telephone, 
        city: form.ville,
        authUserId: user.id
      });
      // La session est mise à jour automatiquement par onAuthStateChange
    } catch (err: any) {
      setLoading(false);
      console.error(err);
      setError(err?.message || "Erreur lors de l'enregistrement de l'école.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-10 overflow-y-auto bg-ink">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Receipt size={24} className="text-gold" />
          <span className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: T.text }}>Wallu School</span>
        </div>
        <div className="rounded-lg p-8 border shadow-2xl border-inkLine bg-inkSoft">
          <h2 className="text-xl mb-1 font-serif text-text font-semibold">Inscrire votre école</h2>
          <p className="text-sm mb-6 text-muted">Créez votre compte pour démarrer la gestion.</p>
          
          {error && (
            <div className="mb-4 rounded-md px-3 py-2.5 text-xs text-center" style={{ background: "#2D1A1A", color: T.rust, border: `1px solid ${T.rust}` }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field icon={User} label="Email" type="email" placeholder="votre@email.com" value={form.email} onChange={update("email")} required />
              <Field icon={Key} label="Mot de passe" type="password" placeholder="••••••••" value={form.password} onChange={update("password")} required />
            </div>
            
            <div style={{ height: "1px", background: T.inkLine, margin: "24px 0" }} />

            <Field icon={School} label="Nom de l'école" placeholder="Ex : Groupe Scolaire Étoile" value={form.ecole} onChange={update("ecole")} required />
            <Field icon={User} label="Nom du directeur" placeholder="Ex : Moussa Diop" value={form.directeur} onChange={update("directeur")} required />
            <div className="grid grid-cols-2 gap-4">
              <Field icon={Phone} label="Téléphone (WhatsApp)" placeholder="77 000 00 00" value={form.telephone} onChange={update("telephone")} required />
              <Field icon={MapPin} label="Ville" placeholder="Dakar" value={form.ville} onChange={update("ville")} />
            </div>
            <Field icon={Users} label="Effectif estimé" type="number" placeholder="Ex : 150" value={form.effectif} onChange={update("effectif")} />
            
            <button type="submit" disabled={loading} className="w-full mt-4 rounded-md py-3 text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 transition-all" style={{ background: T.gold, color: T.ink, opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : "Créer mon école"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={onGoLogin} className="text-sm hover:underline text-muted">
              Déjà inscrit ? <span className="text-gold">Se connecter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
