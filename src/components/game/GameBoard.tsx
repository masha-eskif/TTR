import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useGameStore } from '../../hooks/useGameStore';
import { CityMarker } from './board/CityMarker';
import { RouteView } from './board/RouteView';

const VB_W = 1500;
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

/**
 * Three-peak mountain silhouette. Used for the Alps, Pyrenees, etc.
 * Centered horizontally, base at y=0.
 */
function MountainIcon({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      {/* Left peak (back) */}
      <path
        d="M -22 0 L -14 -26 L -6 0 Z"
        fill="#9a7a48"
        stroke="#4a2f15"
        strokeWidth="0.5"
      />
      <path
        d="M -16 -22 L -14 -26 L -12 -22 Z"
        fill="#fdf6e3"
        stroke="#9a7a48"
        strokeWidth="0.3"
      />
      {/* Right peak (back) */}
      <path
        d="M 6 0 L 14 -22 L 22 0 Z"
        fill="#9a7a48"
        stroke="#4a2f15"
        strokeWidth="0.5"
      />
      <path
        d="M 12 -19 L 14 -22 L 16 -19 Z"
        fill="#fdf6e3"
        stroke="#9a7a48"
        strokeWidth="0.3"
      />
      {/* Centre peak (front, tallest) */}
      <path
        d="M -10 1 L 0 -32 L 10 1 Z"
        fill="#7a5a30"
        stroke="#3a2008"
        strokeWidth="0.6"
      />
      <path
        d="M -5 -22 L 0 -32 L 5 -22 Z"
        fill="#fdf6e3"
        stroke="#7a5a30"
        strokeWidth="0.4"
      />
      {/* Centre shading */}
      <path d="M 0 -32 L 10 1 L 2 -12 Z" fill="rgba(0,0,0,0.18)" />
    </g>
  );
}

/** Small sailing ship — flat side view */
function Ship({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      pointerEvents="none"
      opacity={0.85}
    >
      {/* Hull */}
      <path
        d="M -16 0 Q -10 6, 14 6 Q 18 4, 16 0 Z"
        fill="#5a3c1a"
        stroke="#2b1c0d"
        strokeWidth="0.5"
      />
      {/* Mast */}
      <line x1="-2" y1="0" x2="-2" y2="-20" stroke="#3a2510" strokeWidth="0.8" />
      <line x1="8" y1="0" x2="8" y2="-22" stroke="#3a2510" strokeWidth="0.8" />
      {/* Sails */}
      <path
        d="M -2 -20 Q -10 -16, -8 -4 L -2 -4 Z"
        fill="#fdf6e3"
        stroke="#6b4226"
        strokeWidth="0.5"
      />
      <path
        d="M -2 -18 Q 6 -14, 6 -4 L -2 -4 Z"
        fill="#fdf6e3"
        stroke="#6b4226"
        strokeWidth="0.5"
      />
      <path
        d="M 8 -22 Q 16 -18, 14 -4 L 8 -4 Z"
        fill="#fdf6e3"
        stroke="#6b4226"
        strokeWidth="0.5"
      />
      {/* Flag */}
      <path d="M 8 -22 L 14 -20 L 8 -18 Z" fill="#b8312f" stroke="#2b1c0d" strokeWidth="0.3" />
    </g>
  );
}

