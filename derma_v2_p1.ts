import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card,
  CardHead,
  DashIcon,
  DonutChart,
  Legend,
  Bars,
  LineChart,
  ChartFrame,
  PATHS,
  PUR,
  BLU,
  ORA,
  PNK,
  GRN,
  TEA,
  GRY,
  FACE,
  UpEl,
} from './dashboardUtils';
import { api } from '../../services/api';

// Toast Notification
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: ok ? '#0f5132' : '#842029',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        fontSize: '0.86rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'slideUp 0.25s ease',
      }}
    >
      <span>{ok ? '✓' : '⚠'}</span>
      <span>{msg}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1rem',
          marginLeft: '8px',
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// Fullscreen Photo Viewer Modal
function PhotoViewer({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(5,4,20,0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
        <img
          src={src}
          alt={name}
          style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '20px', objectFit: 'contain', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', display: 'block' }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: -12,
            right: -12,
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: '#fff',
            border: 'none',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          ×
        </button>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', marginTop: '12px', fontWeight: 500 }}>
          {name} · Press Esc to close
        </div>
      </div>
    </div>
  );
}

// Professional DP Cropper Modal (Exact Admin & Consultant Standard)
function CropModal({ src, onSave, onCancel }: { src: string; onSave: (cropped: string) => void; onCancel: () => void }) {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number; offX: number; offY: number }>({ x: 0, y: 0, offX: 0, offY: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const VIEW_SIZE = 280;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!imageObj) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = VIEW_SIZE;
    canvas.height = VIEW_SIZE;
    ctx.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    const baseScale = Math.max(VIEW_SIZE / imageObj.naturalWidth, VIEW_SIZE / imageObj.naturalHeight);
    const currentScale = baseScale * zoom;
    const renderW = imageObj.naturalWidth * currentScale;
    const renderH = imageObj.naturalHeight * currentScale;
    const posX = (VIEW_SIZE - renderW) / 2 + offset.x;
    const posY = (VIEW_SIZE - renderH) / 2 + offset.y;

    ctx.drawImage(imageObj, posX, posY, renderW, renderH);

    const previewCanvas = previewCanvasRef.current;
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      if (pCtx) {
        previewCanvas.width = 64;
        previewCanvas.height = 64;
        pCtx.clearRect(0, 0, 64, 64);
        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(32, 32, 32, 0, Math.PI * 2);
        pCtx.clip();
        pCtx.drawImage(canvas, 0, 0, 64, 64);
        pCtx.restore();
      }
    }
  }, [imageObj, zoom, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.offX + dx, y: dragStart.current.offY + dy });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom(z => Math.min(Math.max(1, z + delta), 3.5));
  };

  const handleSave = () => {
    if (!imageObj) return;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 400;
    outCanvas.height = 400;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    const baseScale = Math.max(VIEW_SIZE / imageObj.naturalWidth, VIEW_SIZE / imageObj.naturalHeight);
    const currentScale = baseScale * zoom;
    const renderW = imageObj.naturalWidth * currentScale;
    const renderH = imageObj.naturalHeight * currentScale;
    const posX = (VIEW_SIZE - renderW) / 2 + offset.x;
    const posY = (VIEW_SIZE - renderH) / 2 + offset.y;

    const outScale = 400 / VIEW_SIZE;
    ctx.drawImage(imageObj, posX * outScale, posY * outScale, renderW * outScale, renderH * outScale);
    onSave(outCanvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '28px', width: '380px', maxWidth: '92vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Crop Profile Photo</div>
          <button onClick={onCancel} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', color: '#64748b', display: 'grid', placeItems: 'center' }}>×</button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748b' }}>Drag to position & use slider to zoom</p>

        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            position: 'relative',
            width: VIEW_SIZE,
            height: VIEW_SIZE,
            margin: '0 auto',
            borderRadius: '20px',
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            background: '#090d16',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
            userSelect: 'none',
          }}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            borderRadius: '50%',
            border: '2px dashed rgba(255,255,255,0.85)',
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.5)',
          }} />
        </div>

        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: PUR }}
          />
        </div>

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '11px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ flex: 1, padding: '11px', borderRadius: '12px', border: 'none', background: PUR, color: '#fff', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', boxShadow: `0 4px 12px ${PUR}40` }}
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
}

const EmptyState = ({ icon, message }: { icon: string; message: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', gap: '10px' }}>
    <span style={{ fontSize: '2.4rem' }}>{icon}</span>
    <span style={{ fontSize: '0.86rem', color: '#94a3b8', textAlign: 'center', lineHeight: 1.5, maxWidth: '380px' }}>{message}</span>
  </div>
);

export interface DermaWorkspaceProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}
