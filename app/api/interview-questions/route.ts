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

    const [{ data: entries }, { data: profile }] = await Promise.all([
      supabase.from('entries').select('content').eq('user_id', user.id).gte('created_at', startOfTodayISO),
      supabase.from('profiles').select('full_name, bio, narration_perspective').eq('id', user.id).single(),
    ]);

    const entryList = entries && entries.length > 0 ? entries : [];
    const context = entryList.length > 0
      ? entryList.map(e => e.content).join('\n')
      : "EMPTY_CONTEXT";

    // Determine question count based on day richness
    const noteCount = entryList.length;
    const totalChars = entryList.reduce((sum, e) => sum + e.content.length, 0);
    const avgChars = noteCount > 0 ? totalChars / noteCount : 0;

    let questionCount: number;
    let richnessHint: string;
    if (noteCount === 0) {
      questionCount = 3;
      richnessHint = "The user has no notes today. Ask general open-ended questions about their day.";
    } else if (noteCount <= 2 && avgChars < 150) {
      questionCount = 3;
      richnessHint = "The user has very few short notes. Keep questions concise and simple.";
    } else if (noteCount <= 5) {
      questionCount = 5;
      richnessHint = "The user has a moderate number of notes. Ask targeted questions about specific events and emotions mentioned.";
    } else {
      questionCount = Math.min(10, 6 + Math.floor((noteCount - 6) / 2));
      richnessHint = "The user had a rich, eventful day with many notes. Dig deeper into specific moments, people, decisions, and feelings.";
    }

    const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: 'system',
            content: `You are a thoughtful interviewer helping someone reflect on their day.

USER PROFILE:
${profile?.full_name ? `- Name: ${profile.full_name}` : ""}
${profile?.bio ? `- About: ${profile.bio}` : ""}
${profile?.narration_perspective === 'third' ? `- Narration style: third person (refer to the user by name or as "he/she/they")` : `- Narration style: first person (the user speaks as "I")`}

LANGUAGE RULE:
- Detect the language of CURRENT_CONTEXT and respond in that same language.
- If notes are in multiple languages, use the language that appears most frequently. If equal, use English.
- If CURRENT_CONTEXT is "EMPTY_CONTEXT", default to English.

STYLE RULE:
- Mirror the user's own tone and vocabulary from their notes — if they write casually, ask casually; if they write reflectively, match that.
- Be neutral and direct. Avoid being overly warm, cheerful, or therapist-like.
- Questions should feel like a curious friend asking, not a life coach prompting.

TASK:
- ${richnessHint}
- Generate exactly ${questionCount} questions.
- Mix two types of questions: some grounded in specific details from the notes (names, places, events, decisions), and some broader and open-ended — about the general mood of the day, what stood out, what's on the user's mind, regardless of what was written down.
- Ask about one thing per question. Keep each question short.
- Return ONLY JSON: {"questions": ["...", ...]} with exactly ${questionCount} items.`
          },
          { role: 'user', content: `CURRENT_CONTEXT:\n${context}` }
        ],
        response_format: { type: 'json_object' },
      });

    const result = JSON.parse(completion.choices[0].message.content || '{"questions": []}');
    return NextResponse.json(result);

  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}