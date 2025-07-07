'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuthed(authenticated);
      setIsLoading(false);

      // Redirect logic
      if (authenticated && pathname === '/login') {
        router.push('/');
      } else if (!authenticated && pathname !== '/login') {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  // Allow access to login page when not authenticated
  if (!isAuthed && pathname === '/login') {
    return <>{children}</>;
  }

  // Allow access to protected routes when authenticated
  if (isAuthed && pathname !== '/login') {
    return <>{children}</>;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
    </div>
  );
}