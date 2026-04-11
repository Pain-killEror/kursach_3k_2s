import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Register = () => {
  // Блокировка прокрутки только для этой страницы
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'INVESTOR',
    entityType: 'INDIVIDUAL', // <-- НОВОЕ ПОЛЕ: Налоговый статус (по умолчанию Физлицо)
    password: '',
    confirmPassword: ''
  });

  // ТЕПЕРЬ ОШИБКИ ХРАНЯТСЯ ОТДЕЛЬНО!
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // Очищаем конкретную ошибку, если пользователь начал исправлять поле
    if (e.target.name === 'email') {
      setErrors(prev => ({ ...prev, email: '', general: '' }));
    }
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setErrors(prev => ({ ...prev, password: '', general: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Включаем кнопку загрузки

    const currentErrors = { email: '', password: '', general: '' };
    let hasError = false;

    // 1. ЛОКАЛЬНАЯ ПРОВЕРКА: Совпадают ли пароли?
    if (formData.password !== formData.confirmPassword) {
      currentErrors.password = 'Пароли не совпадают';
      hasError = true;
    }

    // 2. СЕРВЕРНАЯ ПРОВЕРКА: Занята ли почта? (БЕЗ попытки регистрации)
    try {
      await api.get('/auth/check-email', { params: { email: formData.email } });
    } catch (err) {
      // Если сервер ответил ошибкой 400, значит почта занята
      if (err.response?.data?.message?.toLowerCase().includes('email')) {
        currentErrors.email = err.response.data.message;
        hasError = true;
      }
    }

    // Обновляем состояния ошибок на экране (покажутся обе одновременно, если обе есть!)
    setErrors(currentErrors);

    // Если есть хоть одна ошибка (пароль кривой ИЛИ почта занята) — прерываем функцию!
    if (hasError) {
      setLoading(false);
      return;
    }

    // 3. Если ошибок нет вообще — отправляем финальный запрос на РЕГИСТРАЦИЮ
    try {
      await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        entityType: formData.entityType, // <-- ОТПРАВЛЯЕМ СТАТУС НА БЭКЕНД
        password: formData.password
      });
      navigate('/login');
    } catch (err) {
      // На случай непредвиденных ошибок сервера
      setErrors(prev => ({ ...prev, general: err.response?.data?.message || 'Ошибка регистрации' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ padding: '20px 32px' }}>
        <h2 style={{ marginBottom: '4px', fontSize: '1.5rem' }}>Регистрация</h2>
        <p className="auth-subtitle" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
          Создайте аккаунт
        </p>

        {/* Общая ошибка (если упал сервер или что-то непредвиденное) */}
        {errors.general && (
          <div className="error-message" style={{ padding: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '10px' }}>

          {/* Блок с Ролью и Налоговым статусом в одну линию */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ gap: '3px', flex: 1 }}>
              <label style={{ fontSize: '0.85rem' }}>Роль</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="INVESTOR">Инвестор</option>
                <option value="SELLER">Продавец</option>
              </select>
            </div>

            <div className="input-group" style={{ gap: '3px', flex: 1 }}>
              <label style={{ fontSize: '0.85rem' }}>Налоговый статус</label>
              <select
                name="entityType"
                value={formData.entityType}
                onChange={handleChange}
                style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="INDIVIDUAL">Физлицо</option>
                <option value="ENTREPRENEUR">ИП</option>
                <option value="LEGAL_ENTITY">Юрлицо</option>
              </select>
            </div>
          </div>

          <div className="input-group" style={{ gap: '3px' }}>
            <label style={{ fontSize: '0.85rem' }}>Имя / Название компании</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Иван Иванов или ООО 'Вектор'"
              required
              style={{ padding: '10px 12px' }}
            />
          </div>

          {/* ПОЛЕ EMAIL */}
          <div className="input-group" style={{ gap: '3px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem' }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              required
              style={{
                padding: '10px 12px',
                width: '100%',
                transition: 'border-color 0.3s ease',
                border: errors.email ? '1px solid #ef4444' : '1px solid #3f3f46',
                outline: 'none'
              }}
            />
            {errors.email && (
              <div style={{
                position: 'absolute',
                left: 'calc(100% + 12px)',
                top: '32px',
                background: '#ef4444',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 10
              }}>
                <div style={{
                  position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%)',
                  borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid #ef4444'
                }}></div>
                {errors.email}
              </div>
            )}
          </div>

          <div className="input-group" style={{ gap: '3px' }}>
            <label style={{ fontSize: '0.85rem' }}>Номер телефона</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+375 (44) 000-00-00"
              required
              style={{ padding: '10px 12px' }}
            />
          </div>

          {/* ПАРОЛЬ */}
          <div className="input-group" style={{ gap: '3px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem' }}>Пароль</label>
            <div className="password-input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Придумайте пароль"
                required
                style={{
                  padding: '10px 12px', paddingRight: '40px', width: '100%', outline: 'none', transition: 'border-color 0.3s ease',
                  border: errors.password ? '1px solid #ef4444' : '1px solid #3f3f46'
                }}
              />
              {formData.password.length > 0 && (
                <button type="button" className="toggle-password-btn" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* ПОДТВЕРЖДЕНИЕ ПАРОЛЯ */}
          <div className="input-group" style={{ gap: '3px', position: 'relative' }}>
            <label style={{ fontSize: '0.85rem' }}>Подтвердите пароль</label>
            <div className="password-input-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
                style={{
                  padding: '10px 12px', paddingRight: '40px', width: '100%', outline: 'none', transition: 'border-color 0.3s ease',
                  border: errors.password ? '1px solid #ef4444' : '1px solid #3f3f46'
                }}
              />
              {formData.confirmPassword.length > 0 && (
                <button type="button" className="toggle-password-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}>
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </button>
              )}
            </div>

            {/* Всплывающая ошибка справа МЕЖДУ паролями */}
            {errors.password && (
              <div style={{
                position: 'absolute',
                left: 'calc(100% + 12px)',
                top: '-15px',
                background: '#ef4444',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                zIndex: 10
              }}>
                <div style={{
                  position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%)',
                  borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid #ef4444'
                }}></div>
                {errors.password}
              </div>
            )}
          </div>

          <button type="submit" className="auth-button" disabled={loading} style={{ marginTop: '5px', padding: '10px' }}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '15px', fontSize: '0.85rem' }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;