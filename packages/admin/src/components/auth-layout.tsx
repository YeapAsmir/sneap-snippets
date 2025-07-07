// Misc
import React from 'react';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col p-2">
      <div className="flex grow items-center justify-center p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5">
        <div className="grid w-full max-w-sm grid-cols-1 gap-8">
          {children}
        </div>
      </div>
    </main>
  );
}