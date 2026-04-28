/**
 * calculatorEngine.js
 * 
 * Модуль профессиональных инвестиционных расчётов для недвижимости.
 * Все формулы с комментариями соответствуют стандартным метрикам
 * инвестиционного анализа (ROI, NOI, Cap Rate, DSCR и т.д.).
 *
 * Зависимостей от React нет — чистая математика.
 */

// ============================================================
// 1. СТРАТЕГИИ ПО ТИПАМ НЕДВИЖИМОСТИ
// ============================================================

const STRATEGY_CONFIG = {
    'Квартира': [
        { id: 'LONG_RENT', name: 'Долгосрочная аренда', icon: '🏠', desc: 'Стабильный доход, сдача помесячно' },
        { id: 'SHORT_RENT', name: 'Посуточная аренда', icon: '🛏️', desc: 'Высокий доход, требует управления' },
        { id: 'FLIP', name: 'Флиппинг', icon: '🔨', desc: 'Ремонт и перепродажа с прибылью' },
    ],
    'Дом': [
        { id: 'LONG_RENT', name: 'Долгосрочная аренда', icon: '🏡', desc: 'Сдача дома помесячно' },
        { id: 'SHORT_RENT', name: 'Посуточная / Агротуризм', icon: '🌿', desc: 'Посуточная аренда, туристический сектор' },
        { id: 'FLIP', name: 'Флиппинг', icon: '🔨', desc: 'Реконструкция и перепродажа' },
    ],
    'Участок': [
        { id: 'BUILD_SELL', name: 'Построить и продать', icon: '🏗️', desc: 'Строительство и продажа готового объекта' },
        { id: 'BUY_HOLD', name: 'Купить и держать', icon: '📈', desc: 'Рост стоимости земли со временем' },
    ],
    'Коммерция': [
        { id: 'LONG_RENT', name: 'Сдача в аренду', icon: '🏪', desc: 'Стабильный коммерческий арендный доход' },
        { id: 'FLIP', name: 'Покупка и перепродажа', icon: '💼', desc: 'Приобретение с целью перепродажи' },
    ],
    'Офис': [
        { id: 'LONG_RENT', name: 'Сдача в аренду', icon: '🏢', desc: 'Офисная аренда, долгосрочные контракты' },
        { id: 'FLIP', name: 'Покупка и перепродажа', icon: '💼', desc: 'Перепродажа коммерческой площади' },
    ],
    'Склад': [
        { id: 'LONG_RENT', name: 'Сдача в аренду', icon: '📦', desc: 'Логистическая аренда по м²/мес' },
    ],
    'Гараж': [
        { id: 'LONG_RENT', name: 'Сдача в аренду', icon: '🚗', desc: 'Помесячная аренда гаражного бокса' },
        { id: 'BUY_HOLD', name: 'Купить и держать', icon: '📈', desc: 'Рост стоимости со временем' },
    ],
};

/**
 * Возвращает список стратегий для данного типа объекта.
 */
export function getStrategiesForType(objectType) {
    return STRATEGY_CONFIG[objectType] || STRATEGY_CONFIG['Квартира'];
}

// ============================================================
// 2. УМНЫЕ ЗНАЧЕНИЯ ПО УМОЛЧАНИЮ (Smart Defaults)
// ============================================================

/**
 * На основе attributes объекта и выбранной стратегии,
 * возвращает разумные значения по умолчанию для полей ввода.
 */
