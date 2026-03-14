"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, RefreshCw, X
} from "lucide-react";

export default function InterviewPage() {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [step, setStep] = useState<'menu' | 'asking'>('menu');
  const [aiData, setAiData] = useState<{q: string, a: string}[]>([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tempQuestions, setTempQuestions] = useState<string[]>([]);
  const [tempAnswers, setTempAnswers] = useState<string[]>([]);
  
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setIsInitialLoading(false);
    });
  }, [router]);

  const startBlock = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/interview-questions');
      const data = await res.json();
      const questionsArray = data.questions || [];
      if (questionsArray.length > 0) {
        setTempQuestions(questionsArray);
        setTempAnswers(new Array(questionsArray.length).fill(""));
        setCurrentIdx(0);
        setStep('asking');
      } else {
        alert("AI couldn't generate questions. Try writing more in Today.");
      }
    } catch (e) {
      alert("Failed to load AI questions");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleNext = (answer: string) => {
    const newAnswers = [...tempAnswers];
    newAnswers[currentIdx] = answer;
    setTempAnswers(newAnswers);

    if (currentIdx < tempQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setAiData(tempQuestions.map((q, i) => ({ q, a: newAnswers[i] })));
      setStep('menu');
    }
  };

  const finalize = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const allResponses = aiData.map(item => ({
        user_id: user.id,
        question: item.q,
        answer: item.a,
        type: 'ai',
      }));

      const { error } = await supabase.from('interview_responses').insert(allResponses);
      if (error) throw error;
      
      router.push('/');
    } catch (e) {
      alert("Error saving responses");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isInitialLoading) return <div className="h-full bg-background" />;

  if (step === 'asking') return (
    <div className="flex flex-col h-full bg-background animate-question font-sans">
      <div className="flex justify-end px-6 pt-12">
        <button
          onClick={() => setStep('menu')}
          className="p-2 text-muted-foreground/30 hover:text-foreground transition-colors"
        >
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center px-10 pt-16 text-center space-y-8">
        <h2 className="text-2xl font-serif font-medium leading-tight text-foreground px-2">
          {tempQuestions[currentIdx]}
        </h2>
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-bold">
          Step {currentIdx + 1} of {tempQuestions.length}
        </p>
      </div>

      <div className="px-6 pb-12 pt-4">
        <textarea 
          autoFocus
          className="w-full bg-muted/30 rounded-[2rem] p-8 text-lg outline-none resize-none h-48 mb-6 text-foreground font-serif placeholder:text-muted-foreground/20 border border-border/5 focus:bg-muted/50 transition-all"
          placeholder="Type your reflection..."
          value={tempAnswers[currentIdx]}
          onChange={(e) => {
            const n = [...tempAnswers];
            n[currentIdx] = e.target.value;
            setTempAnswers(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (tempAnswers[currentIdx].trim()) handleNext(tempAnswers[currentIdx]);
            }
          }}
        />
        <button 
          onClick={() => handleNext(tempAnswers[currentIdx])}
          disabled={!tempAnswers[currentIdx].trim()}
          className="w-full bg-foreground text-background py-5 rounded-full font-bold active:scale-[0.98] transition-all disabled:opacity-10"
        >
          {currentIdx < tempQuestions.length - 1 ? "Continue" : "Finish Block"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-background font-sans animate-question overflow-hidden">
      <header className="px-8 pt-12 pb-6 bg-background z-20 flex-shrink-0">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Interview</h1>
        <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest mt-2">Synthesize your day</p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 pb-48 space-y-6 touch-pan-y no-scrollbar">
        {aiData.length > 0 ? (
          <div className="bg-muted/20 rounded-[2.5rem] p-8 border border-border/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 font-sans">AI Insights</span>
              <button onClick={() => setAiData([])} className="p-1 text-muted-foreground/20 hover:text-red-500 transition-colors">
                <X size={16}/>
              </button>
            </div>
            <div className="space-y-6">
              {aiData.map((item, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-[10px] text-muted-foreground/40 uppercase font-mono tracking-tight leading-tight">{item.q}</p>
                  {editingIdx === i ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-muted/40 rounded-2xl px-4 py-3 text-[16px] font-serif text-foreground/90 leading-relaxed outline-none resize-none focus:ring-1 focus:ring-foreground/10 min-h-[80px]"
                        onInput={(e) => {
                          const t = e.currentTarget;
                          t.style.height = "auto";
                          t.style.height = t.scrollHeight + "px";
                        }}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingIdx(null)}
                          className="text-[10px] uppercase tracking-widest px-3 py-1.5 text-muted-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!editingText.trim()) return;
                            const updated = [...aiData];
                            updated[i] = { ...updated[i], a: editingText.trim() };
                            setAiData(updated);
                            setEditingIdx(null);
                          }}
                          className="text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 bg-foreground text-background rounded-full"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className="text-[16px] text-foreground/90 leading-relaxed font-serif cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => { setEditingIdx(i); setEditingText(item.a); }}
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={startBlock}
            disabled={loadingAi}
            className="w-full p-8 bg-foreground text-background rounded-[2.5rem] text-left hover:opacity-90 transition-all flex flex-col justify-between min-h-[160px] relative overflow-hidden active:scale-[0.98] disabled:opacity-80 flex-shrink-0"
          >
            {loadingAi ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-background/40" size={20} />
                <span className="text-xs uppercase tracking-widest opacity-40">Analyzing notes...</span>
              </div>
            ) : (
              <>
                <Sparkles size={24} className="opacity-30" />
                <div className="mt-8">
                  <h3 className="text-xl font-medium font-serif">AI Insights</h3>
                  <p className="text-[11px] opacity-40 uppercase tracking-wide mt-1">Deep dive into your day</p>
                </div>
              </>
            )}
          </button>
        )}

        {/* How it works */}
        <div className="pt-2 pb-4 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/25">How it works</p>
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="text-[10px] font-mono text-muted-foreground/20 pt-0.5 flex-shrink-0">01</span>
              <p className="text-[13px] text-muted-foreground/40 leading-relaxed font-serif">
                AI reads your notes from today and generates 5 questions tailored specifically to what you wrote — your events, emotions, and details.
              </p>
            </div>
            <div className="flex gap-4">
              <span className="text-[10px] font-mono text-muted-foreground/20 pt-0.5 flex-shrink-0">02</span>
              <p className="text-[13px] text-muted-foreground/40 leading-relaxed font-serif">
                Answer each question in your own words. There are no right or wrong answers — just your honest reflection on the day.
              </p>
            </div>
            <div className="flex gap-4">
              <span className="text-[10px] font-mono text-muted-foreground/20 pt-0.5 flex-shrink-0">03</span>
              <p className="text-[13px] text-muted-foreground/40 leading-relaxed font-serif">
                When you tap Complete Reflection, your answers are saved. They become the source material for generating your diary page — a personal narrative of the day written in your voice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {aiData.length > 0 && (
        <div className="shrink-0 px-8 pb-10 pt-4 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0 z-30">
          <button 
            onClick={finalize}
            disabled={isSyncing}
            className="w-full bg-foreground text-background py-6 rounded-full font-bold flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95 transition-all"
          >
            {isSyncing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <RefreshCw size={20} />
                <span>Complete Reflection</span>
              </>
            )}
          </button>
          
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      )}
    </div>
  );
}