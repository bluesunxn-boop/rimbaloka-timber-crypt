import { useEffect, useRef } from 'react';
import { getSpriteAtlas, SpriteAtlas } from '../game/sprites';

interface PixelSpritePreviewProps {
  spriteKey: Exclude<keyof SpriteAtlas, 'biomes'>;
  size?: number;
  className?: string;
}

export function PixelSpritePreview({
  spriteKey,
  size = 64,
  className = '',
}: PixelSpritePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const atlas = getSpriteAtlas();
    const src = atlas[spriteKey];
    if (!(src instanceof HTMLCanvasElement)) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    const scale = Math.min(size / src.width, size / src.height);
    const dw = src.width * scale;
    const dh = src.height * scale;
    ctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }, [spriteKey, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated ${className}`}
    />
  );
}
