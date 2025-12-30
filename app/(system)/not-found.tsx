// ============================================
// SYSTEM (SUPER ADMIN) LAYOUT NOT FOUND PAGE
// app/(system)/not-found.tsx
// ============================================
import Link from 'next/link';
import { Shield, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SystemNotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-pink-100">
            <Shield className="size-8 text-purple-600" />
          </div>
        </div>
        
        <div className="mb-6">
          <h1 className="mb-2 text-6xl font-bold text-gray-900">404</h1>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Admin Page Not Found</h2>
          <p className="text-gray-600">
            The system administration page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard">
              <Home className="size-4" />
              Admin Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="javascript:history.back()">
              <ArrowLeft className="size-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}