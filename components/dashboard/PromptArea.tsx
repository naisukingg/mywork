'use client';

import { useLayoutEffect, useRef, useState, type FormEvent, type SVGProps } from 'react';
import { BorderBeam } from '@/components/dashboard/BorderBeam';
import { useAuth } from '@/context/AuthContext';

const PlusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SendIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const MicIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeWidth="1.5" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeWidth="1.5" />
    <line x1="12" y1="19" x2="12" y2="23" strokeWidth="1.5" />
  </svg>
);

const Settings2Icon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M20 7h-9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 17H5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17" cy="17" r="3" strokeWidth="1.5" />
    <circle cx="7" cy="7" r="3" strokeWidth="1.5" />
  </svg>
);

export default function PromptArea() {
  const { session } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [imageName, setImageName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 260)}px`;
  }, [value]);

  const canSubmit = value.trim().length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.access_token) {
      setErrorMessage('Session expired. Please sign in again.');
      return;
    }
    if (!value.trim()) {
      setErrorMessage('Please enter a prompt.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setGeneratedText(null);

      const response = await fetch('/api/thumbnails/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: value.trim(),
          aspectRatio: '16:9',
          imageSize: '2K',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.error || 'Failed to generate image.');
      }

      setGeneratedImageUrl(payload?.imageUrl || null);
      setGeneratedText(payload?.text || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate image.';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[920px]">
      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#222222]/95 p-2 shadow-[0_1px_2px_rgba(0,0,0,0.35),0_14px_34px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setImageName(file?.name ?? '');
          }}
        />

        {imageName && <p className="px-3 pt-2 text-xs text-white/55">Attached: {imageName}</p>}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Message..."
          className="min-h-12 w-full resize-none border-0 bg-transparent p-2 text-base leading-relaxed text-white placeholder:text-white/45 focus:outline-none"
        />

        <div className="flex items-center gap-1.5 px-2 pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Attach image"
          >
            <PlusIcon className="h-[22px] w-[22px]" />
          </button>

          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[22px] text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Tools"
          >
            <Settings2Icon className="h-[18px] w-[18px]" />
            <span className="text-[13px] font-medium">Tools</span>
          </button>

          <button
            type="button"
            className="ml-auto grid h-9 w-9 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Voice input"
          >
            <MicIcon className="h-[18px] w-[18px]" />
          </button>

          <button
            type="submit"
            disabled={!canSubmit || isGenerating}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/35 disabled:text-black/60"
            aria-label="Send prompt"
          >
            <SendIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <BorderBeam duration={6} size={420} colorFrom="#00000000" colorTo="#f4c15d" borderWidth={1.5} />
        <BorderBeam
          duration={6}
          delay={3}
          size={420}
          colorFrom="#00000000"
          colorTo="#9c40ff"
          borderWidth={1.5}
        />
      </div>

      {isGenerating && (
        <p className="mt-3 text-sm text-white/70 [font-family:'Space_Grotesk',sans-serif]">Generating thumbnail...</p>
      )}
      {errorMessage && (
        <p className="mt-3 text-sm text-red-300 [font-family:'Space_Grotesk',sans-serif]">{errorMessage}</p>
      )}
      {generatedText && (
        <p className="mt-3 text-sm text-white/70 [font-family:'Space_Grotesk',sans-serif]">{generatedText}</p>
      )}
      {generatedImageUrl && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/15 bg-black/20 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.4)]">
          <img
            src={generatedImageUrl}
            alt="Generated thumbnail"
            className="h-auto w-full rounded-xl object-cover"
          />
        </div>
      )}
    </form>
  );
}
