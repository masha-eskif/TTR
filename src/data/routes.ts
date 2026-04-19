import type { RouteDef } from '../game/types';

/**
 * Маршруты Ticket to Ride: Europe (реконструкция канонической карты 2008 года).
 *
 * Поля:
 *   from / to              — id города (см. cities.ts)
 *   length                 — 1, 2, 3, 4, 6 или 8 (как в оригинале)
 *   color                  — цвет карт-вагонов; gray = любой одноцветный набор
 *   isFerry / locomotivesRequired — паром, требует N локомотивов в спенде
 *   isTunnel               — тоннель: при клейме хост тянет 3 карты, может потребоваться доплата
 *   parallel               — id парного маршрута (двойные ветки заблокированы при клейме одной в 2 игроках)
 */

// ---------- helpers ----------

function r(
  from: string,
  to: string,
  length: number,
  color: RouteDef['color'],
  extras: Partial<
    Pick<RouteDef, 'isFerry' | 'isTunnel' | 'locomotivesRequired'>
  > = {},
): RouteDef {
  return {
    id: `${from}-${to}-${color}`,
    from,
    to,
    length,
    color,
    isFerry: extras.isFerry ?? false,
    isTunnel: extras.isTunnel ?? false,
    locomotivesRequired: extras.locomotivesRequired ?? 0,
  };
}

function rFerry(
  from: string,
  to: string,
  length: number,
  color: RouteDef['color'],
  locos: number,
): RouteDef {
  return r(from, to, length, color, {
    isFerry: true,
    locomotivesRequired: locos,
  });
}

function rTunnel(
  from: string,
  to: string,
  length: number,
  color: RouteDef['color'],
): RouteDef {
  return r(from, to, length, color, { isTunnel: true });
}

function parallel(a: RouteDef, b: RouteDef): [RouteDef, RouteDef] {
  return [
    { ...a, parallel: b.id },
    { ...b, parallel: a.id },
  ];
}

// ---------- the actual route table ----------

