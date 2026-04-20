import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const VERTEX_SHADER = `
  attribute vec4 position;
  void main() {
    gl_Position = position;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_resolution;

  // Gold palette
  vec3 goldDark  = vec3(0.12, 0.09, 0.07);   // hsl(30 15% 10%)
  vec3 goldMid   = vec3(0.45, 0.34, 0.18);   // hsl(38 45% 32%)
  vec3 goldBright= vec3(0.72, 0.58, 0.32);   // hsl(38 55% 52%)
  vec3 ivory     = vec3(0.96, 0.94, 0.89);   // hsl(40 25% 93%)

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p, int octaves) {
    float v = 0.0, amp = 0.5, freq = 1.0;
    for (int i = 0; i < 8; i++) {
      if (i >= octaves) break;
      v += amp * noise(p * freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv.y = 1.0 - uv.y;

    float t = u_time * 0.08;
    vec2 p = uv * 3.0;

    float n1 = fbm(p + vec2(t * 0.4, t * 0.2), 6);
    float n2 = fbm(p + vec2(n1 * 1.2, t * 0.15) + vec2(1.7, 9.2), 5);
    float n3 = fbm(p - vec2(n2, n1) * 0.8 + vec2(t * 0.3, 0.0), 4);

    float cloudMask = smoothstep(0.3, 0.75, n3);
    float glow = pow(cloudMask, 2.5);

    // Radial vignette
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 1.8;
    vignette = clamp(vignette, 0.0, 1.0);

    // Horizontal atmospheric gradient
    float horizon = 1.0 - uv.y;
    horizon = pow(horizon, 2.0) * 0.6;

    vec3 col = mix(goldDark, goldMid, cloudMask * 0.7);
    col = mix(col, goldBright, glow * 0.5);
    col = mix(col, ivory, smoothstep(0.7, 1.0, glow) * 0.15);

    // Gold streaks
    float streak = fbm(vec2(uv.x * 8.0 + t * 0.2, uv.y * 2.0), 3);
    col += goldBright * pow(streak, 4.0) * 0.3;

    col *= vignette;
    col += goldMid * horizon * 0.3;

    // Subtle shimmer particles
    float sparkle = hash(floor(uv * 180.0) + floor(t * 3.0));
    sparkle = pow(sparkle, 18.0) * 0.6;
    col += ivory * sparkle;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vs);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

interface AnimatedShaderHeroProps {
  className?: string;
  fallbackClassName?: string;
}

export function AnimatedShaderHero({ className = 'absolute inset-0', fallbackClassName }: AnimatedShaderHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile || prefersReducedMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    if (!gl) { setWebglFailed(true); return; }

    const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) { setWebglFailed(true); return; }

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, [isMobile, prefersReducedMotion]);

  const showFallback = isMobile || prefersReducedMotion || webglFailed;

  if (showFallback) {
    return (
      <div
        className={className + (fallbackClassName ? ' ' + fallbackClassName : '')}
        style={{ background: 'linear-gradient(135deg, hsl(30 15% 8%) 0%, hsl(30 15% 12%) 40%, hsl(38 35% 22%) 70%, hsl(38 45% 32%) 100%)' }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
