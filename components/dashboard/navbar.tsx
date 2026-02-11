'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

function getInitial(email?: string | null) {
  if (!email) return 'U';
  return email.slice(0, 1).toUpperCase();
}

export default function DashboardNavbar() {
  const { user, signOut } = useAuth();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    'Signed-in user';
  const initial = useMemo(() => getInitial(user?.email), [user?.email]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[1000] px-3 py-5 sm:px-4">
      <div className="flex w-full items-center justify-between">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center rounded-2xl border border-white/15 bg-white/[0.04] p-3 text-white shadow-[0_10px_40px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5"
        >
          <Image src="/new.png" alt="Nailart AI Logo" width={28} height={28} />
        </Link>

        <div className="pointer-events-auto group relative">
          <button
            type="button"
            className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-2 text-white shadow-[0_10px_40px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                width={36}
                height={36}
                className="rounded-full border border-white/20 object-cover"
              />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold">
                {initial}
              </span>
            )}
          </button>

          <div className="invisible absolute right-0 top-[calc(100%+10px)] min-w-[220px] translate-y-1 rounded-xl border border-white/15 bg-[#1f1f1f]/95 p-2 opacity-0 shadow-[0_16px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Profile"
                  width={30}
                  height={30}
                  className="rounded-full border border-white/20 object-cover"
                />
              ) : (
                <span className="grid h-[30px] w-[30px] place-items-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold">
                  {initial}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{displayName}</p>
                <p className="truncate text-[11px] text-white/60">{user?.email ?? 'No email'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
