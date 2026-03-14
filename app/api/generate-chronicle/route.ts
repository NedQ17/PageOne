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
    const { date_from, date_to, detail_level = 'brief', length_level = 'medium' } = await req.json();

    if (!date_from || !date_to) {
      return NextResponse.json({ error: 'date_from and date_to are required' }, { status: 400 });
    }

    const [{ data: entries }, { data: diaryPages }, { data: profile }] = await Promise.all([
      supabase.from('entries')
        .select('content, created_at')
        .eq('user_id', user.id)
        .gte('created_at', `${date_from}T00:00:00.000Z`)
        .lte('created_at', `${date_to}T23:59:59.999Z`)
        .order('created_at', { ascending: true }),
      supabase.from('daily_pages')
        .select('title, content, date')
        .eq('user_id', user.id)
        .gte('date', date_from)
        .lte('date', date_to)
        .order('date', { ascending: true }),
      supabase.from('profiles').select('full_name, bio, narration_perspective').eq('id', user.id).single(),
    ]);

    if (!entries?.length && !diaryPages?.length) {
      return NextResponse.json({ error: 'No data found for this period' }, { status: 400 });
    }

    const paragraphCount =
      length_level === 'short' ? '2-3' :
      length_level === 'long'  ? '6-8' : '4-5';

    const detailInstruction =
      detail_level === 'detailed'
        ? 'Include emotional nuances, context, inner states, and specific details.'
        : 'Focus only on the key events and main themes. Keep it concise.';

    const perspective = profile?.narration_perspective === 'third' ? 'third' : 'first';
    const profileBlock = [
      profile?.full_name ? `Name: ${profile.full_name}` : '',
      profile?.bio ? `About: ${profile.bio}` : '',
      `Narration: ${perspective === 'third' ? `third person (write about the person by name or as "he/she", not as "I")` : 'first person (write as "I", in the voice of the person)'}`,
    ].filter(Boolean).join('\n');

    const context = `
${profileBlock ? `USER PROFILE:\n${profileBlock}\n` : ''}PERIOD: ${date_from} — ${date_to}

RAW NOTES (${entries?.length ?? 0} entries):
${entries?.map(e => `[${e.created_at.slice(0, 10)}] ${e.content}`).join('\n') ?? 'None'}

DIARY PAGES (${diaryPages?.length ?? 0} synthesized days):
${diaryPages?.map(p => `[${p.date}] ${p.title}\n${p.content}`).join('\n\n') ?? 'None'}
    `.trim();

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    });

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a biographer writing a life chronicle — a narrative summary of a period in someone's life.

RULES:
1. LANGUAGE: Detect the language the user writes in and respond in that same language. If notes are in multiple languages, use the language that appears most frequently. If equal, use English. If no language can be detected, default to English.
2. STYLE: Clear, literary prose. No lists, no headers, no verse.
3. LENGTH: Write exactly ${paragraphCount} paragraphs.
4. DETAIL: ${detailInstruction}
5. FOCUS: Key events, turning points, recurring themes, emotional arc of the period.
6. Give the chronicle an evocative title that captures the essence of this period.

Return ONLY valid JSON: {"title": "...", "content": "paragraph1\\n\\nparagraph2\\n\\n..."}`,
        },
        { role: 'user', content: context },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.75,
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) throw new Error('AI returned empty response');

    const story = JSON.parse(aiResponse);

    const { data: chronicle, error: saveError } = await supabase
      .from('chronicles')
      .insert({
        user_id: user.id,
        date_from,
        date_to,
        title: story.title,
        content: story.content,
        word_count: story.content.split(/\s+/).length,
        detail_level,
        length_level,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json(chronicle);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
