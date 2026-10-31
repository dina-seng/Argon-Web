import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeImageProps {
  value: string;
  size?: number;
  className?: string;
  centerText?: string;
}

export function QrCodeImage({ value, size = 220, className = '', centerText }: QrCodeImageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        if (err) {
          console.error('QR generation error:', err);
          setError('Failed to generate QR');
        } else {
          setError(null);
        }
      }
    );
  }, [value, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 text-xs"
      >
        {error}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg block max-w-full h-auto"
      />
      {centerText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="bg-white/95 px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-900 tracking-wider shadow-sm border border-zinc-200">
            {centerText}
          </span>
        </div>
      )}
    </div>
  );
}
