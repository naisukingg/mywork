'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DashboardNavbar from '@/components/dashboard/navbar';
import PromptArea from '@/components/dashboard/PromptArea';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#181818] text-white">
        <p className="text-sm text-white/65 [font-family:'Space_Grotesk',sans-serif]">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#181818] text-white [font-family:'Space_Grotesk',sans-serif]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:52px_52px]"
      />
      <DashboardNavbar />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col items-center justify-center px-6 pt-16">
        <h1 className="mb-8 text-center text-[32px] tracking-[-0.02em] text-white [font-family:'Indie_Flower',cursive]">
          Describe your thumbnail
        </h1>
        <PromptArea />
      </section>
    </main>
  );
}
