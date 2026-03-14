"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import {
  Calendar,
  Filter,
  Loader2,
  Sparkles,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

const FullStoryModal = dynamic(() => import("@/components/StoryModal"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-background/20 backdrop-blur-sm z-[100]" />
});

interface DiaryPage {
  id: string;
  date: string;
  title: string;
  content: string;
  word_count: number;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function DiaryPage() {
  const [pages, setPages] = useState<DiaryPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPage, setSelectedPage] = useState<DiaryPage | null>(null);

  // Month picker modal
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);

  useEffect(() => { fetchPages(); }, []);

  useEffect(() => {
    document.body.style.overflow = selectedPage ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedPage]);

  const fetchPages = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("daily_pages")
      .select("id, date, title, content, word_count")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    setPages(data || []);
    setLoading(false);
  };

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch =
        !searchQuery ||
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStart = !startDate || page.date >= startDate;
      const matchesEnd = !endDate || page.date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [pages, searchQuery, startDate, endDate]);

  const handleSyncDay = async () => {
    const today = new Date().toLocaleDateString("en-CA");
    const existingPage = pages.find((p) => p.date === today);
    if (existingPage) {
      if (!confirm("A story for today already exists. Re-generate and overwrite?")) return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-diary-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      await fetchPages();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chapter forever?")) return;
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("daily_pages")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setPages((prev) => prev.filter((p) => p.id !== id));
      setSelectedPage(null);
    } catch (e) {
      alert("Error deleting: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsDeleting(false);
    }
  };

  const selectMonth = (month: number) => {
    const key = `${pickerYear}-${String(month).padStart(2, "0")}`;
    const last = new Date(pickerYear, month, 0).getDate();
    setActiveMonthKey(key);
    setStartDate(`${pickerYear}-${String(month).padStart(2, "0")}-01`);
    setEndDate(`${pickerYear}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`);
    setShowMonthPicker(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setActiveMonthKey(null);
  };

  const activeMonthLabel = activeMonthKey
    ? (() => {
        const [y, m] = activeMonthKey.split("-").map(Number);
        return `${MONTHS[m - 1]} ${y}`;
      })()
    : null;

  const hasActiveFilters = !!(searchQuery || startDate || endDate);

  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  const toggleYear = (year: string) =>
    setCollapsedYears((prev) => { const s = new Set(prev); s.has(year) ? s.delete(year) : s.add(year); return s; });
  const toggleMonth = (key: string) =>
    setCollapsedMonths((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  // Build year→month→pages structure when no filters active
  const yearGroups = useMemo(() => {
    if (hasActiveFilters) return null;
    const map = new Map<string, Map<string, DiaryPage[]>>();
    filteredPages.forEach((page) => {
      const year = page.date.slice(0, 4);
      const monthKey = page.date.slice(0, 7);
      if (!map.has(year)) map.set(year, new Map());
      const yMap = map.get(year)!;
      if (!yMap.has(monthKey)) yMap.set(monthKey, []);
      yMap.get(monthKey)!.push(page);
    });
    return map;
  }, [filteredPages, hasActiveFilters]);

  // Default: collapse all except current month
  useEffect(() => {
    if (!yearGroups) return;
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentYear = currentMonthKey.slice(0, 4);
    const allYears = new Set<string>();
    const allMonths = new Set<string>();
    yearGroups.forEach((monthMap, year) => {
      if (year !== currentYear) allYears.add(year);
      monthMap.forEach((_, mk) => { if (mk !== currentMonthKey) allMonths.add(mk); });
    });
    setCollapsedYears(allYears);
    setCollapsedMonths(allMonths);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const collapseAllExceptCurrent = () => {
    if (!yearGroups) return;
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentYear = currentMonthKey.slice(0, 4);
    const allYears = new Set<string>();
    const allMonths = new Set<string>();
    yearGroups.forEach((monthMap, year) => {
      if (year !== currentYear) allYears.add(year);
      monthMap.forEach((_, mk) => { if (mk !== currentMonthKey) allMonths.add(mk); });
    });
    setCollapsedYears(allYears);
    setCollapsedMonths(allMonths);
  };

  const collapseAll = () => {
    if (!yearGroups) return;
    const allYears = new Set<string>();
    const allMonths = new Set<string>();
    yearGroups.forEach((monthMap, year) => {
      allYears.add(year);
      monthMap.forEach((_, mk) => allMonths.add(mk));
    });
    setCollapsedYears(allYears);
    setCollapsedMonths(allMonths);
  };

  const expandAll = () => {
    setCollapsedYears(new Set());
    setCollapsedMonths(new Set());
  };

  if (loading) return <div className="h-full bg-background" />;

  return (
    <div className="flex flex-col h-[100dvh] bg-background font-sans animate-question">

      {/* STICKY HEADER & FILTERS */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/10">
        <header className="px-6 pt-12 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Diary</h1>
            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-[0.2em] mt-1">Life Archive</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`p-2.5 rounded-full transition-all ${
                showFilters
                  ? "bg-foreground text-background shadow-lg"
                  : "text-muted-foreground/30 hover:text-foreground hover:bg-muted"
              }`}
            >
              <Filter size={20} />
            </button>
            <button
              onClick={handleSyncDay}
              disabled={isGenerating}
              className="p-2.5 bg-foreground text-background rounded-full disabled:opacity-30 active:scale-95 transition-all shadow-lg"
            >
              {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>
          </div>
        </header>

        {/* FILTERS AREA */}
        {showFilters && (
          <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories..."
                className="w-full bg-muted/50 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-foreground/10 transition-all"
              />
            </div>

            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30">
              Browse by month
            </p>

            {/* Month picker button */}
            <button
              onClick={() => { setPickerYear(new Date().getFullYear()); setShowMonthPicker(true); }}
              className={`w-full py-2.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                activeMonthKey
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground/50 hover:text-foreground"
              }`}
            >
              <Calendar size={13} />
              {activeMonthLabel ?? "Select Month"}
            </button>

            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/30">
              Or set a custom date range
            </p>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 ml-2">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setActiveMonthKey(null); }}
                  className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-muted/80 transition-all appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 ml-2">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setActiveMonthKey(null); }}
                  className="w-full bg-muted/50 rounded-xl px-4 py-3 text-sm outline-none focus:bg-muted/80 transition-all appearance-none"
                />
              </div>
            </div>

            {(startDate || endDate || searchQuery) && (
              <button
                onClick={clearFilters}
                className="w-full py-2 text-[10px] uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors border border-red-500/10 rounded-xl"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* SCROLLABLE LIST */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32">
        {filteredPages.length === 0 ? (
          <div className="text-center pt-32 opacity-20">
            <Calendar size={40} className="mx-auto mb-4" />
            <p className="text-xs uppercase tracking-widest">No entries found</p>
          </div>
        ) : yearGroups ? (
          <>
            <div className="flex gap-2 pt-1 pb-1">
              <button onClick={collapseAllExceptCurrent} className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-muted text-muted-foreground/60 hover:bg-foreground hover:text-background transition-all">Current month</button>
              <button onClick={collapseAll} className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-muted text-muted-foreground/60 hover:bg-foreground hover:text-background transition-all">Collapse all</button>
              <button onClick={expandAll} className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-muted text-muted-foreground/60 hover:bg-foreground hover:text-background transition-all">Expand all</button>
            </div>
            {Array.from(yearGroups.entries()).map(([year, monthMap], yi) => {
            const yearCollapsed = collapsedYears.has(year);
            return (
              <div key={year}>
                {/* YEAR HEADER */}
                <button
                  onClick={() => toggleYear(year)}
                  className={`flex items-center gap-2 w-full text-left ${yi !== 0 ? "pt-14" : "pt-6"} pb-3`}
                >
                  <span className="text-5xl font-serif font-bold text-foreground/100 tracking-tight leading-none">{year}</span>
                  <ChevronDown
                    size={18}
                    className={`text-foreground/20 mt-1 transition-transform duration-200 ${yearCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>

                {!yearCollapsed && Array.from(monthMap.entries()).map(([monthKey, monthPages], mi) => {
                  const [y, m] = monthKey.split("-").map(Number);
                  const monthLabel = new Date(y, m - 1).toLocaleDateString("en-US", { month: "long" });
                  const monthCollapsed = collapsedMonths.has(monthKey);
                  return (
                    <div key={monthKey}>
                      {/* MONTH HEADER */}
                      <button
                        onClick={() => toggleMonth(monthKey)}
                        className={`flex items-center gap-2 w-full text-left ${mi !== 0 ? "pt-8" : "pt-2"} pb-2`}
                      >
                        <span className="text-3xl font-serif font-medium text-foreground/100 tracking-tight">{monthLabel}</span>
                        <ChevronDown
                          size={14}
                          className={`text-foreground/20 mt-0.5 transition-transform duration-200 ${monthCollapsed ? "-rotate-90" : ""}`}
                        />
                      </button>

                      {!monthCollapsed && monthPages.map((page, pi) => (
                        <div
                          key={page.id}
                          onClick={() => setSelectedPage(page)}
                          className={`py-10 cursor-pointer group ${pi !== 0 || true ? "border-t border-border/30" : ""}`}
                        >
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                              Chapter {pages.length - pages.indexOf(page)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/40 italic">
                              {new Date(page.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                          <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-muted-foreground transition-colors">
                            {page.title}
                          </h3>
                          <p className="text-[1rem] text-muted-foreground/70 line-clamp-2 font-serif italic mb-4 leading-relaxed">
                            {page.content}
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40 uppercase tracking-tight">
                            <BookOpen size={10} />
                            {page.word_count} words
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
          </>
        ) : (
          filteredPages.map((page, i) => (
            <div
              key={page.id}
              onClick={() => setSelectedPage(page)}
              className={`py-10 cursor-pointer group ${i !== 0 ? "border-t border-border/30" : ""}`}
            >
              <div className="flex justify-between mb-2">
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  Chapter {pages.length - pages.indexOf(page)}
                </span>
                <span className="text-[10px] text-muted-foreground/40 italic">
                  {new Date(page.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-muted-foreground transition-colors">
                {page.title}
              </h3>
              <p className="text-[1rem] text-muted-foreground/70 line-clamp-2 font-serif italic mb-4 leading-relaxed">
                {page.content}
              </p>
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40 uppercase tracking-tight">
                <BookOpen size={10} />
                {page.word_count} words
              </div>
            </div>
          ))
        )}
      </div>

      {/* MONTH PICKER MODAL */}
      {showMonthPicker && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMonthPicker(false)}
        >
          <div
            className="w-full max-w-screen-sm bg-background rounded-[2.5rem] p-6 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold">Select Month</h2>
              <button onClick={() => setShowMonthPicker(false)} className="p-2 bg-muted rounded-full text-foreground/60 active:scale-90 transition-transform">
                <X size={18} />
              </button>
            </div>

            {/* Year selector */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setPickerYear((y) => y - 1)}
                className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-base font-bold uppercase tracking-widest">{pickerYear}</span>
              <button
                onClick={() => setPickerYear((y) => y + 1)}
                className="p-2 text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m, i) => {
                const mn = i + 1;
                const key = `${pickerYear}-${String(mn).padStart(2, "0")}`;
                const isActive = activeMonthKey === key;
                const hasPages = pages.some((p) => p.date.startsWith(key));
                return (
                  <button
                    key={m}
                    onClick={() => selectMonth(mn)}
                    className={`relative py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                      isActive
                        ? "bg-foreground text-background"
                        : hasPages
                        ? "bg-muted text-foreground/70"
                        : "bg-muted/30 text-muted-foreground/30"
                    }`}
                  >
                    {m}
                    {hasPages && !isActive && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-foreground/40" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC MODAL */}
      {selectedPage && (
        <FullStoryModal
          page={selectedPage}
          onClose={() => setSelectedPage(null)}
          onDelete={deletePage}
          onUpdate={(updated) => {
            setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setSelectedPage(updated);
          }}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
