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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) { /* Ignore */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) { /* Ignore */ }
        },
      },
    }
  );

  // Используем getUser для надежной проверки сессии
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth error in API:", authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ИНИЦИАЛИЗАЦИЯ ДЛЯ OPENROUTER
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://openrouter.ai/api/v1", // Обязательно для ключей sk-or-v1...
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000", // Для статистики OpenRouter
      "X-Title": "Diary App",
    }
  });

  try {
    const { data: entries, error: entriesError } = await supabase
        .from('entries')
        .select('content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (entriesError) throw entriesError;

    const context = entries && entries.length > 0 
      ? entries.map(e => e.content).join('\n') 
      : "No recent entries found.";

    const completion = await openai.chat.completions.create({
      // Для OpenRouter можно оставить gpt-4o-mini или использовать openai/gpt-4o-mini
      model: "openai/gpt-4o-mini", 
      messages: [
        { 
          role: 'system', 
          content: `You are a professional biographer and reflective coach. 
          Your task is to generate 5 thought-provoking questions for the user's daily interview.
          
          GUIDELINES:
          1. If context is provided, base questions on their emotions, actions, or progress.
          2. If context is "No recent entries found", ask 5 deep universal questions about life and growth.
          3. Return ONLY a JSON object: {"questions": ["q1", "q2", "q3", "q4", "q5"]}` 
        },
        { role: 'user', content: `User context: ${context}` }
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    const result = JSON.parse(content || '{"questions": []}');
    
    // Запасные вопросы на случай сбоя формата
    if (!result.questions || result.questions.length === 0) {
      result.questions = [
        "What made you feel most alive today?",
        "What is one thing you would do differently today?",
        "What are you proud of right now?",
        "What is your main focus for tomorrow?",
        "What did you learn about yourself today?"
      ];
    }

    return NextResponse.json(result);

  } catch (e: any) {
    console.error("API Route Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}