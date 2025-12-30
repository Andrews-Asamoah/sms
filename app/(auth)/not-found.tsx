// ============================================
// AUTH LAYOUT NOT FOUND PAGE
// app/(auth)/not-found.tsx
// ============================================
import Link from 'next/link';
import { Lock, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex aspect-square size-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100">
            <Lock className="size-8 text-blue-600" />
          </div>
        </div>
        
        <div className="mb-6">
          <h1 className="mb-2 text-6xl font-bold text-gray-900">404</h1>
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Page Not Found</h2>
          <p className="text-gray-600">
            The authentication page you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/login">
              <Lock className="size-4" />
              Go to Login
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/">
              <Home className="size-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}