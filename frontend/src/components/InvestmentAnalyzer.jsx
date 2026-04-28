import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import {
    getStrategiesForType,
    getSmartDefaults,
    assessMetricQuality,
    METRIC_DESCRIPTIONS,
} from '../utils/calculatorEngine';
import './InvestmentAnalyzer.css';

const ENTITY_LABELS = {
    INDIVIDUAL: '👤 Физическое лицо',
    ENTREPRENEUR: '👨‍💼 ИП',
    LEGAL_ENTITY: '🏢 Юридическое лицо',
};

/**
 * InvestmentAnalyzer — профессиональный инвестиционный калькулятор.
 */
const InvestmentAnalyzer = ({ object, taxRates, formatPrice, currency, convertPrice }) => {
    // ... (CATEGORY_MAP and other state remains same until results)
    const CATEGORY_MAP = {
        'КВАРТИРА': 'Квартира',
        'ДОМ': 'Дом',
        'УЧАСТОК': 'Участок',
        'КОММЕРЦИЯ': 'Коммерция',
        'ОФИС': 'Офис',
        'СКЛАД': 'Склад',
        'ГАРАЖ': 'Гараж',
    };
    const objectType = CATEGORY_MAP[object?.category] || object?.category || 'Квартира';
    const price = Number(convertPrice(object?.priceTotal || 0, object?.currency)) || 0;

    // Доступные стратегии
    const strategies = useMemo(() => getStrategiesForType(objectType), [objectType]);

    // Состояния
    const [strategy, setStrategy] = useState(strategies[0]?.id || 'LONG_RENT');
    const [infoModal, setInfoModal] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [results, setResults] = useState(null);

    // Сбрасываем стратегию при смене типа
    useEffect(() => {
        if (!strategies.find(s => s.id === strategy)) {
            setStrategy(strategies[0]?.id || 'LONG_RENT');
        }
    }, [strategies, strategy]);

    // Smart defaults
    const defaults = useMemo(() => getSmartDefaults(object, strategy), [object, strategy]);

    // ---- Все входные параметры ----
    const [useMortgage, setUseMortgage] = useState(false);
    const [downPaymentPct, setDownPaymentPct] = useState(30);
    const [mortgageRate, setMortgageRate] = useState(12.5);
    const [mortgageTerm, setMortgageTerm] = useState(15);
    const [legalFeesPct, setLegalFeesPct] = useState(2);

    const [repairCost, setRepairCost] = useState(0);
    const [furnitureCost, setFurnitureCost] = useState(0);

    const [monthlyRent, setMonthlyRent] = useState(0);
    const [vacancyRate, setVacancyRate] = useState(5);
    const [dailyRate, setDailyRate] = useState(0);
    const [occupancyRate, setOccupancyRate] = useState(65);
    const [cleaningCost, setCleaningCost] = useState(15);
    const [platformFeePct, setPlatformFeePct] = useState(15);

    const [expectedSalePrice, setExpectedSalePrice] = useState(0);
    const [flipDurationMonths, setFlipDurationMonths] = useState(4);
    const [agentFeePct, setAgentFeePct] = useState(3);

    const [constructionCost, setConstructionCost] = useState(0);
    const [buildSellDuration, setBuildSellDuration] = useState(12);

    const [appreciationRate, setAppreciationRate] = useState(5);

    const [maintenancePct, setMaintenancePct] = useState(1);
    const [utilityCost, setUtilityCost] = useState(0);
    const [insuranceCost, setInsuranceCost] = useState(0);
    const [managementFeePct, setManagementFeePct] = useState(0);

    const [investmentHorizon, setInvestmentHorizon] = useState(10);
    const [useLegalUSN, setUseLegalUSN] = useState(false);

    // Применяем дефолты при смене стратегии/объекта
    useEffect(() => {
        // Only update if current value is 0 (uninitialized or explicitly reset)
        setRepairCost(prev => (Number(prev) === 0 ? defaults.repairCost : prev));
        setFurnitureCost(prev => (Number(prev) === 0 ? defaults.furnitureCost : prev));
        setMonthlyRent(prev => (Number(prev) === 0 ? defaults.monthlyRent : prev));
        setVacancyRate(prev => (Number(prev) === 0 ? defaults.vacancyRate : prev));
        setDailyRate(prev => (Number(prev) === 0 ? defaults.dailyRate : prev));
        setOccupancyRate(prev => (Number(prev) === 0 ? defaults.occupancyRate : prev));
        setCleaningCost(prev => (Number(prev) === 0 ? defaults.cleaningCost : prev));
        setPlatformFeePct(prev => (Number(prev) === 0 ? defaults.platformFeePct : prev));
        setExpectedSalePrice(prev => (Number(prev) === 0 ? defaults.expectedSalePrice : prev));
        setFlipDurationMonths(prev => (Number(prev) === 0 ? defaults.flipDurationMonths : prev));
        setAgentFeePct(prev => (Number(prev) === 0 ? defaults.agentFeePct : prev));
        setConstructionCost(prev => (Number(prev) === 0 ? defaults.constructionCost : prev));
        setBuildSellDuration(prev => (Number(prev) === 0 ? defaults.buildSellDuration : prev));
        setAppreciationRate(prev => (Number(prev) === 0 ? defaults.appreciationRate : prev));
        setMaintenancePct(prev => (Number(prev) === 0 ? defaults.maintenancePct : prev));
        setUtilityCost(prev => (Number(prev) === 0 ? defaults.utilityCost : prev));
        setInsuranceCost(prev => (Number(prev) === 0 ? defaults.insuranceCost : prev));
        setManagementFeePct(prev => (Number(prev) === 0 ? defaults.managementFeePct : prev));
        setLegalFeesPct(prev => (Number(prev) === 0 ? defaults.legalFeesPct : prev));
        
        // Reset mortgage to false when switching strategy to show "own funds" profitability first
        setUseMortgage(false);
    }, [defaults]);

    // ---- РАСЧЁТ НА БЭКЕНДЕ ----
    useEffect(() => {
        const calculateOnServer = async () => {
            if (!object?.id) return;
            setIsCalculating(true);
            
            const parseVal = (v) => {
                const num = (v === '' || v === null || v === undefined) ? null : Number(v);
                return (num !== null && isNaN(num)) ? null : num;
            };
            
            try {
                const requestData = {
                    objectId: object.id,
                    strategyId: strategy,
                    useMortgage,
                    downPaymentPct: parseVal(downPaymentPct),
                    mortgageRate: parseVal(mortgageRate),
                    mortgageTerm: parseVal(mortgageTerm),
                    legalFeesPct: parseVal(legalFeesPct),
                    repairCost: parseVal(repairCost),
                    furnitureCost: parseVal(furnitureCost),
                    monthlyRent: parseVal(monthlyRent),
                    vacancyRate: parseVal(vacancyRate),
                    dailyRate: parseVal(dailyRate),
                    occupancyRate: parseVal(occupancyRate),
                    cleaningCost: parseVal(cleaningCost),
                    platformFeePct: parseVal(platformFeePct),
                    expectedSalePrice: parseVal(expectedSalePrice),
                    flipDurationMonths: parseVal(flipDurationMonths),
                    agentFeePct: parseVal(agentFeePct),
                    constructionCost: parseVal(constructionCost),
                    buildSellDuration: parseVal(buildSellDuration),
                    appreciationRate: parseVal(appreciationRate),
                    investmentHorizon: parseVal(investmentHorizon),
                    maintenancePct: parseVal(maintenancePct),
                    utilityCost: parseVal(utilityCost),
                    insuranceCost: parseVal(insuranceCost),
                    managementFeePct: parseVal(managementFeePct),
                    useLegalUSN
                };


                const res = await api.post('/investments/calculate', requestData);
                setResults(res.data);
            } catch (e) {
                console.error("Ошибка при расчете на бэкенде", e);
            } finally {
                setIsCalculating(false);
            }
        };

        const timer = setTimeout(calculateOnServer, 300); // Debounce 300ms
        return () => clearTimeout(timer);
    }, [object.id, strategy, useMortgage, downPaymentPct, mortgageRate, mortgageTerm, legalFeesPct,
        repairCost, furnitureCost, monthlyRent, vacancyRate, dailyRate, occupancyRate,
        cleaningCost, platformFeePct, expectedSalePrice, flipDurationMonths, agentFeePct,
        constructionCost, buildSellDuration, appreciationRate, maintenancePct, utilityCost,
        insuranceCost, managementFeePct, investmentHorizon, useLegalUSN]);

    // Ипотечная сводка (берем из результатов бэкенда)
    const mortgageInfo = results?.mortgageInfo;

    const isRental = strategy === 'LONG_RENT' || strategy === 'SHORT_RENT';
    const isFlip = strategy === 'FLIP';
    const isBuyHold = strategy === 'BUY_HOLD';
    const isBuildSell = strategy === 'BUILD_SELL';
    const entityType = taxRates?.entityType || 'INDIVIDUAL';

    const fp = (v) => formatPrice(v || 0);
    const currSymbol = currency === 'BYN' ? 'BYN' : '$';

    return (
        <div className="inv-analyzer">
            <h3 className="inv-title">📊 Инвестиционный анализ</h3>
            <p className="inv-subtitle">Профессиональный расчёт доходности с учётом налогов, кредита и расходов</p>

            {/* Бейдж типа пользователя */}
            <div className="inv-center">
                <span className={`entity-badge ${entityType}`}>
                    {ENTITY_LABELS[entityType] || entityType}
                </span>
            </div>

            {/* ========== СЕКЦИЯ 1: СТРАТЕГИЯ ========== */}
            <div className="inv-section">
                <div className="inv-section-header">
                    <span className="section-icon">🎯</span>
                    <h4>Инвестиционная стратегия</h4>
                </div>
                <div className="strategy-cards">
                    {strategies.map(s => (
                        <div
                            key={s.id}
                            className={`strategy-card ${strategy === s.id ? 'active' : ''}`}
                            onClick={() => setStrategy(s.id)}
                        >
                            <div className="s-icon">{s.icon}</div>
                            <div className="s-name">{s.name}</div>
                            <div className="s-desc">{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ========== СЕКЦИЯ 2: ФИНАНСИРОВАНИЕ ========== */}
            <div className="inv-section">
                <div className="inv-section-header">
                    <span className="section-icon">💰</span>
                    <h4>Финансирование</h4>
                </div>

                <div className="finance-toggle">
                    <button className={!useMortgage ? 'active' : ''} onClick={() => setUseMortgage(false)}>
                        Собственные средства
                    </button>
                    <button className={useMortgage ? 'active' : ''} onClick={() => setUseMortgage(true)}>
                        Ипотека / Кредит
                    </button>
                </div>

                {useMortgage && (
                    <>
                        <div className="inv-inputs-grid">
                            <div className="inv-field">
                                <label>Первоначальный взнос (%)</label>
                                <input type="number" value={downPaymentPct} onChange={e => setDownPaymentPct(e.target.value)} min="10" max="90" />
                            </div>
                            <div className="inv-field">
                                <label>Процентная ставка (% годовых)</label>
                                <input type="number" value={mortgageRate} onChange={e => setMortgageRate(e.target.value)} step="0.1" min="0.1" />
                            </div>
                            <div className="inv-field">
                                <label>Срок кредита (лет)</label>
                                <input type="number" value={mortgageTerm} onChange={e => setMortgageTerm(e.target.value)} min="1" max="30" />
                            </div>
                        </div>

                        {mortgageInfo && (
                            <div className="mortgage-summary">
                                <div className="ms-item">
                                    <span className="ms-label">Сумма кредита</span>
                                    <span className="ms-value">{fp(mortgageInfo.loanAmount)}</span>
                                </div>
                                <div className="ms-item">
                                    <span className="ms-label">Ежемесячный платёж</span>
                                    <span className="ms-value">{fp(mortgageInfo.monthlyPayment)}</span>
                                </div>
                                <div className="ms-item">
                                    <span className="ms-label">Переплата</span>
                                    <span className="ms-value">{fp(mortgageInfo.totalInterest)}</span>
                                </div>
                                <div className="ms-item">
                                    <span className="ms-label">Ваш взнос</span>
                                    <span className="ms-value">{fp(mortgageInfo.downPayment)}</span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="inv-inputs-grid" style={{ marginTop: '14px' }}>
                    <div className="inv-field">
                        <label>Расходы на оформление (%)</label>
                        <input type="number" value={legalFeesPct} onChange={e => setLegalFeesPct(e.target.value)} step="0.5" min="0" />
                        <span className="hint">Нотариус, оценка, регистрация</span>
                    </div>
                </div>
            </div>

            {/* ========== СЕКЦИЯ 3: ДОХОДЫ ========== */}
            <div className="inv-section">
                <div className="inv-section-header">
                    <span className="section-icon">📈</span>
                    <h4>
                        {isRental ? 'Арендный доход' : isFlip ? 'Параметры перепродажи' : isBuildSell ? 'Строительство и продажа' : 'Рост стоимости'}
                    </h4>
                </div>

                {strategy === 'LONG_RENT' && (
                    <div className="inv-inputs-grid">
                        <div className="inv-field">
                            <label>Аренда ({currSymbol}/мес)</label>
                            <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} min="0" />
                            <span className="hint">Подсказка: ~{fp(defaults.monthlyRent)}/мес</span>
                        </div>
                        <div className="inv-field">
                            <label>Простой / Vacancy (%)</label>
                            <input type="number" value={vacancyRate} onChange={e => setVacancyRate(e.target.value)} min="0" max="50" />
                            <span className="hint">Доля времени без арендатора</span>
                        </div>
                    </div>
                )}

                {strategy === 'SHORT_RENT' && (
                    <div className="inv-inputs-grid">
                        <div className="inv-field">
                            <label>Ставка за сутки ({currSymbol})</label>
                            <input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} min="0" />
                        </div>
                        <div className="inv-field">
                            <label>Средняя загрузка (%)</label>
                            <input type="number" value={occupancyRate} onChange={e => setOccupancyRate(e.target.value)} min="0" max="100" />
                        </div>
                        <div className="inv-field">
                            <label>Уборка за выезд ({currSymbol})</label>
                            <input type="number" value={cleaningCost} onChange={e => setCleaningCost(e.target.value)} min="0" />
                        </div>
                        <div className="inv-field">
                            <label>Комиссия площадки (%)</label>
                            <input type="number" value={platformFeePct} onChange={e => setPlatformFeePct(e.target.value)} min="0" max="30" />
                            <span className="hint">Booking ~15%, Airbnb ~3%</span>
                        </div>
                    </div>
                )}

                {isFlip && (
                    <div className="inv-inputs-grid">
                        <div className="inv-field">
                            <label>Цена продажи ({currSymbol})</label>
                            <input type="number" value={expectedSalePrice} onChange={e => setExpectedSalePrice(e.target.value)} min="0" />
                        </div>
                        <div className="inv-field">
                            <label>Срок реализации (мес)</label>
                            <input type="number" value={flipDurationMonths} onChange={e => setFlipDurationMonths(e.target.value)} min="1" max="36" />
                        </div>
                        <div className="inv-field">
                            <label>Комиссия агента (%)</label>
                            <input type="number" value={agentFeePct} onChange={e => setAgentFeePct(e.target.value)} step="0.5" min="0" max="10" />
                        </div>
                    </div>
                )}

                {isBuildSell && (
                    <div className="inv-inputs-grid">
                        <div className="inv-field">
                            <label>Стоимость строительства ({currSymbol})</label>
                            <input type="number" value={constructionCost} onChange={e => setConstructionCost(e.target.value)} min="0" />
                            <span className="hint">Подсказка: ~{fp(defaults.constructionCost)}</span>
                        </div>
                        <div className="inv-field">
                            <label>Цена продажи ({currSymbol})</label>
                            <input type="number" value={expectedSalePrice} onChange={e => setExpectedSalePrice(e.target.value)} min="0" />
                        </div>
                        <div className="inv-field">
                            <label>Срок (мес)</label>
                            <input type="number" value={buildSellDuration} onChange={e => setBuildSellDuration(e.target.value)} min="1" max="60" />
                        </div>
                        <div className="inv-field">
                            <label>Комиссия агента (%)</label>
                            <input type="number" value={agentFeePct} onChange={e => setAgentFeePct(e.target.value)} step="0.5" min="0" />
                        </div>
                    </div>
                )}

                {isBuyHold && (
                    <div className="inv-inputs-grid">
                        <div className="inv-field">
                            <label>Ожидаемый рост стоимости (%/год)</label>
                            <input type="number" value={appreciationRate} onChange={e => setAppreciationRate(e.target.value)} step="0.5" min="0" max="30" />
                        </div>
                        <div className="inv-field">
                            <label>Горизонт инвестирования (лет)</label>
                            <input type="number" value={investmentHorizon} onChange={e => setInvestmentHorizon(e.target.value)} min="1" max="30" />
                        </div>
                    </div>
                )}
            </div>

            {/* ========== СЕКЦИЯ 4: РАСХОДЫ ========== */}
            <div className="inv-section">
                <div className="inv-section-header">
                    <span className="section-icon">💸</span>
                    <h4>Расходы</h4>
                </div>

                {/* Тумблер ОСН/УСН для юрлиц */}
                {entityType === 'LEGAL_ENTITY' && (
                    <div className="usn-toggle">
                        <input type="checkbox" id="usn-check" checked={useLegalUSN} onChange={e => setUseLegalUSN(e.target.checked)} />
                        <label htmlFor="usn-check">
                            Применить УСН ({taxRates?.usnRate || 0}%) вместо ОСН ({taxRates?.profitTaxRate || 0}%)
                        </label>
                    </div>
                )}

                <div className="inv-inputs-grid">
                    <div className="inv-field">
                        <label>Ремонт / Реконструкция ({currSymbol})</label>
                        <input type="number" value={repairCost} onChange={e => setRepairCost(e.target.value)} min="0" />
                        <span className="hint">Подсказка: ~{fp(defaults.repairCost)}</span>
                    </div>
                    {(isRental || isFlip) && (
                        <div className="inv-field">
                            <label>Мебель и оборудование ({currSymbol})</label>
                            <input type="number" value={furnitureCost} onChange={e => setFurnitureCost(e.target.value)} min="0" />
                        </div>
                    )}
                    {isRental && (
                        <>
                            <div className="inv-field">
                                <label>Обслуживание (% от стоимости/год)</label>
                                <input type="number" value={maintenancePct} onChange={e => setMaintenancePct(e.target.value)} step="0.1" min="0" max="5" />
                            </div>
                            <div className="inv-field">
                                <label>Коммуналка на вас ({currSymbol}/мес)</label>
                                <input type="number" value={utilityCost} onChange={e => setUtilityCost(e.target.value)} min="0" />
                                <span className="hint">Подсказка: ~{fp(defaults.utilityCost)}/мес</span>
                            </div>
                            <div className="inv-field">
                                <label>Страхование ({currSymbol}/год)</label>
                                <input type="number" value={insuranceCost} onChange={e => setInsuranceCost(e.target.value)} min="0" />
                            </div>
                            <div className="inv-field">
                                <label>Управляющая компания (% от дохода)</label>
                                <input type="number" value={managementFeePct} onChange={e => setManagementFeePct(e.target.value)} step="1" min="0" max="30" />
                                <span className="hint">0% если управляете сами</span>
                            </div>
                        </>
                    )}
                    {isRental && (
                        <>
                            <div className="inv-field">
                                <label>Горизонт инвестирования (лет)</label>
                                <input type="number" value={investmentHorizon} onChange={e => setInvestmentHorizon(e.target.value)} min="1" max="30" />
                            </div>
                            <div className="inv-field">
                                <label>Рост стоимости (%/год)</label>
                                <input type="number" value={appreciationRate} onChange={e => setAppreciationRate(e.target.value)} step="0.5" min="0" max="30" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="inv-divider" />

            {/* ========== СЕКЦИЯ 5: РЕЗУЛЬТАТЫ ========== */}
            <div className="inv-results-dashboard" style={{ position: 'relative', minHeight: '200px' }}>
                {isCalculating && (
                    <div className="calculating-overlay">
                        <div className="loader-spinner"></div>
                        <span>Пересчитываем...</span>
                    </div>
                )}
                {results ? (
                    <>
                        <h4>📋 Результаты анализа</h4>

                        {/* --- Денежный поток (для аренды) --- */}
                        {isRental && (
                            <div className={`cf-highlight ${results.monthlyCashFlow < 0 ? 'negative' : ''}`}>
                                <div className="cf-item">
                                    <span className="cf-label">Ежемесячно</span>
                                    <span className={`cf-value ${results.monthlyCashFlow >= 0 ? 'positive' : 'negative'}`}>
                                        {fp(results.monthlyCashFlow)}
                                    </span>
                                </div>
                                <div className="cf-item">
                                    <span className="cf-label">Ежегодно</span>
                                    <span className={`cf-value ${results.annualCashFlow >= 0 ? 'positive' : 'negative'}`}>
                                        {fp(results.annualCashFlow)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* --- Чистая прибыль (для флипа/купить-продать) --- */}
                        {(isFlip || isBuildSell) && (
                            <div className={`cf-highlight ${(results.netProfit || 0) < 0 ? 'negative' : ''}`}>
                                <div className="cf-item">
                                    <span className="cf-label">Чистая прибыль</span>
                                    <span className={`cf-value ${(results.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                                        {fp(results.netProfit)}
                                    </span>
                                </div>
                                <div className="cf-item">
                                    <span className="cf-label">Срок</span>
                                    <span className="cf-value positive">{results.durationMonths || 0} мес</span>
                                </div>
                            </div>
                        )}

                        {/* --- Для купить и держать --- */}
                        {isBuyHold && (
                            <div className={`cf-highlight ${(results.netProfit || 0) < 0 ? 'negative' : ''}`}>
                                <div className="cf-item">
                                    <span className="cf-label">Прибыль за {results.horizon || 0} лет</span>
                                    <span className={`cf-value ${(results.netProfit || 0) >= 0 ? 'positive' : 'negative'}`}>
                                        {fp(results.netProfit)}
                                    </span>
                                </div>
                                <div className="cf-item">
                                    <span className="cf-label">Будущая стоимость</span>
                                    <span className="cf-value positive">{fp(results.futureValue)}</span>
                                </div>
                            </div>
                        )}

                        {/* --- Плитки метрик (аренда) --- */}
                        {isRental && (
                            <div className="metrics-grid">
                                <MetricTile label="NOI (Чистый операционный доход)" value={fp(results.noi)} quality={assessMetricQuality('monthlyCashFlow', results.noi)} metricKey="noi" onInfo={setInfoModal} />
                                <MetricTile label="Cap Rate" value={`${results.capRate}%`} quality={assessMetricQuality('capRate', results.capRate)} metricKey="capRate" onInfo={setInfoModal} />
                                <MetricTile label="Cash-on-Cash" value={`${results.cashOnCash}%`} quality={assessMetricQuality('cashOnCash', results.cashOnCash)} metricKey="cashOnCash" onInfo={setInfoModal} />
                                <MetricTile label="Окупаемость" value={`${results.paybackYears} лет`} quality={assessMetricQuality('paybackYears', results.paybackYears)} metricKey="paybackYears" onInfo={setInfoModal} />
                                {results.dscr !== null && (
                                    <MetricTile label="DSCR (Покрытие долга)" value={results.dscr} quality={assessMetricQuality('dscr', results.dscr)} metricKey="dscr" onInfo={setInfoModal} />
                                )}
                                <MetricTile label="GRM" value={results.grm} quality={assessMetricQuality('grm', results.grm)} metricKey="grm" onInfo={setInfoModal} />
                                <MetricTile label="Безубыточность" value={`${results.breakEvenOccupancy}%`} quality={assessMetricQuality('breakEvenOccupancy', results.breakEvenOccupancy)} metricKey="breakEvenOccupancy" onInfo={setInfoModal} />
                                <MetricTile label={`Общая ROI за ${investmentHorizon} лет`} value={`${results.totalROI}%`} quality={assessMetricQuality('roi', results.totalROI)} metricKey="totalROI" onInfo={setInfoModal} />
                                <MetricTile label="Среднегодовая ROI" value={`${results.annualizedROI}%`} quality={assessMetricQuality('annualizedROI', results.annualizedROI)} metricKey="annualizedROI" onInfo={setInfoModal} />
                            </div>
                        )}

                        {/* --- Метрики для флипа --- */}
                        {(isFlip || isBuildSell) && (
                            <div className="metrics-grid">
                                <MetricTile label="ROI" value={`${results.roi || 0}%`} quality={assessMetricQuality('roi', results.roi)} metricKey="totalROI" onInfo={setInfoModal} />
                                <MetricTile label="Годовая ROI" value={`${results.annualizedROI || 0}%`} quality={assessMetricQuality('annualizedROI', results.annualizedROI)} metricKey="annualizedROI" onInfo={setInfoModal} />
                            </div>
                        )}

                        {/* --- Метрики для купить и держать --- */}
                        {isBuyHold && (
                            <div className="metrics-grid">
                                <MetricTile label="ROI" value={`${results.roi || 0}%`} quality={assessMetricQuality('roi', results.roi)} metricKey="totalROI" onInfo={setInfoModal} />
                                <MetricTile label="Годовая ROI" value={`${results.annualizedROI || 0}%`} quality={assessMetricQuality('annualizedROI', results.annualizedROI)} metricKey="annualizedROI" onInfo={setInfoModal} />
                            </div>
                        )}

                        {/* --- Детализация расходов и налогов --- */}
                        <div className="inv-breakdown">
                            {/* Инвестиции */}
                            <div className="inv-breakdown-card">
                                <h5>💵 Структура инвестиций</h5>
                                <div className="bd-row"><span className="bd-label">Стоимость объекта</span><span className="bd-value">{fp(price)}</span></div>
                                {results.legalFees > 0 && <div className="bd-row"><span className="bd-label">Расходы на оформление</span><span className="bd-value">{fp(results.legalFees)}</span></div>}
                                {results.totalRenovation > 0 && <div className="bd-row"><span className="bd-label">Ремонт + мебель</span><span className="bd-value">{fp(results.totalRenovation)}</span></div>}
                                {isBuildSell && results.constructionCost > 0 && <div className="bd-row"><span className="bd-label">Строительство</span><span className="bd-value">{fp(results.constructionCost)}</span></div>}
                                {useMortgage && <div className="bd-row"><span className="bd-label">Кредит (не ваши деньги)</span><span className="bd-value">{fp(results.mortgage?.loanAmount || 0)}</span></div>}
                                <div className="bd-row total"><span className="bd-label">Собственные средства</span><span className="bd-value">{fp(results.totalOwnFunds)}</span></div>
                            </div>

                            {/* Налоги */}
                            <div className="inv-breakdown-card">
                                <h5>🏛️ Налоговая нагрузка ({ENTITY_LABELS[entityType]})</h5>
                                {isRental && (
                                    <>
                                        <div className="bd-row"><span className="bd-label">{results.incomeTaxLabel} ({results.incomeTaxRate}%)</span><span className="bd-value">{fp(results.annualIncomeTax)}/год</span></div>
                                        <div className="bd-row"><span className="bd-label">Налог на имущество</span><span className="bd-value">{fp(results.annualPropertyTax)}/год</span></div>
                                        {results.annualVAT > 0 && <div className="bd-row"><span className="bd-label">НДС на управление</span><span className="bd-value">{fp(results.annualVAT)}/год</span></div>}
                                        <div className="bd-row total"><span className="bd-label">Итого налоги</span><span className="bd-value negative">{fp(results.totalAnnualTax)}/год</span></div>
                                    </>
                                )}
                                {(isFlip || isBuildSell) && (
                                    <>
                                        <div className="bd-row"><span className="bd-label">Налог на доход ({results.incomeTaxRate || 0}%)</span><span className="bd-value">{fp(results.incomeTax)}</span></div>
                                        {results.propertyTax > 0 && <div className="bd-row"><span className="bd-label">Налог на имущество</span><span className="bd-value">{fp(results.propertyTax)}</span></div>}
                                    </>
                                )}
                                {isBuyHold && (
                                    <>
                                        <div className="bd-row"><span className="bd-label">Налог на имущество (за {results.horizon} лет)</span><span className="bd-value">{fp(results.totalPropertyTax)}</span></div>
                                        <div className="bd-row"><span className="bd-label">Налог при продаже</span><span className="bd-value">{fp(results.saleTax)}</span></div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* --- Операционные расходы (только для аренды) --- */}
                        {isRental && (
                            <div className="inv-breakdown" style={{ marginTop: 0 }}>
                                <div className="inv-breakdown-card">
                                    <h5>📊 Операционные расходы (годовые)</h5>
                                    <div className="bd-row"><span className="bd-label">Обслуживание</span><span className="bd-value">{fp(results.annualMaintenance)}</span></div>
                                    <div className="bd-row"><span className="bd-label">Коммуналка</span><span className="bd-value">{fp(results.annualUtilities)}</span></div>
                                    <div className="bd-row"><span className="bd-label">Страхование</span><span className="bd-value">{fp(results.annualInsurance)}</span></div>
                                    <div className="bd-row"><span className="bd-label">Управляющая компания</span><span className="bd-value">{fp(results.annualManagement)}</span></div>
                                    <div className="bd-row"><span className="bd-label">Налог на имущество</span><span className="bd-value">{fp(results.annualPropertyTax)}</span></div>
                                    <div className="bd-row total"><span className="bd-label">Итого расходы</span><span className="bd-value negative">{fp(results.totalOperatingExpenses)}</span></div>
                                </div>

                                <div className="inv-breakdown-card">
                                    <h5>📈 Прогноз на {investmentHorizon} лет</h5>
                                    <div className="bd-row"><span className="bd-label">Будущая стоимость</span><span className="bd-value">{fp(results.futurePropertyValue)}</span></div>
                                    <div className="bd-row"><span className="bd-label">Прирост стоимости</span><span className="bd-value">{fp(results.capitalGain)}</span></div>
                                    <div className="bd-row"><span className="bd-label">Суммарный CF</span><span className="bd-value">{fp(results.totalCashFlowOverHorizon)}</span></div>
                                    <div className="bd-row total"><span className="bd-label">Полная прибыль</span><span className={`bd-value ${results.totalProfit < 0 ? 'negative' : ''}`}>{fp(results.totalProfit)}</span></div>
                                </div>
                            </div>
                        )}

                        {/* --- Прогнозная таблица (для аренды) --- */}
                        {isRental && results.yearlyForecast && results.yearlyForecast.length > 0 && (
                            <div className="forecast-section">
                                <h5>📅 Прогноз по годам</h5>
                                <div className="forecast-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table className="forecast-table">
                                        <thead>
                                            <tr>
                                                <th>Год</th>
                                                <th>Стоимость</th>
                                                <th>Собственный капитал</th>
                                                <th>Суммарный CF</th>
                                                <th>Общее богатство</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.yearlyForecast.map(row => (
                                                <tr key={row.year} className={row.year === Number(investmentHorizon) ? 'highlight-row' : ''}>
                                                    <td>{row.year}</td>
                                                    <td>{fp(row.propertyValue)}</td>
                                                    <td>{fp(row.equity)}</td>
                                                    <td style={{ color: row.cumulativeCashFlow >= 0 ? '#34c759' : '#ff453a' }}>{fp(row.cumulativeCashFlow)}</td>
                                                    <td style={{ fontWeight: '600' }}>{fp(row.totalWealth)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    !isCalculating && <div className="no-results-msg">Настройте параметры для расчета</div>
                )}
            </div>

            {/* ---- Модалка информации о метрике ---- */}
            {infoModal && (
                <div className="metric-info-modal-overlay" onClick={() => setInfoModal(null)}>
                    <div className="metric-info-modal" onClick={e => e.stopPropagation()}>
                        <h4>💡 {infoModal.name}</h4>
                        <p>{infoModal.desc}</p>
                        <button onClick={() => setInfoModal(null)}>Понятно</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---- Компонент плитки метрики ----
const MetricTile = ({ label, value, quality, metricKey, onInfo }) => {
    const metricInfo = METRIC_DESCRIPTIONS[metricKey];
    return (
        <div className="metric-tile">
            {metricInfo && (
                <button className="mt-info-btn" onClick={() => onInfo(metricInfo)} title="Подробнее">?</button>
            )}
            <div className="mt-label">{label}</div>
            <div className={`mt-value ${quality}`}>{value}</div>
        </div>
    );
};

export default InvestmentAnalyzer;
