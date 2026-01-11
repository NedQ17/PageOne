"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false); // Состояние: вход или регистрация
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const cleanEmail = email.trim();

    if (isSignUp) {
      // ЛОГИКА РЕГИСТРАЦИИ
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        alert(error.message);
      } else {
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          alert("Account created! Now you can sign in.");
          setIsSignUp(false); // Переключаем на вход после успешной регистрации
        }
      }
    } else {
      // ЛОГИКА ВХОДА
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (error) {
        alert("Login failed: " + error.message);
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-background px-8 justify-center animate-question">
      <div className="mb-12">
        <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-widest mt-2 leading-relaxed">
          {isSignUp ? "Start your personal biography" : "Continue your story"}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-2">
          <input 
            type="email" 
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-muted border-none rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-foreground/20 text-foreground"
          />
        </div>
        <div className="space-y-2">
          <input 
            type="password" 
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-muted border-none rounded-2xl px-6 py-4 outline-none focus:ring-1 focus:ring-foreground/20 text-foreground"
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background rounded-full py-4 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? "Sign Up" : "Sign In")}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-8 text-center">
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold hover:text-foreground transition-colors"
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}