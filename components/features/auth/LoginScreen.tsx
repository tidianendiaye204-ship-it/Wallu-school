import React, { useState } from "react";
import { Receipt, User, Key, ArrowRight } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { T } from "../../utils/theme";
import { Field } from "../../common/Field";

export function LoginScreen({ onGoRegister }: { onGoRegister: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError("Email ou mot de passe incorrect.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6" style={{ background: T.ink }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Receipt size={24} style={{ color: T.gold }} />
          <span className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: T.text }}>Wallu School</span>
        </div>
        <div className="rounded-lg p-8 border shadow-2xl" style={{ borderColor: T.inkLine, background: T.inkSoft }}>
          <h2 className="text-xl mb-1" style={{ fontFamily: "'Fraunces', serif", color: T.text, fontWeight: 600 }}>Connexion</h2>
          <p className="text-sm mb-6" style={{ color: T.muted }}>Accédez à votre espace de gestion.</p>
          
          {error && (
            <div className="mb-4 rounded-md px-3 py-2.5 text-xs text-center" style={{ background: "#2D1A1A", color: T.rust, border: `1px solid ${T.rust}` }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field icon={User} label="Adresse email" type="email" placeholder="votre@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
            <Field icon={Key} label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={(e: any) => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading} className="w-full mt-2 rounded-md py-3 text-sm font-medium hover:opacity-90 flex items-center justify-center gap-2 transition-all" style={{ background: T.gold, color: T.ink, opacity: loading ? 0.7 : 1 }}>
              {loading ? <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : "Se connecter"} <ArrowRight size={16} />
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={onGoRegister} className="text-sm hover:underline" style={{ color: T.muted }}>
              Nouvelle école ? <span style={{ color: T.gold }}>Créer mon compte</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