export function getSmartDefaults(object, strategy) {
    // Align with backend type detection
    let type = object?.type || 'Квартира';
    const category = (object?.category || '').toUpperCase();
    if (category === 'УЧАСТОК') type = 'Участок';
    else if (category === 'КОММЕРЦИЯ' || category === 'COMMERCIAL') type = 'Коммерция';

    const attrs = parseAttributes(object?.attributes);
    const price = Number(object?.priceTotal) || 0;
    const area = Number(object?.areaTotal) || 50;
    const pricePerM2 = price / (area || 1);

    const defaults = {
        // Финансирование
        useMortgage: false,
        downPaymentPct: 30,
        mortgageRate: 12.5,    // Средняя ставка в Беларуси
        mortgageTerm: 15,

        // Расходы на покупку
        legalFeesPct: 2,       // Нотариус, оценка, регистрация

        // Ремонт
        repairCost: 0,
        furnitureCost: 0,

        // Доходы (аренда)
        monthlyRent: 0,
        vacancyRate: 5,

        // Посуточная
        dailyRate: 0,
        occupancyRate: 65,
        cleaningCost: 15,
        platformFeePct: 15,

        // Флиппинг
        expectedSalePrice: 0,
        flipDurationMonths: 4,
        agentFeePct: 3,

        // Построить и продать
        constructionCost: 0,
        buildSellDuration: 12,

        // Купить и держать
        appreciationRate: 5,

        // Операционные расходы
        maintenancePct: 1,     // % от стоимости в год на обслуживание
        utilityCost: 0,        // Коммуналка на собственнике руб/мес
        insuranceCost: 0,
        managementFeePct: 0,   // Управляющая компания (% от аренды)

        // Горизонт
        investmentHorizon: 10,

        // Юрлицо
        useLegalUSN: false,
    };

    // --- Подсказки для КВАРТИР ---
    if (type === 'Квартира') {
        const rooms = attrs.rooms_count || 1;
        const renovation = attrs.renovation_state || object?.category || '';

        // Ремонт на основе состояния
        const repairPerM2 = {
            'Черновая отделка': 350,
            'Предчистовая': 250,
            'Плохой ремонт': 200,
            'Средний ремонт': 80,
            'Хороший ремонт': 20,
            'Элитный ремонт': 0,
        };
        defaults.repairCost = Math.round((repairPerM2[renovation] || 100) * area);

        // Аренда на основе комнат (средние по Минску, USD)
        const rentByRooms = { 1: 350, 2: 450, 3: 550, 4: 700, 5: 850 };
        defaults.monthlyRent = rentByRooms[Math.min(rooms, 5)] || 400;

        // Посуточная
        const dailyByRooms = { 1: 35, 2: 50, 3: 65, 4: 80 };
        defaults.dailyRate = dailyByRooms[Math.min(rooms, 4)] || 40;

        // Балкон +3% к аренде
        if (attrs.has_balcony) {
            defaults.monthlyRent = Math.round(defaults.monthlyRent * 1.03);
        }

        // Этаж: 1-й и последний — скидка
        const floor = object?.floor;
        const floorsTotal = object?.floorsTotal;
        if (floor === 1 || (floor && floorsTotal && floor === floorsTotal)) {
            defaults.monthlyRent = Math.round(defaults.monthlyRent * 0.95);
        }

        // Мебель
        if (['Черновая отделка', 'Предчистовая', 'Плохой ремонт'].includes(renovation)) {
            defaults.furnitureCost = Math.round(area * 30); // ~$30/м²
        }

        defaults.utilityCost = 50 + rooms * 15;
        defaults.expectedSalePrice = Math.round(price * 1.2);
        defaults.insuranceCost = Math.round(price * 0.001);
    }

    // --- Подсказки для ДОМОВ ---
    if (type === 'Дом') {
        const houseType = attrs.house_type || object?.category || '';
        const heating = attrs.heating_type || 'Газ';

        const repairMap = { 'Старый дом': 280, 'Таунхаус': 100, 'Коттедж': 60 };
        defaults.repairCost = Math.round((repairMap[houseType] || 150) * area);

        defaults.monthlyRent = Math.round(pricePerM2 * area * 0.004); // ~0.4% от стоимости
        if (defaults.monthlyRent < 300) defaults.monthlyRent = 300;

        // Отопление влияет на коммуналку
        const heatingCost = { 'Газ': 80, 'Электричество': 150, 'Твердотопливный': 60 };
        defaults.utilityCost = heatingCost[heating] || 100;

        defaults.dailyRate = Math.round(defaults.monthlyRent / 20);
        defaults.expectedSalePrice = Math.round(price * 1.25);
        defaults.insuranceCost = Math.round(price * 0.002);
        defaults.maintenancePct = 1.5; // Дома требуют больше обслуживания
    }

    // --- Подсказки для УЧАСТКОВ ---
    if (type === 'Участок') {
        const purpose = attrs.land_purpose || 'ИЖС';
        defaults.appreciationRate = purpose === 'Коммерция' ? 8 : 5;

        // Стоимость строительства на участке ~$50k по умолчанию
        defaults.constructionCost = 50000;
        defaults.expectedSalePrice = Math.round((price + defaults.constructionCost) * 1.3);

        // Доп. расходы если нет коммуникаций
        let connectionCost = 0;
        if (!attrs.has_electricity) connectionCost += 2000;
        if (!attrs.has_gas) connectionCost += 3000;
        defaults.repairCost = connectionCost;
    }

    // --- Подсказки для КОММЕРЦИИ ---
    if (type === 'Коммерция') {
        const retailType = attrs.retail_type || object?.category || '';

        // Коммерция: ~$12-20/м²/мес
        const rentPerM2 = retailType === 'Стрит-ритейл' ? 18 : 14;
        defaults.monthlyRent = Math.round(rentPerM2 * area);
        defaults.vacancyRate = retailType === 'Стрит-ритейл' ? 8 : 5;

        defaults.utilityCost = Math.round(area * 1.5);
        defaults.expectedSalePrice = Math.round(price * 1.15);
        defaults.maintenancePct = 0.8;
        defaults.insuranceCost = Math.round(price * 0.002);
        defaults.repairCost = Math.round(area * 50);
    }

    // --- Подсказки для ОФИСОВ ---
    if (type === 'Офис') {
        const officeClass = attrs.business_center_class || object?.category || 'B';

        // Офисы: $8-25/м²/мес по классу
        const rentByClass = { 'A': 22, 'B': 14, 'C': 8 };
        defaults.monthlyRent = Math.round((rentByClass[officeClass] || 12) * area);

        if (attrs.access_24_7) {
            defaults.monthlyRent = Math.round(defaults.monthlyRent * 1.07);
        }

        defaults.vacancyRate = officeClass === 'C' ? 12 : 7;
        defaults.utilityCost = Math.round(area * 1.2);
        defaults.expectedSalePrice = Math.round(price * 1.1);
        defaults.repairCost = Math.round(area * 40);
        defaults.insuranceCost = Math.round(price * 0.0015);
    }

    // --- Подсказки для СКЛАДОВ ---
    if (type === 'Склад') {
        const whType = attrs.warehouse_type || object?.category || '';
        const hasRamp = attrs.has_ramp || false;
        const ceilingH = attrs.ceiling_height_m || 4;

        // Склады: $3-8/м²/мес
        let rentPerM2 = whType === 'Отапливаемый' ? 6 : 3.5;
        if (hasRamp) rentPerM2 *= 1.15;         // Рампа +15%
        if (ceilingH >= 10) rentPerM2 *= 1.2;   // Высокие потолки +20% (класс А)
        else if (ceilingH >= 6) rentPerM2 *= 1.1;

        defaults.monthlyRent = Math.round(rentPerM2 * area);
        defaults.vacancyRate = 10;
        defaults.utilityCost = whType === 'Отапливаемый' ? Math.round(area * 1.8) : Math.round(area * 0.5);
        defaults.maintenancePct = 0.5;
        defaults.repairCost = Math.round(area * 15);
        defaults.insuranceCost = Math.round(price * 0.003);
    }

    // --- Подсказки для ГАРАЖЕЙ ---
    if (type === 'Гараж') {
        const material = attrs.material || object?.category || 'Кирпичный';
        const isCovered = attrs.is_covered !== undefined ? attrs.is_covered : true;
        const hasPit = attrs.has_pit || false;

        // Гаражи: $50-150/мес
        let baseRent = material === 'Кирпичный' ? 100 : 70;
        if (isCovered) baseRent = Math.round(baseRent * 1.15);
        if (hasPit) baseRent = Math.round(baseRent * 1.10);

        defaults.monthlyRent = baseRent;
        defaults.vacancyRate = 5;
        defaults.utilityCost = 15;
        defaults.repairCost = material === 'Металлический' ? 500 : 300;
        defaults.maintenancePct = 0.3;
        defaults.insuranceCost = Math.round(price * 0.002);
        defaults.appreciationRate = 3;
    }

    return defaults;
}

