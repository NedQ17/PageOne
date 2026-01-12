"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, Mail, Loader2 } from 'lucide-react';

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("Check your email for confirmation!");
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif font-bold tracking-tight">Page One</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest">Your story begins here</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-4">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-muted/50 border-none rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-foreground/5 transition-all"
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-4">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted/50 border-none rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-foreground/5 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Sign In</>}
          </button>
        </form>

        <button 
          onClick={handleSignUp}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Don't have an account? Sign Up
        </button>
      </div>
    </div>
  );
}