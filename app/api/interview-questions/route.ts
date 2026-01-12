import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  try {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayISO = startOfToday.toISOString();

    const { data: entries } = await supabase
        .from('entries')
        .select('content')
        .eq('user_id', user.id)
        .gte('created_at', startOfTodayISO);

    const context = entries && entries.length > 0 
      ? entries.map(e => e.content).join('\n') 
      : "EMPTY_CONTEXT";

    const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini", 
        messages: [
          { 
            role: 'system', 
            content: `You are an AI interviewer.
            
            LANGUAGE RULE:
            - If CURRENT_CONTEXT is not empty, detect its language and ask questions in THAT SAME language.
            - If CURRENT_CONTEXT is "EMPTY_CONTEXT", ask questions in Russian (or English if you prefer as default).
            
            TASK:
            - Ask 5 brief, grounded questions about the user's day.
            - Focus on emotions and specific details.
            - Return ONLY JSON: {"questions": ["...", "...", "...", "...", "..."]}` 
          },
          { role: 'user', content: `CURRENT_CONTEXT:\n${context}` }
        ],
        response_format: { type: 'json_object' },
      });

    const result = JSON.parse(completion.choices[0].message.content || '{"questions": []}');
    return NextResponse.json(result);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}