// ============================================================
// 3. ИПОТЕЧНЫЙ КАЛЬКУЛЯТОР (аннуитет)
// ============================================================

/**
 * Расчёт аннуитетных ипотечных платежей.
 *
 * @param {number} propertyPrice - Полная стоимость объекта
 * @param {number} downPaymentPct - Первоначальный взнос (%)
 * @param {number} annualRate - Годовая ставка (%)
 * @param {number} termYears - Срок в годах
 * @returns {{ loanAmount, monthlyPayment, totalPayment, totalInterest, downPayment }}
 */
export function calculateMortgage(propertyPrice, downPaymentPct, annualRate, termYears) {
    const downPayment = propertyPrice * (downPaymentPct / 100);
    const loanAmount = propertyPrice - downPayment;

    if (loanAmount <= 0 || annualRate <= 0 || termYears <= 0) {
        return { loanAmount: 0, monthlyPayment: 0, totalPayment: 0, totalInterest: 0, downPayment };
    }

    // Формула аннуитетного платежа: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const r = annualRate / 100 / 12;             // Месячная ставка
    const n = termYears * 12;                     // Количество месяцев
    const factor = Math.pow(1 + r, n);

    const monthlyPayment = loanAmount * (r * factor) / (factor - 1);
    const totalPayment = monthlyPayment * n;
    const totalInterest = totalPayment - loanAmount;

    return {
        loanAmount: Math.round(loanAmount),
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest),
        downPayment: Math.round(downPayment),
    };
}

// ============================================================
// 4. ГЛАВНЫЙ РАСЧЁТ: АРЕНДНЫЕ СТРАТЕГИИ
// ============================================================

/**
 * Полный расчёт для стратегий аренды (долгосрочная и посуточная).
 *
 * @param {object} params - Все параметры от пользователя
 * @param {object} taxRates - Налоговые ставки с бэкенда
 * @returns {object} - Объект со всеми 10+ метриками
 */
