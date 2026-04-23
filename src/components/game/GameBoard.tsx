import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useGameStore } from '../../hooks/useGameStore';
import { CityMarker } from './board/CityMarker';
import { RouteView } from './board/RouteView';

const VB_W = 1200;
const VB_H = 900;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.3;
const DRAG_THRESHOLD_PX = 5;

interface View {
  zoom: number;
  panX: number;
  panY: number;
}

function clampPan(panX: number, panY: number, zoom: number): { panX: number; panY: number } {
  const maxX = (VB_W - VB_W / zoom) / 2;
  const maxY = (VB_H - VB_H / zoom) / 2;
  return {
    panX: Math.max(-maxX, Math.min(maxX, panX)),
    panY: Math.max(-maxY, Math.min(maxY, panY)),
  };
}

export function GameBoard() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const selectedRouteId = useGameStore((s) => s.selectedRouteId);
  const selectedCityId = useGameStore((s) => s.selectedCityId);
  const selectRoute = useGameStore((s) => s.selectRoute);
  const selectCity = useGameStore((s) => s.selectCity);

  const [view, setView] = useState<View>({ zoom: 1, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    dragging: boolean;
  } | null>(null);

  const zoomBy = useCallback((factor: number) => {
    setView((v) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
      if (newZoom === v.zoom) return v;
      const { panX, panY } = clampPan(v.panX, v.panY, newZoom);
      return { zoom: newZoom, panX, panY };
    });
  }, []);

  const resetView = useCallback(() => {
    setView({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  // Нативный wheel-обработчик: React даёт passive event, из-за чего
  // preventDefault() не работает и страница скроллится вместе с зумом.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheelNative = (e: WheelEvent): void => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setView((v) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
        if (newZoom === v.zoom) return v;
        const { panX, panY } = clampPan(v.panX, v.panY, newZoom);
        return { zoom: newZoom, panX, panY };
      });
    };
    svg.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      svg.removeEventListener('wheel', onWheelNative);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>): void => {
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: view.panX,
      origY: view.panY,
      dragging: false,
    };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>): void => {
    const s = dragRef.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    s.dragging = true;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = VB_W / view.zoom / rect.width;
    const scaleY = VB_H / view.zoom / rect.height;
    const { panX, panY } = clampPan(s.origX - dx * scaleX, s.origY - dy * scaleY, view.zoom);
    setView((v) => ({ ...v, panX, panY }));
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>): void => {
    const svg = svgRef.current;
    if (svg) {
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    // Очищаем dragRef после текущего цикла, чтобы onSvgClick мог увидеть dragging.
    setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  const onSvgClick = (): void => {
    if (dragRef.current?.dragging) return;
    selectRoute(null);
    selectCity(null);
  };

  if (!state) return null;

  const canClick = state.phase === 'idle';

  const vbW = VB_W / view.zoom;
  const vbH = VB_H / view.zoom;
  const vbX = (VB_W - vbW) / 2 + view.panX;
  const vbY = (VB_H - vbH) / 2 + view.panY;

  const zoomInDisabled = view.zoom >= MAX_ZOOM - 0.001;
  const zoomOutDisabled = view.zoom <= MIN_ZOOM + 0.001;

  return (
    <div className="game-board-wrap">
      <svg
        ref={svgRef}
        className="game-board"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={onSvgClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          cursor: dragRef.current?.dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <defs>
          <pattern id="paper" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#efe0bb" />
            <circle cx="5" cy="5" r="0.5" fill="#c4a87f" opacity="0.4" />
            <circle cx="27" cy="19" r="0.4" fill="#c4a87f" opacity="0.5" />
            <circle cx="17" cy="33" r="0.6" fill="#c4a87f" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="1200" height="900" fill="url(#paper)" />
        <rect
          x="5"
          y="5"
          width="1190"
          height="890"
          fill="none"
          stroke="#8a6b48"
          strokeWidth="2"
          rx="6"
        />

        {ctx.routes.map((r) => {
          const from = ctx.citiesById[r.from];
          const to = ctx.citiesById[r.to];
          if (!from || !to) return null;
          return (
            <RouteView
              key={r.id}
              route={r}
              from={from}
              to={to}
              state={state}
              onClick={canClick ? selectRoute : undefined}
              selected={selectedRouteId === r.id}
            />
          );
        })}

        {ctx.cities.map((c) => (
          <CityMarker
            key={c.id}
            city={c}
            state={state}
            onClick={canClick ? selectCity : undefined}
            selected={selectedCityId === c.id}
          />
        ))}
      </svg>

      <div className="map-controls" aria-label="Масштаб карты">
        <button
          type="button"
          className="map-controls__btn"
          onClick={() => zoomBy(ZOOM_STEP)}
          disabled={zoomInDisabled}
          title="Приблизить"
          aria-label="Приблизить"
        >
          +
        </button>
        <button
          type="button"
          className="map-controls__btn"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          disabled={zoomOutDisabled}
          title="Отдалить"
          aria-label="Отдалить"
        >
          −
        </button>
        <button
          type="button"
          className="map-controls__btn map-controls__btn--reset"
          onClick={resetView}
          title="Показать всю карту"
          aria-label="Показать всю карту"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
