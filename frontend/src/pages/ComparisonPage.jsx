import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCurrency } from '../context/CurrencyContext';
// Импортируем только то, что реально есть в твоем calculatorEngine.js
import { getSmartDefaults, getStrategiesForType } from '../utils/calculatorEngine';
import './ComparisonPage.css';

const ComparisonPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currency, formatPrice } = useCurrency();

    const [objects, setObjects] = useState([]);
    const [calculatedResults, setCalculatedResults] = useState({}); // Результаты с бэкенда
    const [loading, setLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);

    // Берем ID объектов из URL (максимум 3)
    const ids = useMemo(() => searchParams.get('ids')?.split(',').slice(0, 3) || [], [searchParams]);
    const category = searchParams.get('category') || 'Квартира';

    // Параметры калькулятора (общие для всех)
    const [calcParams, setCalcParams] = useState({
        strategyId: 'LONG_RENT',
        useMortgage: false,
        downPaymentPct: 30,
        mortgageRate: 12.5,
        mortgageTerm: 15,
        investmentHorizon: 10,
        repairCost: 0 // Мы будем использовать дефолты при загрузке
    });

    // 1. Загружаем данные объектов
    useEffect(() => {
        const fetchObjects = async () => {
            try {
                const promises = ids.map(id => api.get(`/objects/${id}`));
                const results = await Promise.all(promises);
                const data = results.map(res => res.data);
                setObjects(data);

                // Устанавливаем базовые дефолты на основе первого объекта
                if (data.length > 0) {
                    const defaults = getSmartDefaults(data[0], 'LONG_RENT');
                    setCalcParams(prev => ({ ...prev, repairCost: defaults.repairCost }));
                }
            } catch (err) {
                console.error("Ошибка загрузки:", err);
            } finally {
                setLoading(false);
            }
        };
        if (ids.length > 0) fetchObjects();
    }, [ids]);

    // 2. ФУНКЦИЯ РАСЧЕТА (через Бэкенд)
    const runCalculations = async () => {
        if (objects.length === 0) return;
        setIsCalculating(true);
        try {
            const resultsMap = {};
            // Делаем запросы для каждого объекта параллельно
            const promises = objects.map(obj =>
                api.post('/investments/calculate', {
                    objectId: obj.id,
                    ...calcParams
                })
            );
            const responses = await Promise.all(promises);
            responses.forEach((res, index) => {
                resultsMap[objects[index].id] = res.data;
            });
            setCalculatedResults(resultsMap);
        } catch (err) {
            console.error("Ошибка расчетов на бэкенде:", err);
        } finally {
            setIsCalculating(false);
        }
    };

    // Запускаем расчет при изменении параметров или списка объектов
    useEffect(() => {
        const timer = setTimeout(runCalculations, 500); // Дебаунс 500мс
        return () => clearTimeout(timer);
    }, [calcParams, objects]);

    // Функция для подсветки лучшего/худшего
    const getMetricClass = (metricKey, value, allIds) => {
        const values = allIds
            .map(id => calculatedResults[id]?.[metricKey])
            .filter(v => v !== undefined && v !== null);

        if (values.length < 2) return '';

        const max = Math.max(...values);
        const min = Math.min(...values);
        if (max === min) return '';

        // Окупаемость: меньше - лучше. Остальное: больше - лучше.
        const isInverse = metricKey === 'paybackYears';
        if (value === (isInverse ? min : max)) return 'best-cell';
        if (value === (isInverse ? max : min)) return 'worst-cell';
        return '';
    };

    if (loading) return <div className="compare-loader">Загрузка данных...</div>;

    return (
        <div className="compare-page">
            <header className="compare-header">
                <button className="back-btn" onClick={() => navigate(-1)}>← Назад</button>
                <h1>Сравнение инвестиций: {category}</h1>
            </header>

            {/* ВЕРХНЯЯ ПАНЕЛЬ ПАРАМЕТРОВ */}
            <div className="comparison-settings">
                <div className="setting-item">
                    <label>Стратегия</label>
                    <select value={calcParams.strategyId} onChange={e => setCalcParams({ ...calcParams, strategyId: e.target.value })}>
                        <option value="LONG_RENT">Долгосрочная аренда</option>
                        <option value="SHORT_RENT">Посуточная аренда</option>
                        <option value="FLIP">Перепродажа (Flip)</option>
                    </select>
                </div>
                <div className="setting-item">
                    <label>Ипотека</label>
                    <input type="checkbox" checked={calcParams.useMortgage} onChange={e => setCalcParams({ ...calcParams, useMortgage: e.target.checked })} />
                </div>
                {calcParams.useMortgage && (
                    <div className="setting-item">
                        <label>Ставка %</label>
                        <input type="number" value={calcParams.mortgageRate} onChange={e => setCalcParams({ ...calcParams, mortgageRate: e.target.value })} />
                    </div>
                )}
                <div className="setting-item">
                    <label>Срок (лет)</label>
                    <input type="number" value={calcParams.investmentHorizon} onChange={e => setCalcParams({ ...calcParams, investmentHorizon: e.target.value })} />
                </div>
                {isCalculating && <div className="calc-status-indicator">🔄 Пересчет...</div>}
            </div>

            {/* ТАБЛИЦА СРАВНЕНИЯ */}
            <div className="compare-table-container">
                <table className="compare-table">
                    <thead>
                        <tr>
                            <th className="sticky-col">Показатель</th>
                            {objects.map(obj => (
                                <th key={obj.id}>
                                    <div className="compare-obj-card">
                                        <img
                                            src={obj.imagesUrls ? `http://localhost:8080${JSON.parse(obj.imagesUrls)[0]}` : '/no-photo.png'}
                                            alt=""
                                        />
                                        <span>{obj.title}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="sticky-col row-label">Цена</td>
                            {objects.map(obj => <td key={obj.id}>{formatPrice(obj.priceTotal)}</td>)}
                        </tr>
                        <tr>
                            <td className="sticky-col row-label">Площадь</td>
                            {objects.map(obj => <td key={obj.id}>{obj.areaTotal} м²</td>)}
                        </tr>

                        <tr className="divider-row"><td colSpan={objects.length + 1}>Инвестиционные метрики</td></tr>

                        {/* Мы берем ключи из того, что возвращает твой бэкенд в InvestmentAnalyzer */}
                        {[
                            { key: 'annualizedROI', label: 'Годовая доходность (ROI)', unit: '%' },
                            { key: 'monthlyCashFlow', label: 'Чистый доход / мес', unit: currency === 'USD' ? '$' : 'Br' },
                            { key: 'paybackYears', label: 'Окупаемость', unit: ' лет' },
                            { key: 'capRate', label: 'Cap Rate', unit: '%' },
                            { key: 'totalProfit', label: 'Прибыль за весь срок', unit: currency === 'USD' ? '$' : 'Br' },
                        ].map(metric => (
                            <tr key={metric.key}>
                                <td className="sticky-col row-label">{metric.label}</td>
                                {objects.map(obj => {
                                    const val = calculatedResults[obj.id]?.[metric.key];
                                    return (
                                        <td key={obj.id} className={getMetricClass(metric.key, val, ids)}>
                                            {val !== undefined ? `${val.toLocaleString()} ${metric.unit}` : '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComparisonPage;