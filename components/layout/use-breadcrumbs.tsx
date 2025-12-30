// ============================================
// BREADCRUMB HOOK
// components/layout/use-breadcrumbs.tsx
// ============================================
'use client';
import { usePathname } from 'next/navigation';

export function useBreadcrumbs(basePath: string = '') {
  const pathname = usePathname();
  
  // Split pathname and filter empty strings
  const segments = pathname
    .replace(basePath, '')
    .split('/')
    .filter(Boolean);

  return segments.map((segment, index) => {
    const href = `${basePath}/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === segments.length - 1;
    
    // Convert slug to readable label (e.g., 'user-management' -> 'User Management')
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      label,
      href: isLast ? undefined : href,
      isCurrentPage: isLast,
    };
  });
}
