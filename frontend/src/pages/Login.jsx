import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  // Отключаем прокрутку только для страницы входа
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Возвращаем настройки прокрутки при уходе со страницы
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Обычный вход по почте/паролю
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка авторизации. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  // Вход через Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/google', {
        token: credentialResponse.credential
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError('Ошибка при входе через Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ padding: '24px 32px' }}>
        <h2 style={{ marginBottom: '4px', fontSize: '1.5rem', textAlign: 'center', color: '#fff' }}>
          Вход в систему
        </h2>
        <p className="auth-subtitle" style={{ marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center', color: '#a1a1aa' }}>
          Войдите, чтобы работать с портфелем
        </p>

        {error && (
          <div className="error-message" style={{ padding: '8px', marginBottom: '12px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
          <div className="input-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>Email</label>
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

          <div className="input-group" style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.85rem', color: '#e4e4e7' }}>Пароль</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Введите пароль"
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

          <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '4px', padding: '10px' }}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 10px', color: '#888', fontSize: '11px' }}>ИЛИ</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Ошибка Google')}
            theme="outline"
            shape="rectangular"
            width="100%"
          />
        </div>

        <div className="auth-redirect" style={{ marginTop: '14px', fontSize: '0.85rem', textAlign: 'center' }}>
          <span style={{ color: '#a1a1aa' }}>Нет аккаунта?</span>
          <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none', marginLeft: '5px' }}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;