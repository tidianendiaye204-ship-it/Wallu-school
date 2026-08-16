import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    // 1. Vérifier l'authentification (Sécurité)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. Extraire les données du corps de la requête
    const body = await req.json();
    const { schoolName, metrics } = body;

    // Fallback déterministe par défaut
    const defaultFallback = `En bref pour ${schoolName} : 
- ${metrics.activeStudents} élèves actifs, dont ${metrics.unpaidCount} en retard de paiement.
- Total encaissé ce mois : ${metrics.collectedAmount} F sur ${metrics.expectedAmount} F attendus.
- Reste à payer (Salaires) : ${metrics.pendingSalariesCount} membres du personnel.

Action suggérée : Consultez l'onglet Classes pour relancer les élèves en retard.`;

    // 3. Vérifier la clé API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Si l'API n'est pas configurée, renvoyer le fallback immédiatement
      return NextResponse.json({ brief: defaultFallback });
    }

    // 4. Construire le prompt
    const anthropic = new Anthropic({ apiKey });
    
    const prompt = `Tu es l'assistant de gestion (Wallu) d'une école nommée "${schoolName}".
Voici les données du mois en cours :
- Élèves actifs : ${metrics.activeStudents}
- Élèves en retard (impayés) : ${metrics.unpaidCount} (Top 3 retards : ${metrics.topUnpaid.join(', ')})
- Total encaissé : ${metrics.collectedAmount} F
- Total attendu : ${metrics.expectedAmount} F
- Membres du personnel non payés : ${metrics.pendingSalariesCount}

Ta mission : Fournis un brief (Résumé) ultra court, percutant et orienté action pour le directeur.
Contraintes IMPÉRATIVES :
- 3 phrases maximum.
- 2 actions recommandées sous forme de tirets.
- Ton professionnel mais encourageant.
- Ne mentionne pas que tu es une IA. Agis comme un bras droit.`;

    // 5. Appel à Claude
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 250,
      temperature: 0.5,
      system: "Tu es un assistant de direction d'école au Sénégal. Tu es concis, précis et focalisé sur la trésorerie.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const brief = msg.content[0].type === 'text' ? msg.content[0].text : defaultFallback;

    return NextResponse.json({ brief });

  } catch (error) {
    console.error("Erreur lors de l'appel à l'IA:", error);
    // 6. Stratégie de Fallback en cas d'erreur de réseau ou de quota
    return NextResponse.json({ 
      brief: "⚠️ Je n'ai pas pu analyser les données en profondeur pour le moment, mais vos indicateurs globaux sont accessibles ci-dessous. Pensez à relancer les élèves en retard." 
    });
  }
}
