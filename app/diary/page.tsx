"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Filter, Loader2, Sparkles, X, BookOpen, Search } from "lucide-react";

export default function DiaryPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const { data } = await supabase
      .from('daily_pages')
      .select('*')
      .order('date', { ascending: false });
    setPages(data || []);
    setLoading(false);
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
    // Получаем текущую дату в формате YYYY-MM-DD по местному времени
    const today = new Date().toLocaleDateString('en-CA'); 
    const existingPage = pages.find(p => p.date === today);

    if (existingPage) {
      if (!confirm("A story for today already exists. Re-generate and overwrite?")) return;
    }

    setIsGenerating(true);
    try {
      // ПЕРЕДАЕМ ДАТУ в API, чтобы он знал, какие записи и интервью чистить
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

  return (
    <div className="flex flex-col h-full bg-background px-6 relative">
      <header className="pt-12 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Diary</h1>
          <p className="text-muted-foreground font-sans text-[10px] uppercase tracking-widest mt-1">
            Archive of your life
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSyncDay}
            disabled={isGenerating}
            className="p-2 bg-foreground text-background rounded-full hover:opacity-90 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-muted text-foreground' : 'text-muted-foreground/50 hover:text-foreground'}`}
          >
            <Filter size={20} />
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text"
              placeholder="Search thoughts, places, people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/30 border border-border/40 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground/20 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center bg-muted/30 border border-border/40 rounded-2xl px-3 py-1">
              <span className="text-[10px] uppercase text-muted-foreground mr-2">From</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs outline-none w-full" />
            </div>
            <div className="flex-1 flex items-center bg-muted/30 border border-border/40 rounded-2xl px-3 py-1">
              <span className="text-[10px] uppercase text-muted-foreground mr-2">To</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs outline-none w-full" />
            </div>
            {(startDate || endDate || searchQuery) && (
              <button onClick={clearFilters} className="p-2 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-20">
        {loading ? (
          <div className="flex justify-center pt-20"><Loader2 className="animate-spin opacity-20" /></div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center pt-20 opacity-40">
            <Calendar size={40} className="mx-auto mb-4" />
            <p className="text-sm font-serif italic">No stories found</p>
          </div>
        ) : (
          filteredPages.map((page, i) => (
            <div 
              key={page.id} 
              onClick={() => setSelectedPage(page)}
              className="relative p-6 rounded-[2rem] border border-border/40 hover:border-border transition-all group cursor-pointer bg-muted/5 active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-foreground text-background text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">
                  Ch. {pages.length - i}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/40 italic">
                  {new Date(page.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h3 className="text-xl font-serif font-medium text-foreground mb-1 group-hover:translate-x-1 transition-transform">{page.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 font-serif italic opacity-80 mb-4">{page.content}</p>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-muted-foreground/60 uppercase tracking-tighter">{page.word_count} words</span>
                <BookOpen size={12} className="text-muted-foreground/30 group-hover:text-foreground transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>

          {selectedPage && (
      /* z-index изменен на 100, чтобы быть выше навигации */
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        {/* Фон с размытием */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setSelectedPage(null)} />
        
        <div className="relative w-full max-w-2xl bg-background border-t sm:border border-border/50 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 max-h-[92vh] flex flex-col">
          {/* Шапка модалки */}
          <div className="flex justify-between items-center px-8 pt-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Archive</div>
              <span className="text-xs font-mono text-muted-foreground">
                {new Date(selectedPage.date).toLocaleDateString('en-US', { dateStyle: 'long' })}
              </span>
            </div>
            <button onClick={() => setSelectedPage(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Контент модалки с увеличенным нижним отступом pb-32 */}
          <div className="flex-1 overflow-y-auto px-8 pb-32 pt-4 no-scrollbar">
            <h2 className="text-3xl font-serif font-bold text-foreground mb-8 leading-tight">
              {selectedPage.title}
            </h2>
            <div className="prose prose-stone">
              {selectedPage.content.split('\n').map((paragraph: string, idx: number) => (
                <p key={idx} className={`text-lg font-serif text-foreground/90 leading-relaxed mb-6 ${idx === 0 ? "first-letter:text-3xl first-letter:font-bold first-letter:mr-1" : ""}`}>
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