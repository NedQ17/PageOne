"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  Sparkles, Coffee, Loader2, RefreshCw, X, ChevronLeft 
} from "lucide-react";

const BASE_QUESTIONS = [
  "What was the highlight of your day?",
  "What challenged you today?",
  "What are you grateful for right now?",
];

export default function InterviewPage() {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [step, setStep] = useState<'menu' | 'asking'>('menu');
  const [activeBlock, setActiveBlock] = useState<'base' | 'ai' | null>(null);
  
  const [baseData, setBaseData] = useState<{q: string, a: string}[]>([]);
  const [aiData, setAiData] = useState<{q: string, a: string}[]>([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tempQuestions, setTempQuestions] = useState<string[]>([]);
  const [tempAnswers, setTempAnswers] = useState<string[]>([]);
  
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Проверка сессии и скрытие загрузки только после готовности данных
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        // Небольшая задержка, чтобы анимация сработала чисто
        setTimeout(() => setIsInitialLoading(false), 100);
      }
    };
    checkUser();
  }, [router]);

  const startBlock = async (type: 'base' | 'ai') => {
    setActiveBlock(type);
    if (type === 'base') {
      setTempQuestions(BASE_QUESTIONS);
      setTempAnswers(new Array(BASE_QUESTIONS.length).fill(""));
      setCurrentIdx(0);
      setStep('asking');
    } else {
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
    }
  };

  const handleNext = (answer: string) => {
    const newAnswers = [...tempAnswers];
    newAnswers[currentIdx] = answer;
    setTempAnswers(newAnswers);

    if (currentIdx < tempQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const finalData = tempQuestions.map((q, i) => ({ q, a: newAnswers[i] }));
      if (activeBlock === 'base') setBaseData(finalData);
      if (activeBlock === 'ai') setAiData(finalData);
      setStep('menu');
    }
  };

  const finalize = async () => {
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const allResponses = [...baseData, ...aiData].map(item => ({
        user_id: user.id,
        question: item.q,
        answer: item.a,
        type: baseData.some(b => b.q === item.q) ? 'base' : 'ai'
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

  // 1. Пустой экран во время инициализации (предотвращает вспышки контента)
  if (isInitialLoading) {
    return <div className="h-full bg-background" />;
  }

  // 2. Режим ответа на вопросы
  if (step === 'asking') return (
    <div className="flex flex-col h-full bg-background animate-question font-sans">
      <div className="flex-1 flex flex-col justify-center px-10 text-center space-y-8">
        <div className="w-14 h-14 bg-muted/50 rounded-2xl mx-auto flex items-center justify-center text-foreground">
          {activeBlock === 'base' ? <Coffee size={24} strokeWidth={1.5}/> : <Sparkles size={24} strokeWidth={1.5}/>}
        </div>
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

  // 3. Главное меню интервью (Плавное появление благодаря animate-question)
  return (
    <div className="flex flex-col h-full bg-background font-sans animate-question">
      <header className="px-8 pt-12 pb-6 flex flex-col gap-6 bg-background z-10">
        <button 
          onClick={() => router.push('/')} 
          className="flex items-center gap-2 text-muted-foreground/40 hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft size={18} />
          <span className="text-[10px] uppercase tracking-widest font-bold">Today</span>
        </button>
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Interview</h1>
          <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest mt-2">Synthesize your day</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-48 space-y-6 touch-pan-y">
        {/* Блок базовых вопросов 
        {baseData.length > 0 ? (
          <div className="bg-muted/20 rounded-[2.5rem] p-8 border border-border/5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 font-sans">Core Reflection</span>
              <button onClick={() => setBaseData([])} className="p-1 text-muted-foreground/20 hover:text-red-500 transition-colors">
                <X size={16}/>
              </button>
            </div>
            <div className="space-y-6">
              {baseData.map((item, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-[10px] text-muted-foreground/40 uppercase font-mono tracking-tight">{item.q}</p>
                  <p className="text-[15px] text-foreground/90 leading-relaxed font-serif">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button 
            onClick={() => startBlock('base')} 
            className="w-full p-8 bg-muted/30 rounded-[2.5rem] text-left border border-border/5 hover:bg-muted/50 transition-all flex flex-col justify-between min-h-[160px] active:scale-[0.98]"
          >
            <Coffee size={24} className="text-muted-foreground/30" />
            <div>
              <h3 className="text-xl font-medium text-foreground font-serif">Base Reflection</h3>
              <p className="text-[11px] text-muted-foreground/40 uppercase tracking-wide mt-1">Core daily questions</p>
            </div>
          </button>
        )}*/}

        {/* Блок ИИ вопросов */}
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
                  <p className="text-[10px] text-muted-foreground/40 uppercase font-mono tracking-tight">{item.q}</p>
                  <p className="text-[15px] text-foreground/90 leading-relaxed font-serif">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button 
            onClick={() => startBlock('ai')} 
            disabled={loadingAi}
            className="w-full p-8 bg-foreground text-background rounded-[2.5rem] text-left hover:opacity-90 transition-all flex flex-col justify-between min-h-[160px] relative overflow-hidden active:scale-[0.98] disabled:opacity-80"
          >
            {loadingAi ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-background/40" size={20} />
                <span className="text-xs uppercase tracking-widest opacity-40">Analyzing notes...</span>
              </div>
            ) : (
              <>
                <Sparkles size={24} className="opacity-30" />
                <div>
                  <h3 className="text-xl font-medium font-serif">AI Insights</h3>
                  <p className="text-[11px] opacity-40 uppercase tracking-wide mt-1">Deep dive into your day</p>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      {/* Кнопка завершения дня */}
      {(baseData.length > 0 || aiData.length > 0) && (
        <div className="fixed bottom-10 left-8 right-8 z-30 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <button 
            onClick={finalize}
            disabled={isSyncing}
            className="w-full bg-foreground text-background py-6 rounded-full font-bold flex items-center justify-center gap-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] active:scale-95 transition-all"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <><RefreshCw size={20} /> Complete Reflection</>}
          </button>
        </div>
      )}
    </div>
  );
}