export const ROUTES: RouteDef[] = [
  // === Британия и северная Франция ===
  r('edinburgh', 'london', 4, 'black'),
  rFerry('london', 'amsterdam', 2, 'gray', 1),
  rFerry('london', 'dieppe', 2, 'gray', 1),
  r('brest', 'paris', 3, 'black'),
  r('brest', 'dieppe', 2, 'orange'),
  r('brest', 'pamplona', 4, 'purple'),
  r('dieppe', 'paris', 1, 'purple'),
  r('dieppe', 'bruxelles', 2, 'green'),
  r('paris', 'bruxelles', 2, 'yellow'),
  ...parallel(
    r('paris', 'frankfurt', 3, 'white'),
    r('paris', 'frankfurt', 3, 'orange'),
  ),
  r('paris', 'marseille', 4, 'gray'),
  ...parallel(
    r('paris', 'pamplona', 4, 'blue'),
    r('paris', 'pamplona', 4, 'green'),
  ),
  rTunnel('marseille', 'zurich', 2, 'purple'),
  r('marseille', 'barcelona', 4, 'gray'),

  // === Иберия ===
  ...parallel(
    r('madrid', 'pamplona', 3, 'white'),
    r('madrid', 'pamplona', 3, 'black'),
  ),
  r('madrid', 'barcelona', 2, 'yellow'),
  r('madrid', 'lisboa', 3, 'purple'),
  r('madrid', 'cadiz', 3, 'orange'),
  r('lisboa', 'cadiz', 2, 'blue'),
  r('barcelona', 'pamplona', 2, 'gray'),

  // === Низкие земли и западная Германия ===
  r('amsterdam', 'bruxelles', 1, 'black'),
  r('amsterdam', 'essen', 3, 'yellow'),
  r('amsterdam', 'frankfurt', 2, 'white'),
  r('bruxelles', 'frankfurt', 2, 'blue'),
  r('essen', 'frankfurt', 2, 'green'),
  r('essen', 'berlin', 2, 'blue'),
  rFerry('essen', 'kobenhavn', 3, 'gray', 1),
  ...parallel(
    r('frankfurt', 'berlin', 3, 'red'),
    r('frankfurt', 'berlin', 3, 'black'),
  ),
  r('frankfurt', 'munchen', 2, 'purple'),
  r('berlin', 'danzic', 4, 'gray'),
  ...parallel(
    r('berlin', 'warszawa', 4, 'yellow'),
    r('berlin', 'warszawa', 4, 'purple'),
  ),
  r('berlin', 'wien', 3, 'green'),

  // === Альпы и Италия ===
  r('munchen', 'wien', 3, 'orange'),
  rTunnel('munchen', 'venezia', 2, 'blue'),
  rTunnel('munchen', 'zurich', 2, 'yellow'),
  rTunnel('zurich', 'venezia', 2, 'gray'),
  rTunnel('venezia', 'roma', 2, 'black'),
  r('venezia', 'zagrab', 2, 'gray'),
  r('roma', 'brindisi', 2, 'white'),
  rFerry('roma', 'palermo', 4, 'gray', 1),
  rFerry('brindisi', 'palermo', 3, 'gray', 1),
  rFerry('brindisi', 'athina', 4, 'gray', 1),

  // === Балканы ===
  r('wien', 'budapest', 1, 'white'),
  r('wien', 'zagrab', 2, 'gray'),
  r('zagrab', 'sarajevo', 3, 'red'),
  r('budapest', 'zagrab', 2, 'orange'),
  r('budapest', 'sarajevo', 3, 'purple'),
  r('budapest', 'bucuresti', 4, 'gray'),
  r('budapest', 'kyiv', 6, 'gray'),
  rTunnel('sarajevo', 'sofia', 2, 'gray'),
  r('sarajevo', 'athina', 4, 'green'),
  rTunnel('sofia', 'bucuresti', 2, 'gray'),
  r('sofia', 'constantinople', 3, 'blue'),
  r('sofia', 'athina', 3, 'purple'),

  // === Турция и проливы ===
  r('bucuresti', 'constantinople', 3, 'yellow'),
  rFerry('constantinople', 'smyrna', 2, 'gray', 1),
  rTunnel('constantinople', 'angora', 2, 'gray'),
  rFerry('constantinople', 'sevastopol', 4, 'gray', 2),
  rFerry('smyrna', 'athina', 2, 'gray', 1),
  r('smyrna', 'angora', 3, 'orange'),
  r('angora', 'erzurum', 3, 'black'),

  // === Скандинавия ===
  r('christiania', 'kobenhavn', 1, 'gray'),
  r('christiania', 'stockholm', 4, 'gray'),
  rFerry('stockholm', 'kobenhavn', 3, 'yellow', 1),
  rFerry('stockholm', 'petrograd', 8, 'gray', 4),

  // === Польша ===
  r('warszawa', 'danzic', 2, 'gray'),
  r('warszawa', 'wien', 4, 'blue'),
  r('warszawa', 'wilno', 3, 'red'),
  r('warszawa', 'kyiv', 4, 'gray'),
  r('danzic', 'riga', 3, 'black'),

  // === Балтика ===
  r('riga', 'wilno', 4, 'green'),
  r('riga', 'petrograd', 4, 'gray'),
  r('wilno', 'petrograd', 4, 'gray'),
  r('wilno', 'smolensk', 3, 'yellow'),
  r('wilno', 'kyiv', 2, 'gray'),

  // === Россия ===
  r('petrograd', 'moskva', 4, 'white'),
  r('moskva', 'smolensk', 2, 'orange'),
  r('moskva', 'kharkov', 4, 'purple'),
  r('smolensk', 'kyiv', 3, 'red'),
  r('kyiv', 'kharkov', 4, 'gray'),
  rTunnel('kyiv', 'bucuresti', 2, 'gray'),
  r('kharkov', 'rostov', 2, 'green'),
  r('rostov', 'sevastopol', 4, 'gray'),
  rFerry('sevastopol', 'erzurum', 4, 'gray', 2),
  r('sevastopol', 'bucuresti', 4, 'white'),
];