export function calculateRentalAnalysis(params, taxRates) {
    const {
        price, repairCost, furnitureCost, legalFeesPct,
        useMortgage, downPaymentPct, mortgageRate, mortgageTerm,
        // Доход
        monthlyRent, vacancyRate,
        // Посуточная
        isShortRent, dailyRate, occupancyRate, cleaningCost, platformFeePct,
        // Расходы
        maintenancePct, utilityCost, insuranceCost, managementFeePct,
        // Горизонт
        investmentHorizon, appreciationRate,
        // Юрлицо
        useLegalUSN,
    } = params;

    // ---- 1. Стоимость покупки ----
    const legalFees = price * (legalFeesPct / 100);
    const totalPurchaseCost = price + legalFees;
    const totalRenovation = (Number(repairCost) || 0) + (Number(furnitureCost) || 0);

    // ---- 2. Финансирование ----
    let mortgage = { loanAmount: 0, monthlyPayment: 0, totalInterest: 0, downPayment: price };
    let totalOwnFunds;

    if (useMortgage) {
        mortgage = calculateMortgage(price, downPaymentPct, mortgageRate, mortgageTerm);
        totalOwnFunds = mortgage.downPayment + totalRenovation + legalFees;
    } else {
        totalOwnFunds = totalPurchaseCost + totalRenovation;
    }

    // ---- 3. Годовой валовой доход ----
    let grossAnnualIncome;
    let effectiveGrossIncome;

    if (isShortRent) {
        // Посуточная: доход = тариф × дней × загрузка - уборка - комиссия
        const daysPerYear = 365;
        const occupiedDays = daysPerYear * (occupancyRate / 100);
        const grossIncome = dailyRate * occupiedDays;
        const platformFees = grossIncome * (platformFeePct / 100);
        const avgStayDays = 2.5; // Средний срок пребывания
        const turnovers = occupiedDays / avgStayDays;
        const totalCleaningCost = turnovers * (Number(cleaningCost) || 0);

        grossAnnualIncome = grossIncome;
        effectiveGrossIncome = grossIncome - platformFees - totalCleaningCost;
    } else {
        // Долгосрочная: доход = аренда × 12 × (1 - простой)
        grossAnnualIncome = monthlyRent * 12;
        effectiveGrossIncome = grossAnnualIncome * (1 - vacancyRate / 100);
    }

    // ---- 4. Операционные расходы (годовые) ----
    const annualMaintenance = price * (maintenancePct / 100);
    const annualUtilities = (Number(utilityCost) || 0) * 12;
    const annualInsurance = Number(insuranceCost) || 0;
    const annualManagement = effectiveGrossIncome * (managementFeePct / 100);

    // Налог на имущество
    const propertyTaxRate = Number(taxRates?.propertyTaxRate) || 0;
    const annualPropertyTax = price * (propertyTaxRate / 100);

    const totalOperatingExpenses = annualMaintenance + annualUtilities + annualInsurance +
                                    annualManagement + annualPropertyTax;

    // ---- 5. NOI (Чистый операционный доход) ----
    const noi = effectiveGrossIncome - totalOperatingExpenses;

    // ---- 6. Налог на доход ----
    let incomeTaxRate = 0;
    let incomeTaxLabel = '';
    const entityType = taxRates?.entityType || 'INDIVIDUAL';

    if (entityType === 'LEGAL_ENTITY') {
        if (useLegalUSN) {
            incomeTaxRate = Number(taxRates?.usnRate) || 0;
            incomeTaxLabel = 'УСН';
        } else {
            incomeTaxRate = Number(taxRates?.profitTaxRate) || 0;
            incomeTaxLabel = 'Налог на прибыль';
        }
    } else {
        incomeTaxRate = Number(taxRates?.incomeTaxRate) || 0;
        incomeTaxLabel = entityType === 'ENTREPRENEUR' ? 'Подоходный (ИП)' : 'НДФЛ';
    }

    const taxableIncome = Math.max(noi, 0);
    const annualIncomeTax = taxableIncome * (incomeTaxRate / 100);

    // НДС (только для юрлиц, на управление)
    let annualVAT = 0;
    if (entityType === 'LEGAL_ENTITY' && taxRates?.vatRate) {
        annualVAT = annualManagement * (Number(taxRates.vatRate) / 100);
    }

    const totalAnnualTax = annualIncomeTax + annualPropertyTax + annualVAT;

    // ---- 7. Денежный поток ----
    const annualDebtService = mortgage.monthlyPayment * 12;
    const netIncomeAfterTax = noi - annualIncomeTax - annualVAT;
    const annualCashFlow = netIncomeAfterTax - annualDebtService;
    const monthlyCashFlow = annualCashFlow / 12;

    // ---- 8. Ключевые метрики ----

    // Cap Rate = NOI / Стоимость объекта × 100%
    const capRate = totalPurchaseCost > 0 ? (noi / totalPurchaseCost) * 100 : 0;

    // Cash-on-Cash Return = Годовой CF / Собственные средства × 100%
    const cashOnCash = totalOwnFunds > 0 ? (annualCashFlow / totalOwnFunds) * 100 : 0;

    // Срок окупаемости
    const paybackYears = annualCashFlow > 0 ? totalOwnFunds / annualCashFlow : Infinity;

    // DSCR (только при ипотеке)
    const dscr = annualDebtService > 0 ? noi / annualDebtService : null;

    // GRM = Цена / Валовой годовой доход
    const grm = grossAnnualIncome > 0 ? price / grossAnnualIncome : Infinity;

    // Точка безубыточности по загрузке (%)
    const breakEvenOccupancy = monthlyRent > 0
        ? ((totalOperatingExpenses + annualDebtService) / (monthlyRent * 12)) * 100
        : 0;

    // ---- 9. Прогноз на N лет ----
    const horizon = Number(investmentHorizon) || 10;
    const appRate = (Number(appreciationRate) || 0) / 100;
    const futurePropertyValue = price * Math.pow(1 + appRate, horizon);
    const capitalGain = futurePropertyValue - price;

    // Оставшийся долг через N лет (при ипотеке)
    let remainingBalance = 0;
    if (useMortgage && mortgage.loanAmount > 0) {
        const r = mortgageRate / 100 / 12;
        const n = mortgageTerm * 12;
        const paidMonths = Math.min(horizon * 12, n);
        remainingBalance = mortgage.loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, paidMonths)) / (Math.pow(1 + r, n) - 1);
        if (remainingBalance < 0) remainingBalance = 0;
    }

    const totalCashFlowOverHorizon = annualCashFlow * horizon;
    const equityAtEnd = futurePropertyValue - remainingBalance;
    const totalProfit = equityAtEnd + totalCashFlowOverHorizon - totalOwnFunds;
    const totalROI = totalOwnFunds > 0 ? (totalProfit / totalOwnFunds) * 100 : 0;
    const annualizedROI = horizon > 0 ? totalROI / horizon : 0;

    // ---- 10. Годовой прогноз (таблица) ----
    const yearlyForecast = [];
    for (let y = 1; y <= Math.min(horizon, 30); y++) {
        const propValY = price * Math.pow(1 + appRate, y);
        let remBalY = 0;
        if (useMortgage && mortgage.loanAmount > 0) {
            const r = mortgageRate / 100 / 12;
            const n = mortgageTerm * 12;
            const pm = Math.min(y * 12, n);
            remBalY = mortgage.loanAmount * (Math.pow(1 + r, n) - Math.pow(1 + r, pm)) / (Math.pow(1 + r, n) - 1);
            if (remBalY < 0 || pm >= n) remBalY = 0;
        }
        yearlyForecast.push({
            year: y,
            propertyValue: Math.round(propValY),
            equity: Math.round(propValY - remBalY),
            cumulativeCashFlow: Math.round(annualCashFlow * y),
            totalWealth: Math.round(propValY - remBalY + annualCashFlow * y),
        });
    }

    return {
        // Инвестиции
        totalPurchaseCost: Math.round(totalPurchaseCost),
        totalRenovation: Math.round(totalRenovation),
        totalOwnFunds: Math.round(totalOwnFunds),
        legalFees: Math.round(legalFees),
        mortgage,

        // Доход
        grossAnnualIncome: Math.round(grossAnnualIncome),
        effectiveGrossIncome: Math.round(effectiveGrossIncome),

        // Расходы
        totalOperatingExpenses: Math.round(totalOperatingExpenses),
        annualMaintenance: Math.round(annualMaintenance),
        annualUtilities: Math.round(annualUtilities),
        annualInsurance: Math.round(annualInsurance),
        annualManagement: Math.round(annualManagement),
        annualPropertyTax: Math.round(annualPropertyTax),

        // Налоги
        incomeTaxRate,
        incomeTaxLabel,
        annualIncomeTax: Math.round(annualIncomeTax),
        annualVAT: Math.round(annualVAT),
        totalAnnualTax: Math.round(totalAnnualTax),

        // Денежный поток
        noi: Math.round(noi),
        annualDebtService: Math.round(annualDebtService),
        annualCashFlow: Math.round(annualCashFlow),
        monthlyCashFlow: Math.round(monthlyCashFlow),

        // Ключевые метрики
        capRate: round2(capRate),
        cashOnCash: round2(cashOnCash),
        paybackYears: paybackYears === Infinity ? '∞' : round1(paybackYears),
        dscr: dscr !== null ? round2(dscr) : null,
        grm: grm === Infinity ? '∞' : round1(grm),
        breakEvenOccupancy: round1(breakEvenOccupancy),

        // Долгосрочный прогноз
        futurePropertyValue: Math.round(futurePropertyValue),
        capitalGain: Math.round(capitalGain),
        totalCashFlowOverHorizon: Math.round(totalCashFlowOverHorizon),
        totalProfit: Math.round(totalProfit),
        totalROI: round2(totalROI),
        annualizedROI: round2(annualizedROI),

        yearlyForecast,
    };
}

