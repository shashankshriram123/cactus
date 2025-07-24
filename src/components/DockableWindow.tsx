import React, { useState, useRef, useEffect } from 'react';
import './DockableWindow.css';

interface DockableWindowProps {
  title: string;
  isFloating: boolean;
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  zIndex: number;
  onDragStart: () => void;
  onDrag: (pos: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onToggleFloat: () => void;
  children: React.ReactNode;
}

export const DockableWindow: React.FC<DockableWindowProps> = ({
  title,
  isFloating,
  position,
  size,
  zIndex,
  onDragStart,
  onDrag,
  onResize,
  onToggleFloat,
  children,
}) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // --- Dragging Logic ---
  useEffect(() => {
    if (!isFloating || !headerRef.current) return;

    const header = headerRef.current;
    let initialMousePos = { x: 0, y: 0 };
    let initialWindowPos = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - initialMousePos.x;
      const dy = e.clientY - initialMousePos.y;
      onDrag({ x: initialWindowPos.x + dx, y: initialWindowPos.y + dy });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDown = (e: MouseEvent) => {
      onDragStart();
      initialMousePos = { x: e.clientX, y: e.clientY };
      initialWindowPos = position;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    header.addEventListener('mousedown', handleMouseDown);
    return () => header.removeEventListener('mousedown', handleMouseDown);
  }, [isFloating, onDrag, onDragStart, position]);

  // --- Resizing Logic ---
  useEffect(() => {
    if (!isFloating || !windowRef.current) return;

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    windowRef.current.appendChild(handle);

    const handleResize = (e: MouseEvent) => {
        const newWidth = e.clientX - position.x;
        const newHeight = e.clientY - position.y;
        onResize({ width: Math.max(300, newWidth), height: Math.max(200, newHeight) });
    };

    const stopResize = () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    };

    const startResize = (e: MouseEvent) => {
        e.stopPropagation();
        onDragStart();
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    };

    handle.addEventListener('mousedown', startResize);

    return () => {
        if (windowRef.current && handle.parentNode === windowRef.current) {
            windowRef.current.removeChild(handle);
        }
    };
}, [isFloating, onResize, position, onDragStart]);


  const style: React.CSSProperties = isFloating
    ? {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
      }
    : {};

  return (
    <div
      ref={windowRef}
      className={`dockable-window ${isFloating ? 'floating' : ''}`}
      style={style}
    >
      <div ref={headerRef} className="window-header">
        <span className="window-title">{title}</span>
        <button className="window-toggle-btn" onClick={onToggleFloat}>
          {isFloating ? '⇲' : '⇱'}
        </button>
      </div>
      <div className="window-content">{children}</div>
    </div>
  );
};
