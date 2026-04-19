import type { CardColor, RouteColor } from '../game/types';

export const STRINGS = {
  appTitle: 'Ticket to Ride: Европа',
  subtitle: 'двухпользовательская версия',

  common: {
    ok: 'ОК',
    cancel: 'Отмена',
    close: 'Закрыть',
    yes: 'Да',
    no: 'Нет',
    back: 'Назад',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Изменить',
  },

  start: {
    newGame: 'Новая игра',
    continueGame: 'Продолжить',
    noSaved: 'Нет незаконченных партий',
    profile: 'Профиль',
    stats: 'Статистика',
    settings: 'Настройки',
    activeProfile: 'Активный профиль',
    noActiveProfile: 'Профиль не выбран',
  },

  profile: {
    title: 'Профили',
    create: 'Создать профиль',
    namePlaceholder: 'Имя',
    emojiPlaceholder: 'Эмодзи',
    makeActive: 'Сделать активным',
    active: 'Активный',
    noProfiles: 'Нет профилей. Создайте первый.',
    confirmDelete: 'Удалить профиль со всей статистикой?',
  },

  stats: {
    title: 'Статистика',
    games: 'Партий сыграно',
    wins: 'Побед',
    losses: 'Поражений',
    draws: 'Ничьих',
    winRate: 'Процент побед',
    avgScore: 'Средний счёт',
    best: 'Лучший счёт',
    ticketsDone: 'Билетов выполнено',
    ticketsMissed: 'Билетов провалено',
    ticketPct: 'Процент выполненных',
    routes: 'Маршрутов заклеймлено',
    longest: 'Длиннейший маршрут (вагонов)',
    noProfile: 'Выберите профиль, чтобы увидеть статистику.',
  },

  settings: {
    title: 'Настройки',
    defaultRules: 'Правила по умолчанию',
    infiniteCards: 'Бесконечные карты-вагоны',
    infiniteCardsNote: 'всегда включено',
    infiniteStations: 'Бесконечные вокзалы',
    allowCardTrading: 'Обмен картами-вагонами между игроками',
    rulesHelp: 'Правила фиксируются при создании партии.',
  },

  newGame: {
    title: 'Новая игра',
    myProfile: 'Ваш профиль (Игрок 1)',
    opponent: 'Соперник (Игрок 2)',
    opponentName: 'Имя соперника',
    opponentEmoji: 'Эмодзи соперника',
    houseRules: 'Правила',
    start: 'Начать партию',
    offlineNote:
      'Партия будет играться на одном устройстве (hot-seat). Онлайн-режим появится в следующей версии.',
  },

  continue: {
    title: 'Продолжить партию',
    vs: 'против',
    score: 'Счёт',
    lastMove: 'Последний ход',
    confirmDelete: 'Удалить эту партию?',
    host: 'вы хост',
    guest: 'вы гость',
  },

  game: {
    turnOf: 'Ход',
    yourTurn: 'Ваш ход',
    opponentTurn: 'Ход соперника',
    phase: {
      idle: 'выбор действия',
      drawingCards: 'добор второй карты',
      pickingTickets: 'выбор билетов',
      tunnelResolution: 'прокладка тоннеля',
      gameOver: 'игра окончена',
    },
    drawFromMarket: 'С рынка',
    drawFromDeck: 'Из колоды',
    drawTickets: 'Взять билеты',
    claimRoute: 'Заклеймить маршрут',
    buildStation: 'Поставить вокзал',
    tradeCards: 'Обмен картами',
    concede: 'Завершить партию',
    restartGame: 'Начать заново',
    finalRoundBanner: 'Последний круг!',
    trainsLeft: 'Вагонов',
    stationsLeft: 'Вокзалов',
    scoreLabel: 'Очки',
    tickets: 'Билеты',
    ticketsHidden: 'билетов (скрыто)',
    handHidden: 'карт в руке',
    pendingTickets: 'Выбор билетов',
    keep: 'Оставить выбранные',
    keepInitial: 'Оставьте не меньше 2 билетов',
    keepMid: 'Оставьте не меньше 1 билета',
    ticketDone: '✓ выполнен',
    ticketPending: '✗ не выполнен',
    log: 'Лог ходов',
    tunnel: {
      title: 'Тоннель',
      drewExtras: 'Вытянуто 3 карты:',
      extraCost: 'Нужно доплатить {cost} карт (цвета {color} или локомотивы)',
      extraCostLocoOnly: 'Нужно доплатить {cost} локомотив(ов)',
      pay: 'Заплатить и заклеймить',
      cancel: 'Отказаться (карты останутся)',
      free: 'Проход бесплатный — маршрут заклеймлен',
    },
    claimModal: {
      title: 'Заклеймить маршрут',
      route: 'Маршрут',
      need: 'Нужно',
      cards: 'карт(ы)',
      confirm: 'Подтвердить',
    },
    stationModal: {
      title: 'Поставить вокзал',
      city: 'Город',
      cost: 'Стоимость',
      confirm: 'Построить',
    },
    tradeModal: {
      title: 'Обмен картами',
      youGive: 'Вы отдаёте',
      youReceive: 'Вы получаете',
      confirm: 'Обменяться',
    },
    endgame: {
      title: 'Игра окончена',
      winner: 'Победитель',
      draw: 'Ничья',
      routePoints: 'За маршруты',
      ticketsDone: 'Билеты выполнены',
      ticketsMissed: 'Билеты провалены',
      stationBonus: 'Неиспользованные вокзалы',
      globetrotter: 'Globetrotter',
      globetrotterNote: '+10 за больше всего билетов',
      total: 'Итого',
      returnToMenu: 'В главное меню',
    },
  },
} as const;

const CARD_COLOR_NAMES: Record<CardColor, string> = {
  purple: 'розовый',
  white: 'белый',
  blue: 'синий',
  yellow: 'жёлтый',
  orange: 'оранжевый',
  black: 'чёрный',
  red: 'красный',
  green: 'зелёный',
  locomotive: 'локомотив',
};

const ROUTE_COLOR_NAMES: Record<RouteColor, string> = {
  purple: 'розовый',
  white: 'белый',
  blue: 'синий',
  yellow: 'жёлтый',
  orange: 'оранжевый',
  black: 'чёрный',
  red: 'красный',
  green: 'зелёный',
  gray: 'любой',
};

export function cardColorName(c: CardColor): string {
  return CARD_COLOR_NAMES[c];
}
export function routeColorName(c: RouteColor): string {
  return ROUTE_COLOR_NAMES[c];
}