// ============================================================
// 5. РАСЧЁТ ДЛЯ ФЛИППИНГА
// ============================================================

export function calculateFlipAnalysis(params, taxRates) {
    const {
        price, repairCost, furnitureCost, legalFeesPct,
        useMortgage, downPaymentPct, mortgageRate, mortgageTerm,
        expectedSalePrice, flipDurationMonths, agentFeePct,
        useLegalUSN,
    } = params;

    const legalFees = price * (legalFeesPct / 100);
    const totalRenovation = (Number(repairCost) || 0) + (Number(furnitureCost) || 0);

    let mortgage = { loanAmount: 0, monthlyPayment: 0, totalInterest: 0, downPayment: price };
    let totalOwnFunds;

    if (useMortgage) {
        mortgage = calculateMortgage(price, downPaymentPct, mortgageRate, mortgageTerm);
        totalOwnFunds = mortgage.downPayment + totalRenovation + legalFees;
    } else {
        totalOwnFunds = price + legalFees + totalRenovation;
    }

    // Расходы за период реализации
    const durationMonths = Number(flipDurationMonths) || 4;
    const holdingCostMortgage = mortgage.monthlyPayment * durationMonths;
    const agentFee = (Number(expectedSalePrice) || 0) * (agentFeePct / 100);

    // Налог на имущество (пропорционально сроку владения)
    const propertyTaxRate = Number(taxRates?.propertyTaxRate) || 0;
    const propertyTax = price * (propertyTaxRate / 100) * (durationMonths / 12);

    const grossProfit = (Number(expectedSalePrice) || 0) - price - totalRenovation - legalFees - agentFee - holdingCostMortgage - propertyTax;

    // Налог на доход
    let incomeTaxRate = 0;
    let incomeTaxLabel = '';
    const entityType = taxRates?.entityType || 'INDIVIDUAL';

    if (entityType === 'LEGAL_ENTITY') {
        incomeTaxRate = useLegalUSN ? (Number(taxRates?.usnRate) || 0) : (Number(taxRates?.profitTaxRate) || 0);
        incomeTaxLabel = useLegalUSN ? 'УСН' : 'Налог на прибыль';
    } else {
        incomeTaxRate = Number(taxRates?.incomeTaxRate) || 0;
        incomeTaxLabel = entityType === 'ENTREPRENEUR' ? 'Подоходный (ИП)' : 'НДФЛ';
    }

    const incomeTax = Math.max(grossProfit, 0) * (incomeTaxRate / 100);
    const netProfit = grossProfit - incomeTax;

    const roi = totalOwnFunds > 0 ? (netProfit / totalOwnFunds) * 100 : 0;
    const annualizedROI = durationMonths > 0 ? roi * (12 / durationMonths) : 0;

    return {
        totalOwnFunds: Math.round(totalOwnFunds),
        totalRenovation: Math.round(totalRenovation),
        legalFees: Math.round(legalFees),
        mortgage,
        agentFee: Math.round(agentFee),
        holdingCostMortgage: Math.round(holdingCostMortgage),
        propertyTax: Math.round(propertyTax),
        grossProfit: Math.round(grossProfit),
        incomeTax: Math.round(incomeTax),
        incomeTaxRate,
        incomeTaxLabel,
        netProfit: Math.round(netProfit),
        roi: round2(roi),
        annualizedROI: round2(annualizedROI),
        durationMonths,
    };
}

