"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Calendar, Filter, Loader2, Sparkles, X, BookOpen, Search, ChevronLeft } from "lucide-react";

export default function DiaryPage() {
  const router = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPage, setSelectedPage] = useState<any>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    // Если это первая загрузка, setLoading не дергаем, чтобы не мигать лоадером внутри контента
    const { data } = await supabase
      .from('daily_pages')
      .select('*')
      .order('date', { ascending: false });
    
    setPages(data || []);
    setLoading(false);
    setIsInitialLoading(false);
  };

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch = 
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const pageDate = page.date;
      const matchesStart = !startDate || pageDate >= startDate;
      const matchesEnd = !endDate || pageDate <= endDate;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [pages, searchQuery, startDate, endDate]);

  const handleSyncDay = async () => {
    const today = new Date().toLocaleDateString('en-CA'); 
    const existingPage = pages.find(p => p.date === today);

    if (existingPage) {
      if (!confirm("A story for today already exists. Re-generate and overwrite?")) return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-diary-page', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }) 
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }

      await fetchPages();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  // Предотвращаем резкое появление хедера до загрузки данных
  if (isInitialLoading) {
    return <div className="h-full bg-background" />;
  }

  return (
    <div className="flex flex-col h-full bg-background font-sans animate-question">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-end bg-background sticky top-0 z-20">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Diary</h1>
          <p className="text-muted-foreground/40 font-sans text-[10px] uppercase tracking-[0.2em] mt-1">
            Life Archive
          </p>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${showFilters ? 'bg-muted text-foreground' : 'text-muted-foreground/30 hover:text-foreground'}`}
          >
            <Filter size={20} strokeWidth={1.5} />
          </button>
          <button 
            onClick={handleSyncDay}
            disabled={isGenerating}
            className="p-2.5 bg-foreground text-background rounded-full hover:opacity-90 disabled:opacity-20 transition-all shadow-xl active:scale-90"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </header>

      {/* FILTERS AREA */}
      {showFilters && (
        <div className="px-6 mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={16} />
            <input 
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/30 border border-border/10 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:bg-muted/50 transition-all font-serif"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-muted/30 border border-border/10 rounded-xl px-3 py-2">
              <span className="text-[9px] uppercase font-bold text-muted-foreground/40 mr-2 tracking-widest">From</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-[11px] outline-none w-full text-foreground/70" />
            </div>
            <div className="flex-1 flex items-center bg-muted/30 border border-border/10 rounded-xl px-3 py-2">
              <span className="text-[9px] uppercase font-bold text-muted-foreground/40 mr-2 tracking-widest">To</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-[11px] outline-none w-full text-foreground/70" />
            </div>
            {(startDate || endDate || searchQuery) && (
              <button onClick={clearFilters} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* LIST OF STORIES */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {loading ? (
          <div className="flex justify-center pt-20"><Loader2 className="animate-spin opacity-10" /></div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center pt-32 opacity-20">
            <Calendar size={40} strokeWidth={1} className="mx-auto mb-4" />
            <p className="text-xs uppercase tracking-widest">No entries found</p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredPages.map((page, i) => (
              <div 
                key={page.id} 
                onClick={() => setSelectedPage(page)}
                className={`group py-8 cursor-pointer transition-all active:opacity-60 ${
                  i !== 0 ? "border-t border-border/30" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-[0.15em]">
                    Chapter {pages.length - i}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/40 italic">
                    {new Date(page.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                <h3 className="text-2xl font-serif font-bold text-foreground/90 leading-tight mb-2 group-hover:text-foreground transition-colors">
                  {page.title}
                </h3>
                
                <p className="text-[15px] text-muted-foreground/70 line-clamp-2 font-serif italic mb-4 leading-relaxed">
                  {page.content}
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 rounded-md border border-border/5">
                    <BookOpen size={10} className="text-muted-foreground/40" />
                    <span className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                      {page.word_count} words
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULL STORY MODAL */}
      {selectedPage && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" onClick={() => setSelectedPage(null)} />
          
          <div className="relative w-full max-w-2xl bg-background border-t border-border/40 rounded-t-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-10 pb-4 bg-background/50 sticky top-0 backdrop-blur-sm z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1">
                   {new Date(selectedPage.date).toLocaleDateString('en-US', { dateStyle: 'long' })}
                </span>
                <div className="h-0.5 w-8 bg-foreground/10 rounded-full" />
              </div>
              <button 
                onClick={() => setSelectedPage(null)} 
                className="p-3 bg-muted/50 hover:bg-muted rounded-full transition-all active:scale-90"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-8 pb-40 pt-6 no-scrollbar touch-pan-y">
              <h2 className="text-4xl font-serif font-bold text-foreground mb-10 leading-[1.15]">
                {selectedPage.title}
              </h2>
              <div className="space-y-8">
                {selectedPage.content.split('\n').map((paragraph: string, idx: number) => (
                  <p key={idx} className={`text-[19px] font-serif text-foreground/80 leading-relaxed ${
                    idx === 0 ? "first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:mt-1 first-letter:text-foreground" : ""
                  }`}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}