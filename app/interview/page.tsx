"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, Coffee, Check, ArrowLeft, 
  Loader2, Save, RefreshCw, X 
} from "lucide-react";

const BASE_QUESTIONS = [
  "What was the highlight of your day?",
  "What challenged you today?",
  "What are you grateful for right now?",
];

export default function InterviewPage() {
  const [step, setStep] = useState<'menu' | 'asking'>('menu');
  const [activeBlock, setActiveBlock] = useState<'base' | 'ai' | null>(null);
  
  const [baseData, setBaseData] = useState<{q: string, a: string}[]>([]);
  const [aiData, setAiData] = useState<{q: string, a: string}[]>([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [tempQuestions, setTempQuestions] = useState<string[]>([]);
  const [tempAnswers, setTempAnswers] = useState<string[]>([]);
  
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
        
        // Извлекаем массив из ключа 'questions'
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
      
      window.location.href = '/'; 
    } catch (e) {
      alert("Error saving responses");
    } finally {
      setIsSyncing(false);
    }
  };

  if (step === 'asking') return (
    <div className="flex flex-col h-full bg-background animate-in slide-in-from-bottom duration-500">
      <div className="flex-1 flex flex-col justify-center px-10 text-center space-y-8">
        <div className="w-12 h-12 bg-muted rounded-full mx-auto flex items-center justify-center">
          {activeBlock === 'base' ? <Coffee size={20}/> : <Sparkles size={20}/>}
        </div>
        <h2 className="text-2xl font-serif font-medium leading-tight text-foreground">
          {tempQuestions[currentIdx]}
        </h2>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Question {currentIdx + 1} of {tempQuestions.length}
        </p>
      </div>
      <div className="p-8 pb-12">
        <textarea 
          autoFocus
          className="w-full bg-muted rounded-[2.5rem] p-8 text-lg outline-none resize-none h-40 mb-4 text-foreground shadow-inner"
          placeholder="Your reflection..."
          value={tempAnswers[currentIdx]}
          onChange={(e) => {
            const n = [...tempAnswers];
            n[currentIdx] = e.target.value;
            setTempAnswers(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleNext(tempAnswers[currentIdx]);
            }
          }}
        />
        <button 
          onClick={() => handleNext(tempAnswers[currentIdx])}
          className="w-full bg-foreground text-background py-5 rounded-full font-bold active:scale-[0.98] transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background px-8 pt-20 pb-32 overflow-y-auto no-scrollbar">
      <header className="mb-12">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Interview</h1>
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-2">Finalize your day</p>
      </header>

      <div className="space-y-6">
        {/* BASE BLOCK */}
        {baseData.length > 0 ? (
          <div className="bg-muted/30 rounded-[2.5rem] p-8 animate-in fade-in zoom-in duration-300 border border-border/10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Base Reflection</span>
              <button onClick={() => setBaseData([])} className="text-muted-foreground/40 hover:text-foreground"><X size={16}/></button>
            </div>
            <div className="space-y-4">
              {baseData.map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[9px] text-muted-foreground/60 uppercase">{item.q}</p>
                  <p className="text-sm text-foreground border-b border-border/10 pb-2">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button onClick={() => startBlock('base')} className="w-full p-8 bg-muted/50 rounded-[2.5rem] text-left border-2 border-dashed border-transparent hover:border-muted transition-all group">
            <Coffee className="mb-4 text-muted-foreground group-hover:text-foreground" />
            <h3 className="text-xl font-medium text-foreground">Base Reflection</h3>
            <p className="text-xs text-muted-foreground mt-1">Core daily questions</p>
          </button>
        )}

        {/* AI BLOCK */}
        {aiData.length > 0 ? (
          <div className="bg-muted/30 rounded-[2.5rem] p-8 animate-in fade-in zoom-in duration-300 border border-border/10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-sans">AI Insights</span>
              <button onClick={() => setAiData([])} className="text-muted-foreground/40 hover:text-foreground"><X size={16}/></button>
            </div>
            <div className="space-y-4">
              {aiData.map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[9px] text-muted-foreground/60 uppercase">{item.q}</p>
                  <p className="text-sm text-foreground border-b border-border/10 pb-2">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button 
            onClick={() => startBlock('ai')} 
            disabled={loadingAi}
            className="w-full p-8 bg-foreground text-background rounded-[2.5rem] text-left hover:opacity-95 transition-all flex flex-col justify-between min-h-[160px] relative overflow-hidden"
          >
            {loadingAi ? <Loader2 className="animate-spin" /> : (
              <>
                <Sparkles size={24} className="opacity-40" />
                <div>
                  <h3 className="text-xl font-medium">AI Insights</h3>
                  <p className="text-xs opacity-60 mt-1">Reflections based on your notes</p>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      {/* FOOTER SYNC BUTTON */}
      {(baseData.length > 0 || aiData.length > 0) && (
        <div className="fixed bottom-10 left-8 right-8 animate-in slide-in-from-bottom duration-500">
          <button 
            onClick={finalize}
            disabled={isSyncing}
            className="w-full bg-foreground text-background py-6 rounded-full font-bold flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all"
          >
            {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <><RefreshCw size={20} /> Sync & Complete Day</>}
          </button>
        </div>
      )}
    </div>
  );
}