// ============================================================
// 6. РАСЧЁТ: КУПИТЬ И ДЕРЖАТЬ
// ============================================================

export function calculateBuyAndHold(params, taxRates) {
    const {
        price, legalFeesPct, repairCost,
        useMortgage, downPaymentPct, mortgageRate, mortgageTerm,
        appreciationRate, investmentHorizon,
        useLegalUSN,
    } = params;

    const legalFees = price * (legalFeesPct / 100);
    const repair = Number(repairCost) || 0;

    let mortgage = { loanAmount: 0, monthlyPayment: 0, totalInterest: 0, downPayment: price };
    let totalOwnFunds;

    if (useMortgage) {
        mortgage = calculateMortgage(price, downPaymentPct, mortgageRate, mortgageTerm);
        totalOwnFunds = mortgage.downPayment + repair + legalFees;
    } else {
        totalOwnFunds = price + legalFees + repair;
    }

    const horizon = Number(investmentHorizon) || 10;
    const appRate = (Number(appreciationRate) || 0) / 100;
    const futureValue = price * Math.pow(1 + appRate, horizon);
    const capitalGain = futureValue - price;

    // Расходы за весь горизонт
    const propertyTaxRate = Number(taxRates?.propertyTaxRate) || 0;
    const totalPropertyTax = price * (propertyTaxRate / 100) * horizon;
    const totalMortgageCost = mortgage.monthlyPayment * 12 * Math.min(horizon, mortgageTerm || horizon);

    // Налог при продаже
    let incomeTaxRate = 0;
    const entityType = taxRates?.entityType || 'INDIVIDUAL';
    if (entityType === 'LEGAL_ENTITY') {
        incomeTaxRate = useLegalUSN ? (Number(taxRates?.usnRate) || 0) : (Number(taxRates?.profitTaxRate) || 0);
    } else {
        incomeTaxRate = Number(taxRates?.incomeTaxRate) || 0;
    }

    const saleTax = Math.max(capitalGain, 0) * (incomeTaxRate / 100);
    const netProfit = capitalGain - totalPropertyTax - totalMortgageCost - repair - legalFees - saleTax;
    const roi = totalOwnFunds > 0 ? (netProfit / totalOwnFunds) * 100 : 0;
    const annualizedROI = horizon > 0 ? roi / horizon : 0;

    return {
        totalOwnFunds: Math.round(totalOwnFunds),
        mortgage,
        futureValue: Math.round(futureValue),
        capitalGain: Math.round(capitalGain),
        totalPropertyTax: Math.round(totalPropertyTax),
        totalMortgageCost: Math.round(totalMortgageCost),
        saleTax: Math.round(saleTax),
        netProfit: Math.round(netProfit),
        roi: round2(roi),
        annualizedROI: round2(annualizedROI),
        horizon,
    };
}

