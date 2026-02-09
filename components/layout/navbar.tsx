'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-0 z-[1000] flex items-center justify-between bg-transparent px-6 py-6 sm:px-10 lg:px-20 [font-family:'Space_Grotesk',sans-serif]">
      <Link href="/" className="flex items-center gap-3 no-underline">
        <Image src="/new.png" alt="Nailart AI Logo" width={32} height={32} className="bg-transparent" />
        <span className="text-[1.4rem] font-bold tracking-[-0.02em] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
          Nailart AI
        </span>
      </Link>

      <div className="hidden items-center gap-10 rounded-full bg-white/5 px-10 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] backdrop-blur-[20px] md:flex">
        <Link href="#features" className="text-[1.05rem] font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-80 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
          Features
        </Link>
        <Link href="#pricing" className="text-[1.05rem] font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-80 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
          Pricing
        </Link>
        <Link href="#contact" className="text-[1.05rem] font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-80 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
          Contact
        </Link>
      </div>

      <Link
        href="#get-started"
        className="rounded-[14px] bg-[rgba(12,16,28,0.92)] px-7 py-3 text-base font-bold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26),0_14px_34px_rgba(0,0,0,0.45)]"
      >
        Get Started
      </Link>
    </nav>
  );
}
