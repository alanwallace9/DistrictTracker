import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public routes (no auth needed)
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/demo-guide',            // Demo environment guide accessible to all
  '/access-denied',         // Module access denied page (shows options)
  '/feedback',              // Redirects to /feedback/features
  '/feedback/features',     // Can VIEW feature requests
  '/feedback/bugs',         // Can VIEW bug reports
  '/feedback/[slug]',       // Can VIEW feedback detail
  '/feedback/roadmap',      // Can VIEW roadmap
  '/feedback/changelog',    // Can VIEW changelog
]);

// Feedback interaction routes (auth required, no tenant needed)
const isFeedbackRoute = createRouteMatcher([
  '/feedback/api(.*)',      // API routes for feedback actions
]);

// Use admin client for write permissions (needed to update user_profiles)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getSubdomainFromHostname(hostname: string): string | null {
  // Development: default to demo
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'demo';
  }

  const parts = hostname.split('.');
  if (parts.length < 3 || parts[0] === 'www') {
    return null;
  }

  const subdomain = parts[0];

  // staging and app are special domains - don't map to any tenant
  if (subdomain === 'staging' || subdomain === 'app') {
    return null;
  }

  return subdomain;
}

export default clerkMiddleware(async (auth, request) => {
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomainFromHostname(hostname);

  console.log('[MIDDLEWARE]', { hostname, subdomain, path: request.nextUrl.pathname });

  // Public routes - allow everyone
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // All other routes require authentication
  const { userId } = await auth.protect();

  // If authenticated and subdomain present, check tenant access
  if (userId && subdomain) {
    console.log('[MIDDLEWARE] Authenticated user on subdomain', { userId, subdomain });
    // Get user's profile including module_access
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, active_tenant_id, module_access')
      .eq('id', userId)
      .single();

    if (userProfile) {
      const userAssignedTenant = userProfile.tenant_id;
      const userActiveTenant = userProfile.active_tenant_id || userAssignedTenant;

      console.log('[MIDDLEWARE] User profile', { userAssignedTenant, userActiveTenant });

      // Check access rules
      if (subdomain === 'demo') {
        // Demo is accessible to all - auto-switch if needed
        if (userActiveTenant !== 'demo') {
          console.log('[MIDDLEWARE] Auto-switching to demo workspace');
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({ active_tenant_id: 'demo', demo_role: 'campus_admin' })
            .eq('id', userId);

          if (error) {
            console.error('[MIDDLEWARE] Failed to switch to demo:', error);
          } else {
            console.log('[MIDDLEWARE] Successfully switched to demo');
          }
        }
      } else if (subdomain === userAssignedTenant) {
        // Accessing their own tenant - auto-switch if needed
        if (userActiveTenant !== userAssignedTenant) {
          console.log('[MIDDLEWARE] Auto-switching to production tenant');
          const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({ active_tenant_id: null, demo_role: null })
            .eq('id', userId);

          if (error) {
            console.error('[MIDDLEWARE] Failed to switch to production:', error);
          } else {
            console.log('[MIDDLEWARE] Successfully switched to production');
          }
        }
      } else {
        // Trying to access another tenant's production data - BLOCK
        console.log('[MIDDLEWARE] Access denied - redirecting to demo-guide');
        return NextResponse.redirect(new URL('/demo-guide', request.url));
      }

      // Module access control (AC 1.2.5, AC 1.2.6)
      const pathname = request.nextUrl.pathname;
      const moduleAccess = userProfile.module_access || 'both';

      // Block /daep/* routes for trespass_only users
      if (moduleAccess === 'trespass_only' && pathname.startsWith('/daep')) {
        console.log('[MIDDLEWARE] Module access denied - trespass_only user accessing DAEP');
        const accessDeniedUrl = new URL('/access-denied', request.url);
        accessDeniedUrl.searchParams.set('module', 'daep');
        accessDeniedUrl.searchParams.set('path', pathname);
        return NextResponse.redirect(accessDeniedUrl);
      }

      // Block /trespass/* routes for daep_only users
      if (moduleAccess === 'daep_only' && pathname.startsWith('/trespass')) {
        console.log('[MIDDLEWARE] Module access denied - daep_only user accessing TrespassTracker');
        const accessDeniedUrl = new URL('/access-denied', request.url);
        accessDeniedUrl.searchParams.set('module', 'trespass');
        accessDeniedUrl.searchParams.set('path', pathname);
        return NextResponse.redirect(accessDeniedUrl);
      }

      // Also block /dashboard for daep_only users (dashboard is TrespassTracker)
      if (moduleAccess === 'daep_only' && pathname.startsWith('/dashboard')) {
        console.log('[MIDDLEWARE] Module access denied - daep_only user accessing dashboard');
        const accessDeniedUrl = new URL('/access-denied', request.url);
        accessDeniedUrl.searchParams.set('module', 'trespass');
        accessDeniedUrl.searchParams.set('path', pathname);
        return NextResponse.redirect(accessDeniedUrl);
      }
    }
  }

  return NextResponse.next();

  // Note: We don't enforce tenant_id in middleware for feedback routes
  // because feedback-only users (tenant_id = null) should be able to interact
  // Tenant validation for dashboard routes is handled by RLS policies and server actions
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
