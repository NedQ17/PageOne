import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }); } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  try {
    // 1. СТРОГИЙ расчет начала дня в формате ISO (00:00:00 по UTC)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTodayISO = startOfToday.toISOString();

    // 2. Получаем заметки ТОЛЬКО созданные после начала сегодняшнего дня
    const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('content, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startOfTodayISO) // Строго отсекаем всё, что было до полуночи
        .order('created_at', { ascending: false });

    if (entriesError) throw entriesError;

    // 3. Получаем историю вопросов для исключения повторов
    const { data: pastInterviews } = await supabase
        .from('interview_responses')
        .select('question')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    const history = pastInterviews?.map(i => i.question).join('\n') || "None";
    
    // Формируем контекст
    const hasEntries = entries && entries.length > 0;
    const context = hasEntries 
      ? entries.map(e => e.content).join('\n') 
      : "EMPTY_NO_NOTES_FOR_TODAY";

    // 4. Запрос к AI с "запретом на галлюцинации"
  const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini", 
        messages: [
          { 
            role: 'system', 
            content: `You are a professional biographer. Your goal is to help the user capture the essence of TODAY.

            STRICT RULES:
            1. If CURRENT_CONTEXT is "EMPTY_NO_NOTES_FOR_TODAY":
              - Ask 5 questions specifically about the PRESENT day.
              - DO NOT ask abstract questions like "What is success".
              - DO NOT assume any activities (no gym, no work, no travel) unless they are in the context.
            
            2. If CURRENT_CONTEXT has data:
              - Base questions ONLY on the topics mentioned. 
              - Ask for more details, emotions, or reflections on those specific events.

            3. FOR ALL CASES:
              - Check "ASKED_HISTORY" and never repeat those questions.
              - Keep questions grounded, brief, and focused on the current 24-hour window.
            
            Return ONLY JSON: {"questions": ["q1", "q2", "q3", "q4", "q5"]}` 
          },
          { 
            role: 'user', 
            content: `ASKED_HISTORY:\n${history}\n\nCURRENT_CONTEXT:\n${context}` 
          }
        ],
        response_format: { type: 'json_object' },
      });

    const result = JSON.parse(completion.choices[0].message.content || '{"questions": []}');
    return NextResponse.json(result);

  } catch (e: any) {
    console.error("API Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}