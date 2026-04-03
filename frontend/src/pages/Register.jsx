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
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Независимые состояния для пароля и подтверждения пароля
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Пароли не совпадают');
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      // После успешной регистрации перенаправляем на логин
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка при регистрации. Возможно, email уже занят.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ padding: '20px 32px' }}> {/* Чуть меньше padding сверху/снизу для вместимости */}
        <h2 style={{ marginBottom: '4px', fontSize: '1.5rem' }}>Регистрация</h2>
        <p className="auth-subtitle" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
          Создайте аккаунт инвестора
        </p>

        {error && (
          <div className="error-message" style={{ padding: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '10px' }}>
          <div className="input-group" style={{ gap: '3px' }}>
            <label style={{ fontSize: '0.85rem' }}>Имя пользователя</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Иван Иванов"
              required
              style={{ padding: '10px 12px' }}
            />
          </div>

          <div className="input-group" style={{ gap: '3px' }}>
            <label style={{ fontSize: '0.85rem' }}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@mail.com"
              required
              style={{ padding: '10px 12px' }}
            />
          </div>

          <div className="input-group" style={{ gap: '3px' }}>
            <label style={{ fontSize: '0.85rem' }}>Пароль</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Придумайте пароль"
                required
                style={{ padding: '10px 12px' }}
              />
              {formData.password.length > 0 && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ right: '10px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon" style={{ width: '18px' }}>
                    {showPassword ? (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></>
                    ) : (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="input-group" style={{ gap: '3px' }}>
            <label style={{ fontSize: '0.85rem' }}>Повторите пароль</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
                style={{ padding: '10px 12px' }}
              />
              {formData.confirmPassword.length > 0 && (
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ right: '10px' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="eye-icon" style={{ width: '18px' }}>
                    {showConfirmPassword ? (
                      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></>
                    ) : (
                      <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>
                    )}
                  </svg>
                </button>
              )}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '8px', padding: '10px' }}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="auth-redirect" style={{ marginTop: '12px', fontSize: '0.85rem' }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;