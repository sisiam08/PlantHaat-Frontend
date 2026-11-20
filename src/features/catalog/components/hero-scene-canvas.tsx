"use client";

import { useEffect, useRef } from "react";

interface SwayState {
  frames: number;
  paused: boolean;
  ready: boolean;
  active: boolean;
}

declare global {
  interface Window {
    __heroSway?: SwayState;
  }
}

const VERTEX = `
attribute vec2 p;
uniform vec4 uRect;
varying vec2 vUv;
void main() {
  vUv = vec2(p.x, 1.0 - p.y);
  gl_Position = vec4(mix(uRect.xy, uRect.zw, p), 0.0, 1.0);
}
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec2 uPivot;
uniform float uAmp;
uniform float uAspect;
uniform float uPhase;
uniform float uTime;
uniform float uGlobalAmp;
uniform float uGust;
varying vec2 vUv;

void main() {
  float t = uTime + uPhase;
  vec2 q = (vUv - uPivot) * vec2(uAspect, 1.0);
  float r = length(q);
  float an = atan(q.y, q.x + 1e-4);
  float gu = 0.55 + 0.45 * sin(t * 0.6 - q.x * 2.2);
  float sw = sin(t * 1.1 + an * 2.0) * 0.6 + sin(t * 1.8 + an * 3.0 + 1.3) * 0.4;
  float m = smoothstep(uPivot.y + 0.06, uPivot.y - 0.02, vUv.y);
  float th = (0.036 * sw * gu + 0.015 * uGust) * uGlobalAmp * uAmp * m * smoothstep(0.04, 0.55, r);
  vec2 o = vec2(-q.y, q.x) * th;
  o.x /= uAspect;
  o += vec2(sin(t * 2.7 + vUv.x * 9.0 + vUv.y * 7.0), cos(t * 2.3 + vUv.x * 7.0 - vUv.y * 9.0))
    * 0.0011 * gu * uAmp * m * smoothstep(0.2, 0.55, r);
  gl_FragColor = texture2D(uTex, vUv - o);
}
`;

type PlantImage = HTMLImageElement & {
  dataset: DOMStringMap & {
    order?: string;
    pivotX?: string;
    pivotY?: string;
    amp?: string;
    phase?: string;
    aspect?: string;
  };
};

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error("shader compile");
  }
  return shader;
}

