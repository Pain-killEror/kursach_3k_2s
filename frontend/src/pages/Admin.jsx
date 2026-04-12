import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Admin.css';

const Admin = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'objects', 'settings'

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    };

    // ==========================================
    // СОСТОЯНИЯ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
    // ==========================================
    const [users, setUsers] = useState([]);
    const [userPage, setUserPage] = useState(0);
    const [userTotalPages, setUserTotalPages] = useState(0);
    const [userSearch, setUserSearch] = useState('');
    const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
    const [userSortBy, setUserSortBy] = useState('createdAt');
    const [userSortDir, setUserSortDir] = useState('desc');

    // Дебаунс для поиска (ждем 500мс после ввода)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedUserSearch(userSearch);
            setUserPage(0); // Сбрасываем на первую страницу при новом поиске
        }, 500);
        return () => clearTimeout(handler);
    }, [userSearch]);

    // Загрузка пользователей
    const fetchUsers = useCallback(async () => {
        try {
            const response = await api.get('/admin/users');
            // Теперь бэкенд возвращает просто массив
            let dataList = Array.isArray(response.data) ? response.data : (response.data.content || []);
            
            // Локальный поиск
            if (debouncedUserSearch) {
                const s = debouncedUserSearch.toLowerCase();
                dataList = dataList.filter(u => 
                    u.name?.toLowerCase().includes(s) || 
                    u.email?.toLowerCase().includes(s) || 
                    u.phoneNumber?.toLowerCase().includes(s) ||
                    u.role?.toLowerCase().includes(s) ||
                    u.status?.toLowerCase().includes(s)
                );
            }

            // Локальная сортировка
            dataList.sort((a, b) => {
                let aVal = a[userSortBy] || '';
                let bVal = b[userSortBy] || '';
                if (aVal < bVal) return userSortDir === 'asc' ? -1 : 1;
                if (aVal > bVal) return userSortDir === 'asc' ? 1 : -1;
                return 0;
            });

            // Локальная пагинация
            const size = 15;
            setUserTotalPages(Math.ceil(dataList.length / size) || 1);
            setUsers(dataList.slice(userPage * size, userPage * size + size));

        } catch (error) {
            console.error('Ошибка при загрузке пользователей:', error);
            setUsers([]);
        }
    }, [debouncedUserSearch, userPage, userSortBy, userSortDir]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [fetchUsers, activeTab]);

    // Обработка клика по заголовку столбца (Сортировка)
    const handleUserSort = (column) => {
        if (userSortBy === column) {
            setUserSortDir(userSortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setUserSortBy(column);
            setUserSortDir('asc');
        }
    };

    // Методы изменения данных пользователя (PATCH)
    const updateUserField = async (id, field, value, endpoint) => {
        try {
            await api.patch(`/admin/users/${id}/${endpoint}`, { [field]: value });
            fetchUsers(); // Обновляем таблицу после успеха
        } catch (error) {
            alert('Ошибка при обновлении пользователя');
        }
    };

    const renderSortIndicator = (column) => {
        if (userSortBy !== column) return null;
        return userSortDir === 'asc' ? ' ↑' : ' ↓';
    };

    // ==========================================
    // ЛОГИКА ДЛЯ ОБЪЕКТОВ
    // ==========================================
    const [objects, setObjects] = useState([]);
    const [objectPage, setObjectPage] = useState(0);
    const [objectTotalPages, setObjectTotalPages] = useState(0);
    const [objectSearch, setObjectSearch] = useState('');
    const [debouncedObjectSearch, setDebouncedObjectSearch] = useState('');
    const [objectSortBy, setObjectSortBy] = useState('createdAt');
    const [objectSortDir, setObjectSortDir] = useState('desc');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedObjectSearch(objectSearch);
            setObjectPage(0);
        }, 500);
        return () => clearTimeout(handler);
    }, [objectSearch]);

    const fetchObjects = useCallback(async () => {
        try {
            const response = await api.get('/admin/objects', {
                params: {
                    search: debouncedObjectSearch,
                    page: objectPage,
                    size: 15,
                    sortBy: objectSortBy,
                    sortDir: objectSortDir
                }
            });
            setObjects(response.data.content);
            setObjectTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Ошибка при загрузке объектов:', error);
        }
    }, [debouncedObjectSearch, objectPage, objectSortBy, objectSortDir]);

    useEffect(() => {
        if (activeTab === 'objects') fetchObjects();
    }, [fetchObjects, activeTab]);

    const handleObjectSort = (column) => {
        if (objectSortBy === column) {
            setObjectSortDir(objectSortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setObjectSortBy(column);
            setObjectSortDir('asc');
        }
    };

    const updateObjectVisibility = async (id, isVisible) => {
        try {
            await api.patch(`/admin/objects/${id}/visibility`, { isVisible });
            fetchObjects();
        } catch (error) {
            alert('Ошибка при обновлении видимости объекта');
        }
    };

    const renderObjectSortIndicator = (column) => {
        if (objectSortBy !== column) return null;
        return objectSortDir === 'asc' ? ' ↑' : ' ↓';
    };

    // ==========================================
    // ЛОГИКА ДЛЯ НАСТРОЕК
    // ==========================================
    const [settings, setSettings] = useState([]);
    const [localSettings, setLocalSettings] = useState({});
    
    // Модальные окна
    const [infoModal, setInfoModal] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    const fetchSettings = useCallback(async () => {
        try {
            const rs = await api.get('/admin/settings');
            setSettings(rs.data);
            const initLocal = {};
            rs.data.forEach(s => initLocal[s.settingKey] = s.settingValue);
            setLocalSettings(initLocal);
        } catch (error) {
            console.error('Ошибка при загрузке настроек:', error);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'settings') fetchSettings();
    }, [fetchSettings, activeTab]);

    const settingLabels = {
        TAX_ENTREPRENEUR_INCOME: "Подоходный налог (ИП)",
        TAX_ENTREPRENEUR_PROPERTY: "Налог на коммерческую недвижимость",
        TAX_INDIVIDUAL_INCOME: "Подоходный налог (Физ. лицо)",
        TAX_INDIVIDUAL_PROPERTY: "Налог на недвижимость",
        TAX_LEGAL_PROFIT: "Налог на прибыль",
        TAX_LEGAL_PROPERTY: "Налог на недвижимость",
        TAX_LEGAL_USN: "Ставка УСН",
        TAX_LEGAL_VAT: "НДС"
    };

    const extendedDescriptions = {
        TAX_ENTREPRENEUR_INCOME: "Этот налог автоматически удерживается с расчетного дохода от аренды, получаемого инвестором со статусом ИП. Он вычитается платформой или самим инвестором перед фиксацией чистой прибыли на балансе.",
        TAX_ENTREPRENEUR_PROPERTY: "Обязательный государственный сбор за владение коммерческой недвижимостью. Он распределяется на каждый месяц и вычитается из общего пула доходов объекта, тем самым влияя на финальную доходность всех дольщиков.",
        TAX_INDIVIDUAL_INCOME: "Стандартный налог на доходы физических лиц (НДФЛ). Должен удерживаться с каждой выплаты арендных платежей инвестору-физлицу до возможности вывода средств на его банковский счет.",
        TAX_INDIVIDUAL_PROPERTY: "Имущественный налог для физических лиц, владеющих долями. Выступает как операционная издержка объекта и закладывается в финансовую модель окупаемости еще до начала сбора средств на покупку здания.",
        TAX_LEGAL_PROFIT: "Корпоративный налог на прибыль (обычно 20%). Применяется только в том случае, если расчетной единицей (инвестором) выступает зарегистрированное юридическое лицо, находящееся на общей (ОСН) системе налогообложения.",
        TAX_LEGAL_PROPERTY: "Налог на имущество организаций. Платформа резервирует этот процент от кадастровой стоимости недвижимости каждый год, чтобы покрывать обязательные платежи в бюджет юридического лица-владельца.",
        TAX_LEGAL_USN: "Упрощенная система налогообложения (доходы или доходы минус расходы). Если юрлицо использует этот спецрежим, данный сниженный процент будет автоматически применяться к доходам вместо налога на прибыль.",
        TAX_LEGAL_VAT: "Налог на добавленную стоимость (НДС). Автоматически прибавляется к стоимости комиссионных сборов платформы и услуг по доверительному управлению зданием."
    };

    const saveSetting = (key, description, title) => {
        const oldValue = settings.find(s => s.settingKey === key)?.settingValue;
        const newValue = localSettings[key];
        
        if (Number(oldValue) === Number(newValue)) return;

        setConfirmModal({
            key,
            title,
            oldVal: oldValue,
            newVal: newValue,
            desc: description
        });
    };

    const confirmSaveSetting = async () => {
        if (!confirmModal) return;
        const { key, newVal, desc } = confirmModal;
        try {
            await api.put(`/admin/settings/${key}`, { value: newVal, description: desc });
            fetchSettings();
            setConfirmModal(null);
        } catch (e) {
            alert('Ошибка при сохранении настройки');
        }
    };

    const renderSettingsGroup = (title, prefix) => {
        const groupSettings = settings.filter(s => s.settingKey.startsWith(prefix));
        if (groupSettings.length === 0) return null;

        return (
            <div className="settings-group" style={{ marginBottom: '30px', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#f1f1f1', borderBottom: '2px solid #333', paddingBottom: '10px' }}>{title}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {groupSettings.map(s => {
                        const lbl = settingLabels[s.settingKey] || s.settingKey;
                        const isChanged = Number(localSettings[s.settingKey]) !== Number(s.settingValue);

                        return (
                            <div key={s.settingKey} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#222', padding: '15px', borderRadius: '8px', border: '1px solid #444' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#ddd', marginRight: '8px' }}>{lbl}</span>
                                    <span 
                                        onClick={() => setInfoModal({ key: s.settingKey, title: lbl, text: s.description })}
                                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#333', color: '#aaa', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', border: '1px solid #555' }}
                                        title="Нажмите, чтобы узнать подробнее"
                                    >
                                        ?
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        style={{ flex: 1, padding: '8px 12px', border: '1px solid #555', borderRadius: '6px', fontSize: '14px', background: '#111', color: '#fff', outline: 'none' }}
                                        value={localSettings[s.settingKey] !== undefined ? localSettings[s.settingKey] : ''}
                                        onChange={(e) => setLocalSettings(prev => ({...prev, [s.settingKey]: e.target.value}))}
                                        onFocus={(e) => e.target.style.borderColor = '#8e44ad'}
                                        onBlur={(e) => e.target.style.borderColor = '#555'}
                                    />
                                    <button 
                                        onClick={() => saveSetting(s.settingKey, s.description, lbl)}
                                        disabled={!isChanged}
                                        style={{ padding: '8px 15px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isChanged ? 'pointer' : 'not-allowed', backgroundColor: isChanged ? '#8e44ad' : '#444', color: isChanged ? 'white' : '#777', transition: 'all 0.2s' }}
                                    >
                                        Сохранить
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="admin-container">
            <header className="home-header" style={{ padding: '15px 40px', margin: '0 0 20px 0' }}>
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    💎 InvestHub
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#8e44ad', fontWeight: 'bold', marginRight: '20px', fontSize: '18px' }}>
                        ⚙️ Панель администратора
                    </span>
                    <button
                        className="sell-property-btn"
                        onClick={() => navigate('/')}
                        style={{
                            marginRight: '20px', padding: '8px 18px', backgroundColor: '#34495e',
                            color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600',
                            cursor: 'pointer', fontSize: '13px'
                        }}
                    >
                        ← На главную
                    </button>
                    
                    <div className="user-profile-container" ref={dropdownRef}>
                        <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <span className="user-nickname">{user?.name || 'Гость'}</span>
                            <div className="avatar-circle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                        </div>
                        {isMenuOpen && (
                            <div className="user-dropdown-menu">
                                <div className="dropdown-header">
                                    <p className="d-name">{user?.name}</p>
                                    <p className="d-email">{user?.email}</p>
                                    <p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{user?.role}</p>
                                </div>
                                <button className="dropdown-item">Мой профиль</button>
                                <button onClick={handleLogout} className="dropdown-item logout">Выйти</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Пользователи
                </button>
                <button
                    className={`admin-tab ${activeTab === 'objects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('objects')}
                >
                    🏢 Объекты недвижимости
                </button>
                <button
                    className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    🛠️ Настройки
                </button>
            </div>

            {/* ========================================== */}
            {/* ВКЛАДКА: ПОЛЬЗОВАТЕЛИ */}
            {/* ========================================== */}
            {activeTab === 'users' && (
                <div>
                    <div className="admin-toolbar">
                        <input
                            type="text"
                            placeholder="Поиск по имени, email, телефону, роли или статусу..."
                            className="admin-search-input"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                        />
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleUserSort('name')}>Имя {renderSortIndicator('name')}</th>
                                    <th onClick={() => handleUserSort('email')}>Email {renderSortIndicator('email')}</th>
                                    <th onClick={() => handleUserSort('phoneNumber')}>Телефон {renderSortIndicator('phoneNumber')}</th>
                                    <th onClick={() => handleUserSort('role')}>Роль {renderSortIndicator('role')}</th>
                                    <th onClick={() => handleUserSort('status')}>Статус {renderSortIndicator('status')}</th>
                                    <th onClick={() => handleUserSort('entityType')}>Тип лица {renderSortIndicator('entityType')}</th>
                                    <th onClick={() => handleUserSort('createdAt')}>Регистрация {renderSortIndicator('createdAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td><b>{u.name}</b></td>
                                        <td>{u.email}</td>
                                        <td>{u.phoneNumber || '—'}</td>
                                        <td>
                                            <select
                                                className="admin-filter-select"
                                                value={u.role}
                                                onChange={(e) => updateUserField(u.id, 'role', e.target.value, 'role')}
                                                style={{ padding: '5px', fontSize: '12px' }}
                                            >
                                                <option value="INVESTOR">Инвестор</option>
                                                <option value="SELLER">Продавец</option>
                                                <option value="ADMIN">Админ</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                className={`admin-filter-select ${u.status === 'ACTIVE' ? 'badge active' : 'badge blocked'}`}
                                                value={u.status}
                                                onChange={(e) => updateUserField(u.id, 'status', e.target.value, 'status')}
                                                style={{ padding: '5px', fontSize: '12px', border: 'none' }}
                                            >
                                                <option value="ACTIVE">АКТИВЕН</option>
                                                <option value="BLOCKED">ЗАБЛОКИРОВАН</option>
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                className="admin-filter-select"
                                                value={u.entityType}
                                                onChange={(e) => updateUserField(u.id, 'entityType', e.target.value, 'entity-type')}
                                                style={{ padding: '5px', fontSize: '12px' }}
                                            >
                                                <option value="INDIVIDUAL">Физлицо</option>
                                                <option value="ENTREPRENEUR">ИП</option>
                                                <option value="LEGAL_ENTITY">Юрлицо</option>
                                            </select>
                                        </td>
                                        <td>{new Date(u.createdAt).toLocaleDateString('ru-RU')}</td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                            Пользователи не найдены
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Пагинация */}
                    {userTotalPages > 1 && (
                        <div className="admin-pagination">
                            <button
                                className="page-btn"
                                disabled={userPage === 0}
                                onClick={() => setUserPage(userPage - 1)}
                            >
                                Назад
                            </button>
                            <span style={{ color: '#aaa', fontSize: '14px' }}>
                                Страница {userPage + 1} из {userTotalPages}
                            </span>
                            <button
                                className="page-btn"
                                disabled={userPage >= userTotalPages - 1}
                                onClick={() => setUserPage(userPage + 1)}
                            >
                                Вперед
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================== */}
            {/* ВКЛАДКА: ОБЪЕКТЫ */}
            {/* ========================================== */}
            {activeTab === 'objects' && (
                <div>
                    <div className="admin-toolbar">
                        <input
                            type="text"
                            placeholder="Поиск по названию, городу, адресу, категории..."
                            className="admin-search-input"
                            value={objectSearch}
                            onChange={(e) => setObjectSearch(e.target.value)}
                        />
                    </div>

                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleObjectSort('category')}>Категория {renderObjectSortIndicator('category')}</th>
                                    <th onClick={() => handleObjectSort('city')}>Город {renderObjectSortIndicator('city')}</th>
                                    <th onClick={() => handleObjectSort('address')}>Адрес {renderObjectSortIndicator('address')}</th>
                                    <th onClick={() => handleObjectSort('priceTotal')}>Цена {renderObjectSortIndicator('priceTotal')}</th>
                                    <th>Владелец</th>
                                    <th>Вывод на сайте</th>
                                    <th onClick={() => handleObjectSort('createdAt')}>Создано {renderObjectSortIndicator('createdAt')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {objects.map(o => (
                                    <tr key={o.id}>
                                        <td><b>{o.category}</b></td>
                                        <td>{o.city}</td>
                                        <td>{o.address}</td>
                                        <td>{o.priceTotal} {o.currency}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                                backgroundColor: o.ownerRole === 'INVESTOR' ? '#e1bee7' : (o.ownerRole === 'SELLER' ? '#c8e6c9' : '#eee'),
                                                color: o.ownerRole === 'INVESTOR' ? '#4a148c' : (o.ownerRole === 'SELLER' ? '#1b5e20' : '#333')
                                            }}>
                                                {o.ownerRole}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                className={`admin-filter-select ${o.isVisible !== false ? 'badge active' : 'badge blocked'}`}
                                                value={o.isVisible !== false ? 'true' : 'false'}
                                                disabled={o.ownerRole === 'INVESTOR'}
                                                onChange={(e) => updateObjectVisibility(o.id, e.target.value === 'true')}
                                                style={{ padding: '5px', fontSize: '12px', border: 'none', opacity: o.ownerRole === 'INVESTOR' ? 0.5 : 1, cursor: o.ownerRole === 'INVESTOR' ? 'not-allowed' : 'pointer' }}
                                                title={o.ownerRole === 'INVESTOR' ? 'Нельзя скрывать объекты инвесторов' : ''}
                                            >
                                                <option value="true">ВИДИМЫЙ</option>
                                                <option value="false">СКРЫТ</option>
                                            </select>
                                        </td>
                                        <td>{new Date(o.createdAt).toLocaleDateString('ru-RU')}</td>
                                    </tr>
                                ))}
                                {objects.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                            Объекты не найдены
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {objectTotalPages > 1 && (
                        <div className="admin-pagination">
                            <button
                                className="page-btn"
                                disabled={objectPage === 0}
                                onClick={() => setObjectPage(objectPage - 1)}
                            >
                                Назад
                            </button>
                            <span style={{ color: '#aaa', fontSize: '14px' }}>
                                Страница {objectPage + 1} из {objectTotalPages}
                            </span>
                            <button
                                className="page-btn"
                                disabled={objectPage >= objectTotalPages - 1}
                                onClick={() => setObjectPage(objectPage + 1)}
                            >
                                Вперед
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================== */}
            {/* ВКЛАДКА: НАСТРОЙКИ */}
            {/* ========================================== */}
            {activeTab === 'settings' && (
                <div style={{ padding: '10px 0' }}>
                    <div style={{ marginBottom: '25px' }}>
                        <h2 style={{ margin: 0, color: '#f1f1f1', fontSize: '24px' }}>Налоговые ставки и сборы</h2>
                        <p style={{ color: '#aaa', margin: '8px 0 0 0', fontSize: '14px' }}>
                            Управляйте налоговыми ставками платформы. Изменения применяются немедленно и влияют на расчеты доходности инвестиций.
                        </p>
                    </div>

                    {settings.length === 0 ? (
                        <div style={{ color: '#aaa', textAlign: 'center', padding: '50px' }}>
                            Загрузка настроек...
                        </div>
                    ) : (
                        <div>
                            {renderSettingsGroup('👨‍💼 Индивидуальные предприниматели', 'TAX_ENTREPRENEUR_')}
                            {renderSettingsGroup('👤 Физические лица', 'TAX_INDIVIDUAL_')}
                            {renderSettingsGroup('🏢 Юридические лица', 'TAX_LEGAL_')}
                        </div>
                    )}
                </div>
            )}

            {/* МОДАЛЬНОЕ ОКНО ИНФОРМАЦИИ */}
            {infoModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setInfoModal(null)}>
                    <div style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%', border: '1px solid #444', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', color: '#f1f1f1' }}>
                            <span style={{ fontSize: '24px', marginRight: '10px' }}>💡</span>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>{infoModal.title}</h3>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ color: '#ccc', fontSize: '15px', lineHeight: '1.5', marginTop: 0, marginBottom: '0' }}>
                                <strong>Описание:</strong> {infoModal.text}
                            </p>
                        </div>
                        
                        <div style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #8e44ad', marginBottom: '25px' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#bbb', lineHeight: '1.6' }}>
                                <strong>Как это работает на платформе:</strong><br/>
                                {extendedDescriptions[infoModal.key] || "Этот показатель участвует в общих математических моделях расчета доходности."}
                            </p>
                        </div>

                        <button 
                            onClick={() => setInfoModal(null)}
                            style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                            onMouseOver={(e) => e.target.style.background = '#444'}
                            onMouseOut={(e) => e.target.style.background = '#333'}
                        >
                            Понятно
                        </button>
                    </div>
                </div>
            )}

            {/* МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ */}
            {confirmModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '16px', maxWidth: '450px', width: '90%', border: '1px solid #444', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', color: '#f1f1f1' }}>
                            <span style={{ fontSize: '24px', marginRight: '10px' }}>⚠️</span>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Подтверждение изменения</h3>
                        </div>
                        <p style={{ color: '#ccc', fontSize: '15px', lineHeight: '1.5', marginTop: 0, marginBottom: '25px' }}>
                            Вы собираетесь изменить налоговую ставку <b>«{confirmModal.title}»</b>.<br/><br/>
                            Старое значение: <span style={{ color: '#e74c3c', fontWeight: 'bold', fontSize: '16px' }}>{confirmModal.oldVal}%</span><br/>
                            Новое значение: <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '16px' }}>{confirmModal.newVal}%</span><br/><br/>
                            <span style={{ color: '#888', fontSize: '13px' }}>Изменение вступит в силу моментально и повлияет на последующие вычисления на платформе.</span>
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => setConfirmModal(null)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #555', color: '#aaa', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Отмена
                            </button>
                            <button 
                                onClick={confirmSaveSetting}
                                style={{ flex: 1, padding: '12px', background: '#8e44ad', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Применить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;