// ============================================================
// 7. РАСЧЁТ: ПОСТРОИТЬ И ПРОДАТЬ (Участок)
// ============================================================

export function calculateBuildAndSell(params, taxRates) {
    const {
        price, legalFeesPct, repairCost,
        constructionCost, expectedSalePrice, buildSellDuration, agentFeePct,
        useMortgage, downPaymentPct, mortgageRate, mortgageTerm,
        useLegalUSN,
    } = params;

    const legalFees = price * (legalFeesPct / 100);
    const connectionCost = Number(repairCost) || 0;  // Подключение коммуникаций
    const construction = Number(constructionCost) || 0;
    const totalInvestment = price + legalFees + connectionCost + construction;

    let mortgage = { loanAmount: 0, monthlyPayment: 0, totalInterest: 0, downPayment: price };
    let totalOwnFunds;

    if (useMortgage) {
        mortgage = calculateMortgage(price, downPaymentPct, mortgageRate, mortgageTerm);
        totalOwnFunds = mortgage.downPayment + connectionCost + construction + legalFees;
    } else {
        totalOwnFunds = totalInvestment;
    }

    const durationMonths = Number(buildSellDuration) || 12;
    const holdingCostMortgage = mortgage.monthlyPayment * durationMonths;
    const agentFee = (Number(expectedSalePrice) || 0) * ((agentFeePct || 3) / 100);

    const propertyTaxRate = Number(taxRates?.propertyTaxRate) || 0;
    const propertyTax = price * (propertyTaxRate / 100) * (durationMonths / 12);

    const grossProfit = (Number(expectedSalePrice) || 0) - totalInvestment - agentFee - holdingCostMortgage - propertyTax;

    let incomeTaxRate = 0;
    const entityType = taxRates?.entityType || 'INDIVIDUAL';
    if (entityType === 'LEGAL_ENTITY') {
        incomeTaxRate = useLegalUSN ? (Number(taxRates?.usnRate) || 0) : (Number(taxRates?.profitTaxRate) || 0);
    } else {
        incomeTaxRate = Number(taxRates?.incomeTaxRate) || 0;
    }

    const incomeTax = Math.max(grossProfit, 0) * (incomeTaxRate / 100);
    const netProfit = grossProfit - incomeTax;

    const roi = totalOwnFunds > 0 ? (netProfit / totalOwnFunds) * 100 : 0;
    const annualizedROI = durationMonths > 0 ? roi * (12 / durationMonths) : 0;

    return {
        totalOwnFunds: Math.round(totalOwnFunds),
        totalInvestment: Math.round(totalInvestment),
        constructionCost: Math.round(construction),
        connectionCost: Math.round(connectionCost),
        legalFees: Math.round(legalFees),
        mortgage,
        agentFee: Math.round(agentFee),
        holdingCostMortgage: Math.round(holdingCostMortgage),
        propertyTax: Math.round(propertyTax),
        grossProfit: Math.round(grossProfit),
        incomeTax: Math.round(incomeTax),
        netProfit: Math.round(netProfit),
        roi: round2(roi),
        annualizedROI: round2(annualizedROI),
        durationMonths,
    };
}