export function HeroSceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    if (!canvas || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) {
      return;
    }
    if (!document.createElement("canvas").getContext("webgl")) return;

    const images = [...stage.querySelectorAll<PlantImage>("img[data-hero-plant]")].sort(
      (a, b) => Number(a.dataset.order ?? 0) - Number(b.dataset.order ?? 0),
    );
    if (images.length !== 4) return;

    let disposed = false;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let textures: WebGLTexture[] = [];
    let raf = 0;
    let startedAt = 0;
    let lastDraw = 0;
    let running = false;
    let ready = false;
    let visible = false;
    let inited = false;
    let fallback = false;
    let dpr = Math.min(
      1.5,
      Math.max(
        1,
        (window.navigator.hardwareConcurrency ?? 8) <= 4 ||
          ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2
          ? 1
          : window.devicePixelRatio,
      ),
    );
    const lowPower =
      (window.navigator.hardwareConcurrency ?? 8) <= 4 ||
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 2;
    let frameAvg = 16;
    let dprDropped = false;
    let slowSince = 0;
    let fallbackSince = 0;
    const state: SwayState = { frames: 0, paused: true, ready: false, active: false };
    window.__heroSway = state;
    const pointer = { target: 0, value: 0 };
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const unis: Record<string, WebGLUniformLocation | null> = {};

    const showStatic = () => {
      state.active = false;
      state.ready = false;
      state.paused = true;
      stage.removeAttribute("data-hero-ready");
      canvas.style.opacity = "0";
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    };

    const teardown = () => {
      showStatic();
      if (gl) {
        for (const texture of textures) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        textures = [];
        gl = null;
      }
      canvas.removeEventListener("webglcontextlost", onLost);
    };

    const onLost = (event: Event) => {
      event.preventDefault();
      fallback = true;
      teardown();
    };
    canvas.addEventListener("webglcontextlost", onLost, true);

    const resize = () => {
      if (!gl) return;
      const width = Math.max(1, Math.round(stage.clientWidth * dpr));
      const height = Math.max(1, Math.round(stage.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const draw = (now: number) => {
      if (!gl || !program || !buffer || fallback) return;
      if (!startedAt) startedAt = now;
      const time = (now - startedAt) / 1000;
      pointer.value += (pointer.target - pointer.value) * 0.05;
      resize();
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const position = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(unis.uTime, time);
      gl.uniform1f(unis.uGlobalAmp, 0.9);
      gl.uniform1f(unis.uGust, pointer.value);
      const stageRect = stage.getBoundingClientRect();
      for (let index = 0; index < images.length; index += 1) {
        const img = images[index];
        const rect = img.getBoundingClientRect();
        const x0 = ((rect.left - stageRect.left) / stageRect.width) * 2 - 1;
        const y0 = 1 - ((rect.bottom - stageRect.top) / stageRect.height) * 2;
        const x1 = ((rect.right - stageRect.left) / stageRect.width) * 2 - 1;
        const y1 = 1 - ((rect.top - stageRect.top) / stageRect.height) * 2;
        gl.bindTexture(gl.TEXTURE_2D, textures[index]);
        gl.uniform4f(unis.uRect, x0, y0, x1, y1);
        gl.uniform2f(
          unis.uPivot,
          Number(img.dataset.pivotX ?? 0.5),
          Number(img.dataset.pivotY ?? 0.7),
        );
        gl.uniform1f(unis.uAmp, Number(img.dataset.amp ?? 0.5));
        gl.uniform1f(unis.uAspect, Number(img.dataset.aspect ?? 1));
        gl.uniform1f(unis.uPhase, Number(img.dataset.phase ?? 0));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      state.frames += 1;
    };

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const pageHidden = document.visibilityState === "hidden";
      if (!ready || !visible || pageHidden) {
        state.paused = true;
        return;
      }
      const interval = lowPower ? 1000 / 30 : 1000 / 45;
      if (now - lastDraw < interval) return;
      const delta = lastDraw ? now - lastDraw : interval;
      lastDraw = now;
      frameAvg = frameAvg * 0.9 + Math.min(delta, 100) * 0.1;
      if (frameAvg > 24) {
        if (!slowSince) slowSince = now;
        if (!dprDropped && now - slowSince > 2000) {
          dpr = 1;
          dprDropped = true;
          slowSince = 0;
          resize();
        } else if (dprDropped && !fallbackSince) {
          fallbackSince = now;
        }
      } else {
        slowSince = 0;
        fallbackSince = 0;
      }
      if (dprDropped && fallbackSince && now - fallbackSince > 2000) {
        fallback = true;
        showStatic();
        return;
      }
      state.paused = false;
      draw(now);
    };

    const startLoop = () => {
      if (running || disposed) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const idle = (callback: () => void) => {
      const ric = (
        window as Window & {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (typeof ric === "function") ric(callback, { timeout: 1200 });
      else window.setTimeout(callback, 250);
    };

    const init = async () => {
      if (inited || disposed || fallback) return;
      inited = true;
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      if (!gl) {
        fallback = true;
        return;
      }
      try {
        const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
        const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
        program = gl.createProgram();
        if (!program) throw new Error("program");
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
        gl.useProgram(program);
        for (const name of [
          "uTex",
          "uPivot",
          "uAmp",
          "uAspect",
          "uPhase",
          "uTime",
          "uGlobalAmp",
          "uGust",
          "uRect",
        ]) {
          unis[name] = gl.getUniformLocation(program, name);
        }
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.uniform1i(unis.uTex, 0);

        for (let index = 0; index < images.length; index += 1) {
          const img = images[index];
          if (!img.complete) {
            await new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            });
          }
          await img.decode().catch(() => undefined);
          if (disposed) return;
          const texture = gl.createTexture();
          if (!texture) throw new Error("texture");
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          textures.push(texture);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        if (disposed) return;
        ready = true;
        state.ready = true;
        state.active = true;
        resize();
        canvas.style.opacity = "1";
        stage.setAttribute("data-hero-ready", "true");
        startLoop();
      } catch {
        fallback = true;
        teardown();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer) return;
      const rect = stage.getBoundingClientRect();
      pointer.target = Math.max(
        -1,
        Math.min(1, ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2),
      );
    };
    const onPointerLeave = () => {
      pointer.target = 0;
    };
    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) {
          state.paused = true;
          return;
        }
        idle(() => void init());
        if (ready) startLoop();
      },
      { rootMargin: "220px" },
    );
    observer.observe(stage);

    const onVisibility = () => {
      state.paused = document.hidden || !visible;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onLost, true);
      if (raf) cancelAnimationFrame(raf);
      if (gl) {
        for (const texture of textures) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      delete window.__heroSway;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-hero-canvas
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 size-full opacity-0 transition-opacity duration-500 motion-reduce:transition-none"
    />
  );
}
