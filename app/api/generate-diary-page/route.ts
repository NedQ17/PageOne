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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];
    
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://openrouter.ai/api/v1" 
    });

    const [{ data: entries }, { data: interviews }] = await Promise.all([
      supabase.from('entries')
        .select('content')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay),
      supabase.from('interview_responses')
        .select('question, answer')
        .eq('user_id', user.id)
    ]);

    if (!entries?.length && !interviews?.length) {
      return NextResponse.json({ error: 'No data found' }, { status: 400 });
    }

    const context = `
      DATE: ${targetDate}
      USER_NOTES:
      ${entries?.map(e => e.content).join('\n')}

      INTERVIEW_RESPONSES:
      ${interviews?.map(i => `Q: ${i.question} A: ${i.answer}`).join('\n')}
    `;

    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { 
          role: 'system', 
          content: `You are a professional biographer writing a classic prose diary.
          
          STRICT RULES:
          1. LANGUAGE: Match the user's language (Russian if they write in Russian, English if in English).
          2. STYLE: Use prose. Avoid complex metaphors, flowery adjectives, or "biographical" clichés 
          3. NO VERSE: Absolutely forbidden to write in poems, rhymes, or verse. Use standard paragraphs.
          4. CONTENT: Use USER_NOTES as the foundation and INTERVIEW_RESPONSES for emotional depth.
          
          Structure: A compelling title and a story (3-4 paragraphs of text).
          Return ONLY JSON: {"title": "...", "content": "..."}` 
        },
        { role: 'user', content: context }
      ],
      response_format: { type: 'json_object' },
      // Уменьшаем температуру, чтобы модель меньше "фантазировала" и была более сдержанной
      temperature: 0.7 
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) throw new Error("AI returned empty response");
    
    const story = JSON.parse(aiResponse);

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

    await supabase.from('interview_responses').delete().eq('user_id', user.id);

    return NextResponse.json(page);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}