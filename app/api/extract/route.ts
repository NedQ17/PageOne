import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // 1. Создаем клиент Supabase ПЕРВЫМ делом
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 2. Теперь получаем пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 3. Проверяем настройку AI в профиле
  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_extraction_enabled')
    .eq('id', user.id)
    .single();

  if (profile && profile.ai_extraction_enabled === false) {
    return NextResponse.json({ error: "AI Extraction is disabled" }, { status: 403 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { data: entries } = await supabase
      .from('entries')
      .select('id, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: 'No entries to analyze' });
    }

    const entriesText = entries.map((e: any) => e.content).join('\n---\n');

    const systemPrompt = `You are a biographer. Extract key entities from user notes.
    Categories: People, Places, Goals, Values. 
    Return ONLY JSON: {"items": [{"category": "People", "title": "John", "description": "..."}]}`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: entriesText }
      ],
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    const extracted = JSON.parse(content || '{"items": []}');

    if (extracted.items && extracted.items.length > 0) {
      const itemsToInsert = extracted.items.map((item: any) => ({
        category: item.category,
        title: item.title,
        description: item.description,
        user_id: user.id
      }));

      await supabase.from('shell_items').insert(itemsToInsert);
    }

    return NextResponse.json({ success: true, count: extracted.items.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}