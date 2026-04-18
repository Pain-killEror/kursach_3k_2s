import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import './PortfolioItemDetails.css';

const PortfolioItemDetails = () => {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    // Состояние для новой транзакции
    const [transaction, setTransaction] = useState({
        title: '',
        amount: '',
        type: 'EXPENSE',
        category: 'MATERIALS',
        transactionDate: new Date().toISOString().split('T')[0]
    });

    // Состояние для редактирования настроек объекта
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [settings, setSettings] = useState({
        strategyName: '',
        targetAmount: '',
        exitTaxRate: 13
    });

    useEffect(() => {
        loadData();
    }, [itemId]);

    const loadData = async () => {
        try {
            const res = await axios.get(`/portfolio/items/${itemId}/summary`);
            setSummary(res.data);
            setSettings({
                strategyName: res.data.strategyName || '',
                targetAmount: res.data.targetAmount || '',
                exitTaxRate: res.data.exitTaxRate || 13
            });
        } catch (err) {
            console.error("Ошибка загрузки данных", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/portfolio/transactions', {
                ...transaction,
                portfolioItemId: itemId
            });
            setTransaction({ ...transaction, title: '', amount: '' });
            loadData(); // Пересчитываем всё
        } catch (err) {
            alert("Ошибка при добавлении записи");
        }
    };

    const saveSettings = async () => {
        try {
            await axios.put(`/portfolio/items/${itemId}/settings`, settings);
            setIsEditingSettings(false);
            loadData();
        } catch (err) {
            alert("Ошибка при сохранении настроек");
        }
    };

    if (loading) return <div className="p-loader">Загрузка аналитики...</div>;
    if (!summary) return <div>Объект не найден</div>;

    return (
        <div className="details-page">
            <button className="back-btn" onClick={() => navigate('/portfolio')}>← К портфелю</button>

            <div className="details-grid">
                {/* ЛЕВАЯ КОЛОНКА: Аналитика */}
                <div className="analysis-section">
                    <div className="card summary-card">
                        <h2>Финансовый результат</h2>
                        <div className="big-balance">
                            <span className={summary.currentBalance >= 0 ? 'pos' : 'neg'}>
                                {summary.currentBalance.toLocaleString()} $
                            </span>
                        </div>
                        <div className="mini-stats">
                            <div className="stat-item">
                                <span>Вложено:</span>
                                <strong>{summary.totalInvested.toLocaleString()} $</strong>
                            </div>
                            <div className="stat-item">
                                <span>Доход:</span>
                                <strong>{summary.totalIncome.toLocaleString()} $</strong>
                            </div>
                        </div>
                    </div>

                    <div className="card tips-card">
                        <h3>Умные подсказки</h3>
                        <div className="tip-item">
                            <p>Чтобы выйти в ноль (с учетом налога):</p>
                            <span className="tip-value">{summary.breakEvenPrice.toLocaleString()} $</span>
                        </div>
                        <div className="tip-item">
                            <p>Ожидаемая чистая прибыль:</p>
                            <span className={`tip-value ${summary.expectedProfit >= 0 ? 'pos' : 'neg'}`}>
                                {summary.expectedProfit.toLocaleString()} $
                            </span>
                        </div>
                    </div>

                    <div className="card settings-card">
                        <div className="card-header">
                            <h3>Стратегия и цель</h3>
                            <button onClick={() => isEditingSettings ? saveSettings() : setIsEditingSettings(true)}>
                                {isEditingSettings ? 'Сохранить' : 'Изменить'}
                            </button>
                        </div>
                        {isEditingSettings ? (
                            <div className="edit-settings">
                                <input
                                    value={settings.strategyName}
                                    onChange={e => setSettings({ ...settings, strategyName: e.target.value })}
                                    placeholder="Название стратегии"
                                />
                                <input
                                    type="number"
                                    value={settings.targetAmount}
                                    onChange={e => setSettings({ ...settings, targetAmount: e.target.value })}
                                    placeholder="Целевая цена продажи"
                                />
                                <label>Налог на продажу (%)</label>
                                <input
                                    type="number"
                                    value={settings.exitTaxRate}
                                    onChange={e => setSettings({ ...settings, exitTaxRate: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="view-settings">
                                <p><strong>{summary.strategyName || 'Не установлена'}</strong></p>
                                <p>Цель: {summary.targetAmount ? `${summary.targetAmount.toLocaleString()} $` : 'Не задана'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ПРАВАЯ КОЛОНКА: Транзакции */}
                <div className="transactions-section">
                    <div className="card add-tx-card">
                        <h3>Добавить операцию</h3>
                        <form onSubmit={handleAddTransaction}>
                            <input
                                value={transaction.title}
                                onChange={e => setTransaction({ ...transaction, title: e.target.value })}
                                placeholder="Наименование (напр. 'Замена окон')"
                                required
                            />
                            <div className="form-row">
                                <input
                                    type="number"
                                    value={transaction.amount}
                                    onChange={e => setTransaction({ ...transaction, amount: e.target.value })}
                                    placeholder="Сумма"
                                    required
                                />
                                <select value={transaction.type} onChange={e => setTransaction({ ...transaction, type: e.target.value })}>
                                    <option value="EXPENSE">Расход (-)</option>
                                    <option value="INCOME">Доход (+)</option>
                                </select>
                            </div>
                            <select value={transaction.category} onChange={e => setTransaction({ ...transaction, category: e.target.value })}>
                                <option value="MATERIALS">Материалы</option>
                                <option value="LABOR">Рабочие / Услуги</option>
                                <option value="TAX">Налоги</option>
                                <option value="UTILITIES">Коммуналка</option>
                                <option value="RENT_INCOME">Аренда</option>
                                <option value="OTHER">Прочее</option>
                            </select>
                            <button type="submit" className="submit-tx">Записать</button>
                        </form>
                    </div>

                    <div className="card history-card">
                        <h3>История операций</h3>
                        <div className="tx-list">
                            {summary.transactions.map(t => (
                                <div key={t.id} className="tx-item">
                                    <div className="tx-main">
                                        <span className="tx-date">{t.transactionDate}</span>
                                        <span className="tx-title">{t.title}</span>
                                    </div>
                                    <span className={`tx-amount ${t.type === 'INCOME' ? 'pos' : 'neg'}`}>
                                        {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()} $
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortfolioItemDetails;