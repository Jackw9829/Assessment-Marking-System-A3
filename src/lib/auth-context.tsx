import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase-client';
import { getCurrentUserProfile } from './supabase-helpers';
import type { Profile, UserRole } from './supabase-types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile
    const fetchProfile = async () => {
        try {
            const userProfile = await getCurrentUserProfile();
            setProfile(userProfile);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
        }
    };

    // Initialize auth state
    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile();
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile();
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        setSession(data.session);
        setUser(data.user);
        await fetchProfile();
    };

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        role: UserRole = 'student'
    ) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                },
            },
        });

        if (error) throw error;

        // Auto sign-in after signup if email confirmation is disabled
        if (data.session) {
            setSession(data.session);
            setUser(data.user);
            await fetchProfile();
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        setUser(null);
        setProfile(null);
        setSession(null);
    };

    const refreshProfile = async () => {
        await fetchProfile();
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Role checking hooks
export function useRequireAuth(redirectTo?: string) {
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user && redirectTo) {
            window.location.href = redirectTo;
        }
    }, [user, loading, redirectTo]);

    return { user, loading };
}

export function useRequireRole(requiredRole: UserRole | UserRole[]) {
    const { profile, loading } = useAuth();

    const hasRole = React.useMemo(() => {
        if (!profile) return false;

        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(profile.role);
        }

        return profile.role === requiredRole;
    }, [profile, requiredRole]);

    return { hasRole, loading, profile };
}
