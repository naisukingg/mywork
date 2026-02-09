'use client';

import React, { useEffect, useRef } from 'react';

export type AetherHeroProps = {
  /* ---------- Hero content ---------- */
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;

  align?: 'left' | 'center' | 'right'; // Content alignment
  maxWidth?: number; // px for text container (default 960)
  overlayGradient?: string; // e.g. 'linear-gradient(180deg, #00000080, #00000020 40%, transparent)'
  textColor?: string; // overlay text color (defaults to white)

  /* ---------- Canvas/shader ---------- */
  fragmentSource?: string; // override the shader
  dprMax?: number; // cap DPR (default 2)
  clearColor?: [number, number, number, number];

  /* ---------- Misc ---------- */
  height?: string | number; // default '100vh'
  className?: string;
  ariaLabel?: string;
};

/* Default fragment shader */
const DEFAULT_FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define S smoothstep
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

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`;

export default function AetherHero({
  /* Content */
  title = 'Viral Thumbnails in Seconds, Not Hours.',
  subtitle = 'The most advanced AI engine for YouTube creators. High-conversion designs that get the clicks you deserve.',
  ctaLabel = 'Start Generating',
  ctaHref = '#',
  secondaryCtaLabel = 'Showcase',
  secondaryCtaHref = '#',

  align = 'left',
  maxWidth = 1200,
  overlayGradient = 'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.3) 60%, transparent)',
  textColor = '#ffffff',

  /* Shader */
  fragmentSource = DEFAULT_FRAG,
  dprMax = 2,
  clearColor = [0, 0, 0, 1],

  /* Misc */
  height = '100vh',
  className = '',
  ariaLabel = 'Aether hero background',
}: AetherHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufRef = useRef<WebGLBuffer | null>(null);
  const uniTimeRef = useRef<WebGLUniformLocation | null>(null);
  const uniResRef = useRef<WebGLUniformLocation | null>(null);
  const rafRef = useRef<number | null>(null);

  const compileShader = (gl: WebGL2RenderingContext, src: string, type: number) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(sh) || 'Unknown shader error';
      gl.deleteShader(sh);
      throw new Error(info);
    }
    return sh;
  };
  const createProgram = (gl: WebGL2RenderingContext, vs: string, fs: string) => {
    const v = compileShader(gl, vs, gl.VERTEX_SHADER);
    const f = compileShader(gl, fs, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog) || 'Program link error';
      gl.deleteProgram(prog);
      throw new Error(info);
    }
    return prog;
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) return;
    glRef.current = gl;

    let prog: WebGLProgram;
    try {
      prog = createProgram(gl, VERT_SRC, fragmentSource);
    } catch (e) {
      console.error(e);
      return;
    }
    programRef.current = prog;

    const verts = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
    const buf = gl.createBuffer()!;
    bufRef.current = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    gl.useProgram(prog);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    uniTimeRef.current = gl.getUniformLocation(prog, 'time');
    uniResRef.current = gl.getUniformLocation(prog, 'resolution');

    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);

    const fit = () => {
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprMax));
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const W = Math.floor(cssW * dpr);
      const H = Math.floor(cssH * dpr);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    window.addEventListener('resize', fit);

    const loop = (now: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      if (uniResRef.current) gl.uniform2f(uniResRef.current, canvas.width, canvas.height);
      if (uniTimeRef.current) gl.uniform1f(uniTimeRef.current, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (bufRef.current) gl.deleteBuffer(bufRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
    };
  }, [fragmentSource, dprMax, clearColor]);

  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const textAlign =
    align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';

  return (
    <section
      className={['nailart-hero', className].join(' ')}
      style={{ height, position: 'relative', overflow: 'hidden' }}
      aria-label="Hero"
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap');
      `}</style>

      <canvas
        ref={canvasRef}
        className="nailart-canvas"
        role="img"
        aria-label={ariaLabel}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          userSelect: 'none',
          touchAction: 'none',
        }}
      />

      <div
        className="nailart-overlay"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: overlayGradient,
          pointerEvents: 'none',
        }}
      />

      <div
        className="nailart-content"
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: justify,
          padding: 'min(8vw, 150px)',
          color: textColor,
          fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial",
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth,
            marginInline: align === 'center' ? 'auto' : undefined,
            textAlign,
            display: 'flex',
            flexDirection: align === 'left' ? 'row' : 'column',
            alignItems: 'center',
            gap: '6rem',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1.4 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(3rem, 7.5vw, 6rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.04em',
                fontWeight: 700,
                textShadow: '0 10px 60px rgba(0,0,0,0.6)',
              }}
            >
              {title}
            </h1>

            <p
              style={{
                marginTop: '1.5rem',
                fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
                lineHeight: 1.5,
                opacity: 0.85,
                maxWidth: 650,
                marginInline: align === 'center' ? 'auto' : undefined,
                textShadow: '0 4px 30px rgba(0,0,0,0.5)',
              }}
            >
              {subtitle}
            </p>

            <div
              style={{
                display: 'inline-flex',
                gap: '20px',
                marginTop: '4rem',
                flexWrap: 'wrap',
              }}
            >
              <a
                href={ctaHref}
                style={{
                  padding: '20px 45px',
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #FF0055, #FF5500)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  boxShadow: '0 15px 50px rgba(255, 0, 85, 0.45)',
                  transition: 'all 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 25px 70px rgba(255, 0, 85, 0.65)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(255, 0, 85, 0.45)';
                }}
              >
                {ctaLabel}
              </a>

              <a
                href={secondaryCtaHref}
                style={{
                  padding: '20px 45px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1.2rem',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              >
                {secondaryCtaLabel}
              </a>
            </div>
          </div>

          {/* SVG Artwork - YouTube Thumbnail AI Concept */}
          <div
            style={{
              flex: 1,
              display: align === 'left' ? 'flex' : 'none',
              justifyContent: 'center',
              alignItems: 'center',
              perspective: '1500px',
            }}
          >
            <svg
              width="600"
              height="400"
              viewBox="0 0 600 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                filter: 'drop-shadow(0 40px 120px rgba(0,0,0,0.7))',
                transform: 'rotateY(-25deg) rotateX(15deg)',
              }}
            >
              <rect width="600" height="400" rx="32" fill="url(#main_gradient)" fillOpacity="0.1" />
              <rect x="0.5" y="0.5" width="599" height="399" rx="31.5" stroke="white" strokeOpacity="0.2" />

              {/* Main Thumbnail Viewport */}
              <rect x="30" y="30" width="540" height="304" rx="20" fill="white" fillOpacity="0.05" />

              {/* Play Icon */}
              <circle cx="300" cy="182" r="50" fill="#FF0000" />
              <path d="M325 182L285 205.083V158.917L325 182Z" fill="white" />

              {/* AI Badge */}
              <rect x="440" y="50" width="100" height="40" rx="20" fill="rgba(0, 255, 170, 0.1)" stroke="#00FFAA" strokeOpacity="0.5" />
              <text x="490" y="76" fill="#00FFAA" fontFamily="Space Grotesk" fontWeight="700" fontSize="14" textAnchor="middle">AI ENGINE</text>

              {/* Bottom Info */}
              <rect x="30" y="350" width="180" height="15" rx="7.5" fill="white" fillOpacity="0.2" />
              <rect x="220" y="350" width="100" height="15" rx="7.5" fill="white" fillOpacity="0.1" />

              {/* Floating Element - Thumbnail Frame */}
              <rect x="-40" y="200" width="200" height="112" rx="12" fill="white" fillOpacity="0.05" stroke="white" strokeOpacity="0.3" transform="rotate(-10)">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" dur="4s" repeatCount="indefinite" />
              </rect>

              <defs>
                <linearGradient id="main_gradient" x1="0" y1="0" x2="600" y2="400" gradientUnits="userSpaceOnUse">
                  <stop stopColor="white" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
