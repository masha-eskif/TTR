import type { City } from '../game/types';

/**
 * 47 городов Ticket to Ride: Europe.
 * Координаты — для SVG viewBox 1200×900 (запад-восток слева-направо, север-юг сверху-вниз).
 * Старые названия (Christiania, Wilno, Angora) — как в оригинальной игре 2008 года.
 * ID `petrograd` оставлен ради совместимости с сохранениями; отображается как «Санкт-Петербург».
 */
export const CITIES: City[] = [
  // Британские острова и северная Франция
  { id: 'edinburgh', name: 'Эдинбург', x: 195, y: 145 },
  { id: 'london', name: 'Лондон', x: 245, y: 280 },
  { id: 'brest', name: 'Брест', x: 175, y: 365 },
  { id: 'dieppe', name: 'Дьеп', x: 265, y: 325 },
  { id: 'paris', name: 'Париж', x: 295, y: 385 },
  { id: 'marseille', name: 'Марсель', x: 340, y: 510 },

  // Иберия
  { id: 'pamplona', name: 'Памплона', x: 215, y: 515 },
  { id: 'madrid', name: 'Мадрид', x: 145, y: 595 },
  { id: 'barcelona', name: 'Барселона', x: 265, y: 585 },
  { id: 'lisboa', name: 'Лиссабон', x: 45, y: 625 },
  { id: 'cadiz', name: 'Кадис', x: 90, y: 720 },

  // Низкие земли и западная Германия
  { id: 'amsterdam', name: 'Амстердам', x: 345, y: 295 },
  { id: 'bruxelles', name: 'Брюссель', x: 320, y: 345 },
  { id: 'essen', name: 'Эссен', x: 375, y: 295 },
  { id: 'frankfurt', name: 'Франкфурт', x: 395, y: 360 },

  // Центральная Европа
  { id: 'berlin', name: 'Берлин', x: 490, y: 295 },
  { id: 'munchen', name: 'Мюнхен', x: 455, y: 400 },
  { id: 'zurich', name: 'Цюрих', x: 390, y: 425 },
  { id: 'wien', name: 'Вена', x: 530, y: 410 },

  // Италия
  { id: 'venezia', name: 'Венеция', x: 450, y: 475 },
  { id: 'roma', name: 'Рим', x: 475, y: 560 },
  { id: 'brindisi', name: 'Бриндизи', x: 550, y: 600 },
  { id: 'palermo', name: 'Палермо', x: 490, y: 675 },

  // Восточная Европа и Балканы
  { id: 'danzic', name: 'Данциг', x: 575, y: 240 },
  { id: 'warszawa', name: 'Варшава', x: 640, y: 325 },
  { id: 'budapest', name: 'Будапешт', x: 605, y: 415 },
  { id: 'zagrab', name: 'Загреб', x: 515, y: 460 },
  { id: 'sarajevo', name: 'Сараево', x: 585, y: 515 },
  { id: 'bucuresti', name: 'Бухарест', x: 700, y: 475 },
  { id: 'sofia', name: 'София', x: 680, y: 530 },
  { id: 'athina', name: 'Афины', x: 670, y: 660 },

  // Скандинавия и Балтика
  { id: 'christiania', name: 'Христиания', x: 440, y: 100 },
  { id: 'stockholm', name: 'Стокгольм', x: 570, y: 135 },
  { id: 'kobenhavn', name: 'Копенгаген', x: 475, y: 225 },
  { id: 'riga', name: 'Рига', x: 680, y: 215 },
  { id: 'wilno', name: 'Вильно', x: 700, y: 285 },

  // Россия
  { id: 'petrograd', name: 'Санкт-Петербург', x: 790, y: 135 },
  { id: 'moskva', name: 'Москва', x: 920, y: 255 },
  { id: 'smolensk', name: 'Смоленск', x: 810, y: 290 },
  { id: 'kyiv', name: 'Киев', x: 790, y: 365 },
  { id: 'kharkov', name: 'Харьков', x: 920, y: 385 },
  { id: 'rostov', name: 'Ростов', x: 980, y: 460 },
  { id: 'sevastopol', name: 'Севастополь', x: 870, y: 510 },

  // Малая Азия
  { id: 'constantinople', name: 'Константинополь', x: 755, y: 580 },
  { id: 'smyrna', name: 'Смирна', x: 760, y: 640 },
  { id: 'angora', name: 'Ангора', x: 910, y: 620 },
  { id: 'erzurum', name: 'Эрзурум', x: 1010, y: 600 },
];
