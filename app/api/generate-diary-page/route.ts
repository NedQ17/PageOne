import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST() {
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
    baseURL: "https://openrouter.ai/api/v1" 
  });

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Получаем все записи и ответы на интервью за сегодня
    const [{ data: entries }, { data: interviews }] = await Promise.all([
      supabase.from('entries').select('content').eq('user_id', user.id).gte('created_at', today),
      supabase.from('interview_responses').select('question, answer').eq('user_id', user.id).gte('created_at', today)
    ]);

    // Проверка на наличие данных
    if ((!entries || entries.length === 0) && (!interviews || interviews.length === 0)) {
      return NextResponse.json({ error: 'No data found for today to generate a story.' }, { status: 400 });
    }

    const context = `
      RAW NOTES: ${entries?.map(e => e.content).join('\n')}
      INTERVIEW ANSWERS: ${interviews?.map(i => `Q: ${i.question} A: ${i.answer}`).join('\n')}
    `;

    // 2. AI склеивает данные
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { 
          role: 'system', 
          content: `You are an expert biographer. Combine the user's raw notes and interview answers into a single, cohesive, poetic daily journal page. 
          CRITICAL: Remove duplicate information. 
          Structure: Give it a creative title and a 3-4 paragraph story. 
          Return ONLY JSON: {"title": "...", "content": "..."}` 
        },
        { role: 'user', content: `Analyze and merge this: ${context}` }
      ],
      response_format: { type: 'json_object' }
    });

    const story = JSON.parse(completion.choices[0].message.content || '{}');

    // 3. Сохраняем страницу дневника (upsert)
    const { data: page, error: saveError } = await supabase
      .from('daily_pages')
      .upsert({
        user_id: user.id,
        date: today,
        title: story.title,
        content: story.content,
        word_count: story.content.split(/\s+/).length
      }, { onConflict: 'user_id, date' })
      .select()
      .single();

    if (saveError) throw saveError;

    // 4. ОЧИСТКА: Удаляем вопросы, ответы и заметки
    // Выполняется только если страница успешно сохранилась
    await Promise.all([
      supabase
        .from('interview_responses')
        .delete()
        .eq('user_id', user.id)
        .gte('created_at', today),
      supabase
        .from('entries')
        .delete()
        .eq('user_id', user.id)
        .gte('created_at', today)
    ]);

    return NextResponse.json(page);

  } catch (e: any) {
    console.error("Error in generation flow:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}