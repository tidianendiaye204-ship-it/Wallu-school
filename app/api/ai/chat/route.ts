import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, schoolName, metrics } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });
    
    // Convert generic messages to Anthropic messages format
    // Anthropic requires the first message to be from a user, so we filter out any initial assistant greetings at the start.
    const validMessages = messages[0]?.role === 'assistant' ? messages.slice(1) : messages;
    
    const anthropicMessages = validMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const systemPrompt = `Tu es Wallu, l'assistant IA intelligent et bras droit du directeur de l'école "${schoolName || 'Wallu School'}".
Ta mission est de répondre à toutes les questions concernant la gestion, la trésorerie, les effectifs et la santé financière de l'école.

Voici les données actuelles de l'école :
- Élèves actifs : ${metrics?.activeStudents || 0}
- Élèves en retard de paiement : ${metrics?.unpaidCount || 0} (Top retards : ${metrics?.topUnpaid?.join(', ') || 'Aucun'})
- Total encaissé : ${metrics?.collectedAmount || 0} FCFA
- Total attendu : ${metrics?.expectedAmount || 0} FCFA
- Taux de recouvrement : ${metrics?.expectedAmount ? Math.round((metrics.collectedAmount / metrics.expectedAmount) * 100) : 0}%
- Membres du personnel non payés : ${metrics?.pendingSalariesCount || 0} ${metrics?.unpaidStaffNames?.length ? `(Noms : ${metrics.unpaidStaffNames.join(', ')})` : ''}

INSTRUCTIONS IMPORTANTES :
1. Réponds de manière précise, professionnelle et toujours orientée vers l'action.
2. Utilise les données fournies ci-dessus pour répondre.
3. SI L'UTILISATEUR TE POSE UNE QUESTION DONT LA RÉPONSE N'EST PAS DANS CES DONNÉES (ou si tu ne sais pas), TU DOIS LUI DIRE EXACTEMENT CECI : "Je n'ai pas cette information pour le moment. Veuillez me contacter au support pour plus d'aide."
4. Ne mentionne pas que tu es un modèle d'IA. Agis comme le bras droit du directeur.`;

    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: anthropicMessages
    });

    const reply = msg.content[0].type === 'text' ? msg.content[0].text : "Je n'ai pas pu générer de réponse.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("Erreur Chat IA:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