/** Decorative sea monster sketch */
function SeaSerpent({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" opacity={0.5}>
      <path
        d="M -30 0 Q -22 -10, -14 0 Q -6 10, 2 0 Q 10 -10, 18 -2 L 22 -8 L 26 0"
        fill="none"
        stroke="#3a2510"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="-28" cy="-2" r="1" fill="#3a2510" />
      <path
        d="M 22 -8 L 24 -14 L 28 -10"
        fill="none"
        stroke="#3a2510"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </g>
  );
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
    pointerId: number;
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
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: view.panX,
      origY: view.panY,
      dragging: false,
      pointerId: e.pointerId,
    };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>): void => {
    const s = dragRef.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!s.dragging) {
      s.dragging = true;
      try {
        svgRef.current?.setPointerCapture(s.pointerId);
      } catch {
        /* noop */
      }
    }
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = VB_W / view.zoom / rect.width;
    const scaleY = VB_H / view.zoom / rect.height;
    const { panX, panY } = clampPan(s.origX - dx * scaleX, s.origY - dy * scaleY, view.zoom);
    setView((v) => ({ ...v, panX, panY }));
  };

  const onPointerUp = (e: PointerEvent<SVGSVGElement>): void => {
    const s = dragRef.current;
    if (s?.dragging) {
      try {
        svgRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
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
          {/* Aged-paper land texture */}
          <pattern id="paper" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="#e8d5a5" />
            <rect width="60" height="60" fill="url(#paperNoise)" opacity="0.5" />
            <circle cx="8" cy="10" r="0.5" fill="#a87132" opacity="0.4" />
            <circle cx="34" cy="22" r="0.4" fill="#a87132" opacity="0.5" />
            <circle cx="22" cy="42" r="0.6" fill="#a87132" opacity="0.3" />
            <circle cx="48" cy="38" r="0.4" fill="#a87132" opacity="0.4" />
            <circle cx="14" cy="52" r="0.3" fill="#a87132" opacity="0.45" />
          </pattern>
          <radialGradient id="paperNoise" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#f0dcb0" />
            <stop offset="100%" stopColor="#d8b97a" />
          </radialGradient>

          {/* Sea texture */}
          <pattern id="sea" x="0" y="0" width="90" height="60" patternUnits="userSpaceOnUse">
            <rect width="90" height="60" fill="#9bbed0" />
            <path
              d="M 0 16 Q 20 10, 40 16 T 80 16 T 120 16"
              stroke="#6e94aa"
              strokeWidth="0.8"
              fill="none"
              opacity="0.55"
            />
            <path
              d="M 0 32 Q 20 38, 40 32 T 80 32 T 120 32"
              stroke="#6e94aa"
              strokeWidth="0.6"
              fill="none"
              opacity="0.4"
            />
            <path
              d="M 0 48 Q 20 42, 40 48 T 80 48 T 120 48"
              stroke="#6e94aa"
              strokeWidth="0.7"
              fill="none"
              opacity="0.45"
            />
          </pattern>

          {/* Land vignette — darker around edges */}
          <radialGradient id="landVignette" cx="0.5" cy="0.5" r="0.7">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="70%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(74, 47, 21, 0.18)" />
          </radialGradient>

          {/* Drop shadow filter for landmasses */}
          <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" />
            <feOffset dx="1.5" dy="2.5" result="offsetblur" />
            <feFlood floodColor="#3a2510" floodOpacity="0.35" />
            <feComposite in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sea fills entire viewBox */}
        <rect width="1500" height="900" fill="url(#sea)" />

        {/* === Landmasses === */}
        <g
          fill="url(#paper)"
          stroke="#5a3c1a"
          strokeWidth="2.4"
          strokeLinejoin="round"
          filter="url(#landShadow)"
        >
          {/* Main continent — Europe + Iberia + Italy + Balkans/Greece + Anatolia + Russia */}
          <path
            d="
              M 138 322
              Q 175 285, 240 295
              Q 295 318, 320 340
              Q 360 320, 395 295
              Q 432 265, 458 225
              Q 475 192, 492 200
              Q 504 218, 520 232
              Q 555 228, 605 220
              Q 660 207, 705 190
              Q 745 175, 780 130
              Q 818 95, 880 105
              Q 960 120, 1030 150
              Q 1110 175, 1185 215
              Q 1255 265, 1290 345
              Q 1315 425, 1290 500
              Q 1255 555, 1185 585
              Q 1120 608, 1060 624
              Q 1020 645, 982 660
              Q 945 685, 902 700
              Q 850 715, 798 718
              Q 750 720, 712 712
              Q 685 700, 678 685
              Q 672 670, 668 690
              Q 658 705, 642 700
              Q 615 690, 595 672
              Q 582 645, 582 615
              Q 575 605, 565 612
              Q 552 635, 538 640
              Q 500 658, 460 655
              Q 432 645, 425 615
              Q 418 580, 422 545
              Q 425 510, 428 482
              Q 418 510, 402 538
              Q 360 552, 322 575
              Q 282 600, 260 625
              Q 222 670, 178 712
              Q 132 745, 96 750
              Q 48 752, 20 720
              Q 2 670, 14 615
              Q 32 555, 78 528
              Q 130 510, 188 498
              Q 240 483, 232 445
              Q 218 410, 188 400
              Q 152 388, 138 365
              Q 128 345, 138 322
              Z
            "
          />

          {/* British Isles — Great Britain (mainland) */}
          <path
            d="
              M 142 60
              Q 162 42, 196 50
              Q 232 62, 252 82
              Q 275 108, 272 145
              Q 280 178, 290 205
              Q 302 232, 305 258
              Q 320 280, 308 292
              Q 285 304, 256 302
              Q 230 306, 210 292
              Q 188 300, 168 300
              Q 142 295, 128 278
              Q 108 268, 100 245
              Q 92 218, 100 192
              Q 102 165, 110 145
              Q 118 115, 130 88
              Q 138 70, 142 60
              Z
            "
          />

          {/* Ireland */}
          <path
            d="
              M 32 165
              Q 22 145, 48 142
              Q 76 145, 82 175
              Q 80 220, 60 245
              Q 38 252, 28 230
              Q 18 200, 32 165
              Z
            "
          />

          {/* Scandinavia — Norway + Sweden */}
          <path
            d="
              M 390 70
              Q 378 38, 414 25
              Q 442 18, 472 30
              Q 510 32, 545 38
              Q 580 48, 605 75
              Q 632 105, 645 142
              Q 654 178, 642 195
              Q 615 205, 580 200
              Q 540 198, 502 188
              Q 462 178, 438 158
              Q 415 138, 405 115
              Q 396 92, 390 70
              Z
            "
          />

          {/* Sicily */}
          <path
            d="
              M 462 660
              Q 478 654, 510 660
              Q 532 672, 520 692
              Q 498 702, 470 695
              Q 450 685, 462 660
              Z
            "
          />

          {/* Iceland (decorative, far NW) */}
          <path
            d="
              M 58 52
              Q 88 42, 112 56
              Q 122 68, 102 78
              Q 75 82, 58 70
              Q 50 60, 58 52
              Z
            "
          />
        </g>

        {/* === Black Sea overlay (cuts into the continent visually) === */}
        <path
          d="
            M 768 545
            Q 820 528, 880 530
            Q 935 535, 985 555
            Q 1010 580, 990 600
            Q 940 612, 880 612
            Q 820 612, 778 595
            Q 745 575, 768 545
            Z
          "
          fill="url(#sea)"
          stroke="#5a3c1a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* === Land vignette overlay (subtle dark edge on continents) === */}
        <rect
          width="1500"
          height="900"
          fill="url(#landVignette)"
          pointerEvents="none"
        />

        {/* === Mountain ranges === */}
        <g pointerEvents="none">
          {[
            { x: 420, y: 458, scale: 1.05, label: 'Alps' },
            { x: 458, y: 458, scale: 0.85, label: 'Alps E' },
            { x: 232, y: 552, scale: 0.95, label: 'Pyrenees' },
            { x: 678, y: 408, scale: 0.95, label: 'Carpathians' },
            { x: 720, y: 442, scale: 0.8, label: 'Carpathians E' },
            { x: 1042, y: 510, scale: 1.0, label: 'Caucasus' },
            { x: 530, y: 535, scale: 0.85, label: 'Apennines' },
            { x: 632, y: 555, scale: 0.8, label: 'Dinaric' },
            { x: 870, y: 660, scale: 0.85, label: 'Taurus' },
          ].map((m) => (
            <g key={m.label} transform={`translate(${m.x} ${m.y})`}>
              <MountainIcon scale={m.scale} />
            </g>
          ))}
        </g>

        {/* === Sea decorations === */}
        <Ship x={88} y={420} scale={1} />
        <Ship x={680} y={760} scale={0.85} />
        <Ship x={870} y={570} scale={0.7} />
        <SeaSerpent x={1075} y={780} />

        {/* === Sun in NW sea === */}
        <g transform="translate(48 60)" pointerEvents="none">
          <g stroke="#d49d28" strokeWidth="2" opacity="0.7" strokeLinecap="round">
            <line x1="0" y1="-26" x2="0" y2="-20" />
            <line x1="18" y1="-18" x2="14" y2="-14" />
            <line x1="26" y1="0" x2="20" y2="0" />
            <line x1="18" y1="18" x2="14" y2="14" />
            <line x1="0" y1="26" x2="0" y2="20" />
            <line x1="-18" y1="18" x2="-14" y2="14" />
            <line x1="-26" y1="0" x2="-20" y2="0" />
            <line x1="-18" y1="-18" x2="-14" y2="-14" />
          </g>
          <circle r="16" fill="#f5cc54" stroke="#d49d28" strokeWidth="1.2" />
          <circle cx="-4" cy="-3" r="1.2" fill="#6b4226" />
          <circle cx="4" cy="-3" r="1.2" fill="#6b4226" />
          <path
            d="M -4 4 Q 0 8, 4 4"
            stroke="#6b4226"
            strokeWidth="1.1"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* === Compass rose in NE sea === */}
        <g transform="translate(1100 80)" pointerEvents="none">
          <circle r="34" fill="#efe0bb" opacity="0.92" stroke="#6b4226" strokeWidth="1.4" />
          <circle r="26" fill="none" stroke="#6b4226" strokeWidth="0.5" />
          <circle r="18" fill="none" stroke="#6b4226" strokeWidth="0.4" />
          {/* Cardinal points */}
          <path d="M 0 -32 L 5 0 L 0 32 L -5 0 Z" fill="#8a6b48" />
          <path d="M -32 0 L 0 -5 L 32 0 L 0 5 Z" fill="#c4a87f" />
          {/* Diagonal accents */}
          <path d="M -22 -22 L 0 -2 L 22 -22 L 2 0 Z" fill="#8a6b48" opacity="0.55" />
          <path d="M -22 22 L 0 2 L 22 22 L 2 0 Z" fill="#c4a87f" opacity="0.6" />
          <text
            x="0"
            y="-37"
            textAnchor="middle"
            fontSize="11"
            fill="#3a2510"
            fontFamily="Georgia, serif"
            fontWeight="bold"
          >
            С
          </text>
          <text
            x="0"
            y="47"
            textAnchor="middle"
            fontSize="11"
            fill="#3a2510"
            fontFamily="Georgia, serif"
            fontWeight="bold"
          >
            Ю
          </text>
          <text
            x="-43"
            y="4"
            textAnchor="middle"
            fontSize="11"
            fill="#3a2510"
            fontFamily="Georgia, serif"
            fontWeight="bold"
          >
            З
          </text>
          <text
            x="43"
            y="4"
            textAnchor="middle"
            fontSize="11"
            fill="#3a2510"
            fontFamily="Georgia, serif"
            fontWeight="bold"
          >
            В
          </text>
        </g>

        {/* === Sea-name labels === */}
        <g pointerEvents="none" fontFamily="IM Fell English, Georgia, serif" fill="#4a5f72" opacity="0.65">
          <text x="40" y="490" fontSize="18" fontStyle="italic">Atlantic</text>
          <text x="850" y="290" fontSize="14" fontStyle="italic" transform="rotate(-15 850 290)">Baltic</text>
          <text x="500" y="765" fontSize="16" fontStyle="italic">Mediterranean</text>
          <text x="838" y="575" fontSize="11" fontStyle="italic">Black Sea</text>
        </g>

        {/* === Ornamental border === */}
        <g pointerEvents="none">
          {/* Outer thick frame */}
          <rect
            x="6"
            y="6"
            width="1488"
            height="888"
            fill="none"
            stroke="#3a2510"
            strokeWidth="6"
            rx="6"
          />
          {/* Decorative middle stripe */}
          <rect
            x="14"
            y="14"
            width="1472"
            height="872"
            fill="none"
            stroke="#a87132"
            strokeWidth="2"
            rx="4"
          />
          {/* Inner hairline */}
          <rect
            x="22"
            y="22"
            width="1456"
            height="856"
            fill="none"
            stroke="#3a2510"
            strokeWidth="0.6"
            rx="3"
          />
          {/* Corner rosettes */}
          {[
            [22, 22],
            [1478, 22],
            [22, 878],
            [1478, 878],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`} transform={`translate(${cx} ${cy})`}>
              <circle r="10" fill="#efe0bb" stroke="#3a2510" strokeWidth="1.5" />
              <circle r="6" fill="#a87132" stroke="#3a2510" strokeWidth="0.8" />
              <circle r="2.5" fill="#fdf6e3" />
            </g>
          ))}
        </g>

        {/* === Routes === */}
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

        {/* === Cities === */}
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
