'use client';

import { usePathname } from 'next/navigation';
import { ApplicationLayout } from '@/app/application-layout';
import { AuthLayout } from '@/components/auth-layout';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Use AuthLayout for login page, ApplicationLayout for everything else
  if (pathname === '/login') {
    return <AuthLayout>{children}</AuthLayout>;
  }
  
  return <ApplicationLayout>{children}</ApplicationLayout>;
}