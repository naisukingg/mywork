'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define MN min(R.x,R.y)
float pattern(vec2 uv) {
  float d=.0;
  for (float i=.0; i<3.; i++) {
    uv.x+=sin(T*(1.+i)+uv.y*1.5)*.2;
    d+=.005/abs(uv.x);
  }
  return d;
}
vec3 scene(vec2 uv) {
  vec3 col=vec3(0);
  uv=vec2(atan(uv.x,uv.y)*2./6.28318,-log(length(uv))+T);
  for (float i=.0; i<3.; i++) {
    int k=int(mod(i,3.));
    col[k]+=pattern(uv+i*6./MN);
  }
  return col;
}
void main() {
  vec2 uv=(FC-.5*R)/MN;
  vec3 col=vec3(0);
  float s=12., e=9e-4;
  col+=e/(sin(uv.x*s)*cos(uv.y*s));
  uv.y+=R.x>R.y?.5:.5*(R.y/R.x);
  col+=scene(uv);
  O=vec4(col,1.);
}`;

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`;

export default function AuthPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) return;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Failed to create shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || 'Shader compile error';
        gl.deleteShader(shader);
        throw new Error(info);
      }
      return shader;
    };

    const vertexShader = compileShader(VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    const verts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    const buffer = gl.createBuffer();
    if (!buffer) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.useProgram(program);

    const position = gl.getAttribLocation(program, 'position');
    const timeUniform = gl.getUniformLocation(program, 'time');
    const resolutionUniform = gl.getUniformLocation(program, 'resolution');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      const rect = canvas.getBoundingClientRect();
      const width = Math.floor(rect.width * dpr);
      const height = Math.floor(rect.height * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);

    const render = (now: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      if (resolutionUniform) gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      if (timeUniform) gl.uniform1f(timeUniform, now * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setSubmitting(true);
      await signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed.';
      setAuthError(message);
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden pt-24 text-white">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.85),rgba(8,10,18,0.3)_60%,transparent)]" />

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-[1560px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[3fr_2fr] lg:px-6">
        <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[30px] bg-black/45 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-[6px] sm:p-8 lg:-ml-16 xl:-ml-24">
          <div className="overflow-hidden rounded-2xl shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
            <iframe
              className="aspect-video w-full"
              src="https://www.youtube.com/embed/M7lc1UVf-VE?rel=0"
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <div className="mt-8">
            <p className="text-[clamp(5rem,16vw,14rem)] font-black uppercase leading-[0.82] tracking-[-0.035em] text-white/95 [font-family:'Impact','Arial_Black',sans-serif]">
              NAILART
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-end lg:pl-14 xl:pl-24">
          <div className="w-full max-w-lg rounded-[32px] bg-white/[0.04] p-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-[24px] [font-family:'Space_Grotesk',sans-serif] sm:p-10">
            <p className="text-lg font-medium text-white/80">Sign in with Google to continue.</p>
            <p className="mt-1 text-sm text-white/60">
              {user ? 'You are already signed in.' : 'One click gets you into Nailart AI.'}
            </p>

            {user ? (
              <Link
                href="/"
                className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[rgba(12,16,28,0.92)] px-5 py-4 text-base font-bold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26),0_14px_34px_rgba(0,0,0,0.45)]"
              >
                Go to Home
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[rgba(12,16,28,0.92)] px-5 py-4 text-base font-bold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26),0_14px_34px_rgba(0,0,0,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-black text-black">G</span>
                {submitting ? 'Redirecting...' : 'Continue with Google'}
              </button>
            )}

            {authError && <p className="mt-3 text-sm text-red-300">{authError}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
