import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  );

  // Проверка авторизации
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 0. Получаем дату от фронтенда
    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];
    
    // Границы дня для поиска заметок
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://openrouter.ai/api/v1" 
    });

    // 1. ПОЛУЧЕНИЕ ДАННЫХ
    const [{ data: entries }, { data: interviews }] = await Promise.all([
      // Заметки берем СТРОГО за выбранный день
      supabase.from('entries')
        .select('content')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      // Интервью берем ВСЕ накопленные (чтобы ничего не забыть)
      supabase.from('interview_responses')
        .select('question, answer')
        .eq('user_id', user.id)
    ]);

    // Проверка: есть ли хоть что-то для работы
    if (!entries?.length && !interviews?.length) {
      return NextResponse.json(
        { error: 'No notes or interview answers found to generate a story.' }, 
        { status: 400 }
      );
    }

    // Формируем контекст: разделяем базу дня и дополнительные детали
    const context = `
      DATE: ${targetDate}
      CORE NOTES OF THE DAY (SAVE THESE AS FOUNDATION):
      ${entries?.map(e => e.content).join('\n')}

      ADDITIONAL EMOTIONAL DETAILS FROM INTERVIEW:
      ${interviews?.map(i => `Q: ${i.question} A: ${i.answer}`).join('\n')}
    `;

    // 2. ГЕНЕРАЦИЯ ЧЕРЕЗ AI
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { 
          role: 'system', 
          content: `You are a professional biographer. 
          Create a poetic, cohesive journal entry based on the user's notes and interview responses.
          The 'CORE NOTES' are the main events, 'INTERVIEW DETAILS' add depth and feelings.
          Structure the output as a title and a story (3-4 paragraphs).
          Return ONLY JSON: {"title": "...", "content": "..."}` 
        },
        { role: 'user', content: context }
      ],
      response_format: { type: 'json_object' }
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) throw new Error("AI returned empty response");
    
    const story = JSON.parse(aiResponse);

    // 3. СОХРАНЕНИЕ В ТАБЛИЦУ DAILY_PAGES
    const { data: page, error: saveError } = await supabase
      .from('daily_pages')
      .upsert({
        user_id: user.id,
        date: targetDate,
        title: story.title,
        content: story.content,
        word_count: story.content.split(/\s+/).length
      }, { onConflict: 'user_id, date' })
      .select().single();

    if (saveError) throw saveError;

    // 4. ОЧИСТКА: Удаляем ТОЛЬКО интервью
    // Entries (заметки) НЕ ТРОГАЕМ по твоему запросу
    await supabase
      .from('interview_responses')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json(page);

  } catch (e: any) {
    console.error("Diary Generation Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}