// Misc
import { AuthGuard } from '@/components/auth-guard';
import { ConditionalLayout } from '@/components/conditional-layout';
import '@/styles/tailwind.css';
import type { Metadata }     from 'next';
import type React            from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s - Sneap',
    default: 'Sneap',
  },
  description: '',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html
      lang="en"
      className="text-zinc-950 antialiased lg:bg-zinc-100"
    >
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>
        <AuthGuard>
          <ConditionalLayout>{children}</ConditionalLayout>
        </AuthGuard>
      </body>
    </html>
  )
}
