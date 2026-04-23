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

  // Capture НЕ делаем при pointerdown — иначе clicks на детей (rect маршрута,
  // circle города) перехватываются SVG, и claim-route модалка не открывается.
  // Capture ставим только после того как пользователь реально двинулся
  // > threshold — тогда ясно, что это drag карты, а не клик.
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
          <pattern id="sea" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <rect width="60" height="60" fill="#a8c8d8" />
            <path
              d="M 0 20 Q 15 14, 30 20 T 60 20"
              stroke="#7ea6b8"
              strokeWidth="0.9"
              fill="none"
              opacity="0.55"
            />
            <path
              d="M 0 40 Q 15 46, 30 40 T 60 40"
              stroke="#7ea6b8"
              strokeWidth="0.7"
              fill="none"
              opacity="0.35"
            />
          </pattern>
        </defs>

        {/* Sea */}
        <rect width="1200" height="900" fill="url(#sea)" />

        {/* Land masses. Стилизованный контур Европы (материк, Британия,
            Скандинавия). Геометрия подобрана так, чтобы все 47 городов
            с запасом находились на суше; Италия и Сицилия — часть материка
            без прорисовки Адриатики, это намеренное упрощение. */}
        <g fill="url(#paper)" stroke="#6b4226" strokeWidth="1.8" strokeLinejoin="round">
          {/* Main continent */}
          <path
            d="
              M 0 790
              L 0 480
              L 55 415
              L 100 360
              L 175 345
              L 260 315
              L 330 280
              L 410 240
              L 500 215
              L 620 200
              L 740 195
              L 775 140
              L 830 100
              L 890 95
              L 955 120
              L 1005 170
              L 1055 230
              L 1100 320
              L 1145 430
              L 1180 560
              L 1180 680
              L 1125 755
              L 1035 770
              L 925 770
              L 810 775
              L 720 780
              L 640 780
              L 580 790
              L 510 800
              L 440 800
              L 370 780
              L 320 760
              L 270 735
              L 220 720
              L 180 725
              L 140 745
              L 100 765
              L 50 785
              Z
            "
          />

          {/* Britain */}
          <path
            d="
              M 95 115
              L 105 75
              L 150 50
              L 225 45
              L 285 75
              L 315 125
              L 325 180
              L 315 235
              L 285 275
              L 245 290
              L 195 290
              L 150 280
              L 115 255
              L 90 210
              L 85 155
              Z
            "
          />

          {/* Scandinavia */}
          <path
            d="
              M 395 40
              L 455 25
              L 520 30
              L 580 50
              L 620 85
              L 645 130
              L 650 170
              L 620 190
              L 560 198
              L 505 185
              L 465 160
              L 430 130
              L 405 90
              Z
            "
          />
        </g>

        {/* Горные хребты на суше */}
        <g pointerEvents="none">
          {/* Переиспользуемый шаблон горной гряды через <g> с transform'ами */}
          {[
            { x: 420, y: 442, scale: 1.0, label: 'Альпы' },
            { x: 260, y: 555, scale: 0.85, label: 'Пиренеи' },
            { x: 665, y: 398, scale: 0.9, label: 'Карпаты' },
            { x: 1048, y: 478, scale: 0.95, label: 'Кавказ' },
          ].map((m) => (
            <g key={m.label} transform={`translate(${m.x} ${m.y}) scale(${m.scale})`}>
              <path
                d="M -16 0 L -6 -22 L 4 0 Z"
                fill="#a68855"
                stroke="#5a4022"
                strokeWidth="0.6"
              />
              <path
                d="M -6 -22 L -2 -28 L 2 -22 Z"
                fill="#fdf6e3"
                stroke="#8a7454"
                strokeWidth="0.4"
              />
              <path
                d="M -4 0 L 7 -18 L 17 0 Z"
                fill="#a68855"
                stroke="#5a4022"
                strokeWidth="0.6"
              />
              <path
                d="M 7 -18 L 10 -24 L 13 -18 Z"
                fill="#fdf6e3"
                stroke="#8a7454"
                strokeWidth="0.4"
              />
              <path
                d="M 11 0 L 19 -14 L 27 0 Z"
                fill="#a68855"
                stroke="#5a4022"
                strokeWidth="0.6"
              />
            </g>
          ))}
        </g>

        {/* Солнышко в левом верхнем углу моря */}
        <g transform="translate(60 58)" pointerEvents="none">
          <g stroke="#d49d28" strokeWidth="2" opacity="0.75" strokeLinecap="round">
            <line x1="0" y1="-30" x2="0" y2="-22" />
            <line x1="21" y1="-21" x2="16" y2="-16" />
            <line x1="30" y1="0" x2="22" y2="0" />
            <line x1="21" y1="21" x2="16" y2="16" />
            <line x1="0" y1="30" x2="0" y2="22" />
            <line x1="-21" y1="21" x2="-16" y2="16" />
            <line x1="-30" y1="0" x2="-22" y2="0" />
            <line x1="-21" y1="-21" x2="-16" y2="-16" />
          </g>
          <circle r="18" fill="#f5cc54" stroke="#d49d28" strokeWidth="1.2" />
          <circle cx="-5" cy="-3" r="1.4" fill="#6b4226" />
          <circle cx="5" cy="-3" r="1.4" fill="#6b4226" />
          <path
            d="M -5 5 Q 0 10, 5 5"
            stroke="#6b4226"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        </g>

        {/* Компас-роза в правом-верхнем углу моря (над Москвой/СПб) */}
        <g transform="translate(1100 80)" pointerEvents="none">
          <circle r="32" fill="#efe0bb" opacity="0.9" stroke="#6b4226" strokeWidth="1.2" />
          <circle r="20" fill="none" stroke="#6b4226" strokeWidth="0.6" />
          <path d="M 0 -30 L 4 0 L 0 30 L -4 0 Z" fill="#8a6b48" opacity="0.85" />
          <path d="M -30 0 L 0 -4 L 30 0 L 0 4 Z" fill="#c4a87f" opacity="0.85" />
          <text x="0" y="-36" textAnchor="middle" fontSize="11" fill="#6b4226" fontFamily="Georgia, serif" fontWeight="bold">С</text>
          <text x="0" y="46" textAnchor="middle" fontSize="11" fill="#6b4226" fontFamily="Georgia, serif" fontWeight="bold">Ю</text>
          <text x="-40" y="4" textAnchor="middle" fontSize="11" fill="#6b4226" fontFamily="Georgia, serif" fontWeight="bold">З</text>
          <text x="40" y="4" textAnchor="middle" fontSize="11" fill="#6b4226" fontFamily="Georgia, serif" fontWeight="bold">В</text>
        </g>

        {/* Двойная рамка карты */}
        <rect
          x="5"
          y="5"
          width="1190"
          height="890"
          fill="none"
          stroke="#6b4226"
          strokeWidth="3"
          rx="8"
          pointerEvents="none"
        />
        <rect
          x="14"
          y="14"
          width="1172"
          height="872"
          fill="none"
          stroke="#6b4226"
          strokeWidth="0.8"
          rx="5"
          pointerEvents="none"
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
