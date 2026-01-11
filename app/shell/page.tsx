"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, ChevronRight, Zap, Users, MapPin, 
  Target, Plus, ArrowLeft, Loader2, Box, X 
} from "lucide-react";

const iconMap: Record<string, any> = {
  "Core Values": Zap,
  "People": Users,
  "Places": MapPin,
  "Long-term Goals": Target,
  "Box": Box
};

export default function ShellPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния для создания категории
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [itemsRes, catsRes] = await Promise.all([
      supabase.from("shell_items").select("*").eq("user_id", user.id),
      supabase.from("shell_categories").select("*").eq("user_id", user.id)
    ]);

    const defaultCats = [
      { name: "Core Values", icon_name: "Core Values", description: "Your life principles" },
      { name: "People", icon_name: "People", description: "Connections & Inner circle" },
      { name: "Places", icon_name: "Places", description: "Locations that matter" },
      { name: "Long-term Goals", icon_name: "Long-term Goals", description: "Your north star" },
    ];

    if (itemsRes.data) setItems(itemsRes.data);
    // Объединяем дефолтные и кастомные из БД
    setCategories([...defaultCats, ...(catsRes.data || [])]);
    setLoading(false);
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("shell_categories")
      .insert([{ 
        name: newCatName, 
        description: newCatDesc, 
        user_id: user?.id,
        icon_name: "Box" 
      }]);

    if (!error) {
      setNewCatName("");
      setNewCatDesc("");
      setIsModalOpen(false);
      fetchData();
    }
  };

  const getCount = (name: string) => items.filter(i => 
    i.category === name || (name === "Core Values" && i.category === "Values")
  ).length;

  if (loading) return <div className="flex h-full items-center justify-center opacity-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full bg-background animate-question px-6 relative overflow-hidden">
      
      {/* ВНУТРЕННЯЯ СТРАНИЦА КАТЕГОРИИ */}
      {selectedCategory ? (
        <div className="absolute inset-0 bg-background z-20 px-6 animate-in slide-in-from-right duration-300">
          <header className="pt-12 pb-8 flex items-center gap-4">
            <button onClick={() => setSelectedCategory(null)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-serif font-bold">{selectedCategory}</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                {getCount(selectedCategory)} elements
              </p>
            </div>
          </header>
          <div className="space-y-4 pb-20 overflow-y-auto no-scrollbar h-[calc(100vh-150px)]">
            {items.filter(i => i.category === selectedCategory || (selectedCategory === "Core Values" && i.category === "Values")).map(item => (
              <div key={item.id} className="p-6 bg-muted/30 rounded-[2rem] border border-border/5">
                <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ГЛАВНЫЙ ЭКРАН SHELL */}
          <header className="pt-12 pb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Shell</h1>
              <p className="text-muted-foreground font-sans text-[10px] uppercase tracking-widest mt-1">
                Your evolving identity
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-3 bg-muted rounded-full hover:bg-border transition-all active:scale-95"
            >
              <Plus size={20} strokeWidth={1.5} />
            </button>
          </header>

          <div className="mb-8">
            <div className="bg-muted rounded-2xl p-3 flex items-center gap-3 border border-border/20">
              <Search size={18} className="text-muted-foreground/50" />
              <input 
                type="text" 
                placeholder="Search your essence..." 
                className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground/30 text-foreground"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
            {categories.map((cat) => {
              const Icon = iconMap[cat.icon_name] || Box;
              return (
                <button 
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-muted transition-colors group border border-transparent hover:border-border/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-background transition-colors">
                      <Icon size={20} className="text-foreground/70" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
                      <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase">{cat.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/40">{getCount(cat.name)}</span>
                    <ChevronRight size={14} className="text-muted-foreground/20" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="w-full bg-background rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-serif font-bold text-foreground">New Category</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-muted rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-4">
              <input 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Name (e.g. Dreams, Skills)" 
                className="w-full bg-muted rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-foreground/10 text-foreground"
              />
              <textarea 
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Short description..." 
                className="w-full bg-muted rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-foreground/10 h-32 resize-none text-foreground"
              />
              <button 
                onClick={handleCreateCategory}
                className="w-full bg-foreground text-background rounded-full py-4 font-bold active:scale-[0.98] transition-all"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}