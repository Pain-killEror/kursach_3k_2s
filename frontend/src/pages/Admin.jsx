import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Admin.css';

const Admin = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'objects', 'settings'

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
            const response = await api.get('/admin/users', {
                params: {
                    search: debouncedUserSearch,
                    page: userPage,
                    size: 15,
                    sortBy: userSortBy,
                    sortDir: userSortDir
                }
            });
            setUsers(response.data.content);
            setUserTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Ошибка при загрузке пользователей:', error);
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

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>⚙️ Панель администратора</h1>
                <button className="back-home-btn" onClick={() => navigate('/')}>
                    Вернуться на сайт
                </button>
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
            {/* ВКЛАДКА: ОБЪЕКТЫ (ЗАГЛУШКА ДЛЯ СЛЕДУЮЩЕГО ШАГА) */}
            {/* ========================================== */}
            {activeTab === 'objects' && (
                <div style={{ color: '#aaa', textAlign: 'center', padding: '50px' }}>
                    <h2>Загрузка интерфейса объектов...</h2>
                </div>
            )}

            {/* ========================================== */}
            {/* ВКЛАДКА: НАСТРОЙКИ (ЗАГЛУШКА ДЛЯ СЛЕДУЮЩЕГО ШАГА) */}
            {/* ========================================== */}
            {activeTab === 'settings' && (
                <div style={{ color: '#aaa', textAlign: 'center', padding: '50px' }}>
                    <h2>Загрузка интерфейса настроек...</h2>
                </div>
            )}

        </div>
    );
};

export default Admin;