import React from 'react';
import { useAuth, useRequireRole } from './auth-context';
import type { UserRole } from './supabase-types';

interface RouteGuardProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function RouteGuard({ allowedRoles, children, fallback }: RouteGuardProps) {
    const { profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-gray-600">Please sign in to continue</p>
                </div>
            </div>
        );
    }

    if (!allowedRoles.includes(profile.role)) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Unauthorized</h2>
                    <p className="text-gray-600">You don't have permission to access this page</p>
                    <p className="text-sm text-gray-500 mt-2">Your role: {profile.role}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

interface RoleBasedComponentProps {
    allowedRoles: UserRole[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function RoleBasedComponent({ allowedRoles, children, fallback }: RoleBasedComponentProps) {
    const { hasRole } = useRequireRole(allowedRoles);

    if (!hasRole) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
