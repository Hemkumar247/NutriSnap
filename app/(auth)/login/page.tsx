'use client'

import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/Spinner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);
    const router = useRouter();

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const createSession = async (idToken: string) => {
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
        });
        if (!response.ok) throw new Error('Failed to create session');
    };

    const handleSignIn = async () => {
        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const userCred = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCred.user.getIdToken();
            await createSession(idToken);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'An error occurred during sign in.');
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const userCred = await signInWithPopup(auth, provider);
            const idToken = await userCred.user.getIdToken();
            await createSession(idToken);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'An error occurred with Google Sign In.');
            setIsLoading(false);
        }
    };

    if (!isMounted) return null;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md p-8 rounded-[2.5rem] animate-fade-in shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative z-10 overflow-hidden" 
                 style={{ 
                    backgroundColor: 'var(--box-bg)', 
                    border: '1px solid var(--box-border)',
                    backdropFilter: 'blur(var(--glass-blur))'
                 }}>
                {/* Glass Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                
                {/* Branding/Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-strong)' }}>
                        Welcome Back
                    </h1>
                    <p className="text-sm mt-2 opacity-70" style={{ color: 'var(--text-color)' }}>
                        Sign in to continue your health journey
                    </p>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-50 ml-1" style={{ color: 'var(--text-color)' }}>
                            Email Address
                        </label>
                        <input 
                            type="email"
                            placeholder={activeField === 'email' ? '' : "name@example.com"}
                            value={email}
                            onFocus={() => setActiveField('email')}
                            onBlur={() => setActiveField(null)}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-medium border text-sm"
                            style={{ 
                                backgroundColor: 'var(--input-bg)',
                                borderColor: 'var(--input-border)',
                                color: 'var(--text-strong)',
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-50 ml-1" style={{ color: 'var(--text-color)' }}>
                            Password
                        </label>
                        <input 
                            type="password"
                            placeholder={activeField === 'password' ? '' : "••••••••"}
                            value={password}
                            onFocus={() => setActiveField('password')}
                            onBlur={() => setActiveField(null)}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all font-medium border text-sm"
                            style={{ 
                                backgroundColor: 'var(--input-bg)',
                                borderColor: 'var(--input-border)',
                                color: 'var(--text-strong)',
                            }}
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-pulse">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex justify-center mt-6">
                        <Spinner />
                    </div>
                )}

                {/* Login Button */}
                {!isLoading && (
                    <button 
                        onClick={handleSignIn}
                        className="w-full mt-8 py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                        style={{ 
                            backgroundColor: 'var(--brand-accent)', 
                            color: 'black'
                        }}
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="relative z-10">Sign In</span>
                    </button>
                )}

                {/* Divider */}
                <div className="flex items-center my-8 opacity-20">
                    <div className="flex-grow h-px" style={{ backgroundColor: 'var(--text-color)' }}></div>
                    <span className="px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-color)' }}>OR</span>
                    <div className="flex-grow h-px" style={{ backgroundColor: 'var(--text-color)' }}></div>
                </div>

                {/* Google Sign In */}
                <button 
                    onClick={handleGoogleSignIn}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-sm transition-all border group hover:bg-white/5 active:scale-[0.98]"
                    style={{ 
                        borderColor: 'var(--box-border)',
                        color: 'var(--text-strong)'
                    }}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.1-1.94 3.31-4.82 3.31-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                {/* Footer Link */}
                <p className="text-center mt-8 text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: 'var(--text-color)' }}>
                    New here? {' '}
                    <a href="/signup" className="underline transition-colors decoration-2 hover:text-cyan-400" style={{ color: 'var(--brand-accent)' }}>
                        Create an account
                    </a>
                </p>

            </div>
        </div>
    );
}
