"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui";

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SignaturePad({ value, onChange, disabled, className = "" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let hasInk = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) {
        hasInk = true;
        break;
      }
    }
    if (!hasInk) {
      setEmpty(true);
      onChange("");
      return;
    }
    setEmpty(false);
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (value?.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setEmpty(false);
      };
      img.src = value;
    }
  }, [value]);

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setEmpty(false);
  }

  function endDraw() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    exportImage();
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setEmpty(true);
    onChange("");
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`relative h-28 rounded-lg border border-border bg-white touch-none ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair rounded-lg"
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
        />
        {empty && !value && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
            Sign with finger or mouse
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Your signature is stored securely with this response.</p>
        <Button type="button" size="sm" variant="secondary" icon={<Eraser size={12} />} onClick={clear} disabled={disabled}>
          Clear
        </Button>
      </div>
    </div>
  );
}