// ============================================================
// 8. ОЦЕНКА КАЧЕСТВА МЕТРИК (цветовая индикация)
// ============================================================

/**
 * Возвращает 'good', 'medium' или 'bad' для цветовой индикации метрики.
 */
export function assessMetricQuality(metricName, value) {
    if (value === '∞' || value === Infinity || value === null || value === undefined) return 'bad';
    const v = Number(value);

    const rules = {
        capRate:           { good: 7,   medium: 4 },
        cashOnCash:        { good: 10,  medium: 5 },
        paybackYears:      { good: 12,  medium: 20,  invert: true },
        dscr:              { good: 1.25, medium: 1.0 },
        grm:               { good: 12,  medium: 18,  invert: true },
        breakEvenOccupancy:{ good: 60,  medium: 80,  invert: true },
        roi:               { good: 15,  medium: 5 },
        annualizedROI:     { good: 12,  medium: 5 },
        monthlyCashFlow:   { good: 100, medium: 0 },
    };

    const rule = rules[metricName];
    if (!rule) return 'medium';

    if (rule.invert) {
        // Чем меньше — тем лучше (payback, GRM, breakeven)
        if (v <= rule.good) return 'good';
        if (v <= rule.medium) return 'medium';
        return 'bad';
    } else {
        if (v >= rule.good) return 'good';
        if (v >= rule.medium) return 'medium';
        return 'bad';
    }
}

// ============================================================
// 9. ОПИСАНИЯ МЕТРИК (для tooltips)
// ============================================================

export const METRIC_DESCRIPTIONS = {
    noi: {
        name: 'NOI (Чистый операционный доход)',
        desc: 'Доход объекта после вычета всех операционных расходов (обслуживание, коммуналка, страховка, управление, налог на имущество), но ДО уплаты налога на доход и ипотечных платежей. Показывает, сколько генерирует сам объект.',
    },
    capRate: {
        name: 'Cap Rate (Ставка капитализации)',
        desc: 'NOI / Стоимость объекта × 100%. Показывает доходность объекта безотносительно способа финансирования. Норма для жилья: 5-7%, коммерция: 8-12%. Чем выше — тем выгоднее покупка.',
    },
    cashOnCash: {
        name: 'Cash-on-Cash (Доходность на свои деньги)',
        desc: 'Годовой денежный поток / Собственные вложенные средства × 100%. Показывает, какой процент годовых вы реально получаете именно на СВОИ деньги. При использовании ипотеки может быть выше Cap Rate за счёт финансового рычага.',
    },
    paybackYears: {
        name: 'Срок окупаемости',
        desc: 'Собственные средства / Годовой денежный поток. Через сколько лет вложения полностью вернутся за счёт арендного дохода (после всех расходов и налогов).',
    },
    dscr: {
        name: 'DSCR (Коэффициент покрытия долга)',
        desc: 'NOI / Годовые платежи по кредиту. Показывает, во сколько раз операционный доход объекта превышает обязательные платежи по ипотеке. Выше 1.25 — безопасно, ниже 1.0 — объект не покрывает кредит.',
    },
    grm: {
        name: 'GRM (Валовой рентный мультипликатор)',
        desc: 'Цена объекта / Валовой годовой доход от аренды. Показывает, сколько годовых арендных плат стоит объект. Чем меньше (8-15) — тем выгоднее. Выше 20 — объект переоценён для аренды.',
    },
    breakEvenOccupancy: {
        name: 'Точка безубыточности',
        desc: 'Минимальный процент загрузки (заполняемости), при которой объект покрывает все расходы и ипотеку. Ниже 60% — отлично, 60-80% — приемлемо, выше 80% — рискованно.',
    },
    monthlyCashFlow: {
        name: 'Ежемесячный денежный поток',
        desc: 'Конкретная сумма, которая остаётся у вас каждый месяц после всех расходов, налогов и платежей по ипотеке. Положительный — объект приносит доход, отрицательный — требует дофинансирования.',
    },
    totalROI: {
        name: 'Полная доходность за горизонт',
        desc: 'Совокупная прибыль (арендный доход + прирост стоимости - все расходы) / Собственные средства × 100%. Полная картина за весь срок инвестирования.',
    },
    annualizedROI: {
        name: 'Среднегодовая доходность',
        desc: 'Полная доходность, поделённая на количество лет. Позволяет сравнить с альтернативными инвестициями (банковский депозит, фондовый рынок).',
    },
};

// ============================================================
// UTILITY
// ============================================================

function parseAttributes(attrString) {
    if (!attrString) return {};
    try {
        return typeof attrString === 'string' ? JSON.parse(attrString) : attrString;
    } catch {
        return {};
    }
}

function round2(n) {
    return Math.round(n * 100) / 100;
}

function round1(n) {
    return Math.round(n * 10) / 10;
}
