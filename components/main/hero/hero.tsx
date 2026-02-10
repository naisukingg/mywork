'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

export type AetherHeroProps = {
  fragmentSource?: string;
  dprMax?: number;
  clearColor?: [number, number, number, number];
  height?: string | number;
  className?: string;
  ariaLabel?: string;
};

const DEFAULT_FRAG = `#version 300 es
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

const VERT_SRC = `#version 300 es
precision highp float;
in vec2 position;
void main(){ gl_Position = vec4(position, 0.0, 1.0); }
`;

export default function AetherHero({
  fragmentSource = DEFAULT_FRAG,
  dprMax = 2,
  clearColor = [0, 0, 0, 1],
  height = '100vh',
  className = '',
  ariaLabel = 'YouTube thumbnail AI hero background',
}: AetherHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufRef = useRef<WebGLBuffer | null>(null);
  const uniTimeRef = useRef<WebGLUniformLocation | null>(null);
  const uniResRef = useRef<WebGLUniformLocation | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true });
    if (!gl) return;

    const compileShader = (source: string, type: number) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || 'Unknown shader error';
        gl.deleteShader(shader);
        throw new Error(info);
      }
      return shader;
    };

    const createProgram = (vs: string, fs: string) => {
      const vertex = compileShader(vs, gl.VERTEX_SHADER);
      const fragment = compileShader(fs, gl.FRAGMENT_SHADER);
      const program = gl.createProgram()!;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) || 'Program link error';
        gl.deleteProgram(program);
        throw new Error(info);
      }
      return program;
    };

    let prog: WebGLProgram;
    try {
      prog = createProgram(VERT_SRC, fragmentSource);
    } catch (error) {
      console.error(error);
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
      const width = Math.floor(Math.max(1, rect.width) * dpr);
      const height = Math.floor(Math.max(1, rect.height) * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    fit();
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(canvas);
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
      resizeObserver.disconnect();
      window.removeEventListener('resize', fit);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (bufRef.current) gl.deleteBuffer(bufRef.current);
      if (programRef.current) gl.deleteProgram(programRef.current);
    };
  }, [clearColor, dprMax, fragmentSource]);

  return (
    <section
      style={{ minHeight: height }}
      className={`thumbnail-hero relative overflow-hidden ${className}`}
      aria-label="Hero"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="absolute inset-0 block h-full w-full"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,18,0.82),rgba(8,10,18,0.92))]"
      />

      <div
        id="get-started"
        className="relative z-[2] mx-auto max-w-[760px] px-6 pb-10 pt-[340px] text-center text-white [font-family:'Indie_Flower',cursive]"
      >
        <h1 className="m-0 text-[clamp(2.3rem,7vw,4.8rem)] leading-[1.02]">
          AI-Powered
          <br />
          Youtube Thumbnails
        </h1>

        <p className="mx-auto mt-5 whitespace-pre-line text-[clamp(1.15rem,2.8vw,1.6rem)] leading-[1.4] text-white/85">
          {'create click-worthy thumbnails in seconds.\nLet AI design professional visuals for your videos'}
        </p>

        <Link
          href="/auth"
          className="mt-[22px] inline-block rounded-[14px] bg-[rgba(12,16,28,0.92)] px-7 py-3 text-base font-bold text-white no-underline shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.26),0_14px_34px_rgba(0,0,0,0.45)]"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}
