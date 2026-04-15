import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import './Chats.css';

const API_BASE_URL = "http://localhost:8080";

const Chats = () => {
    const { chatId } = useParams();
    const navigate = useNavigate();
    const [chatsList, setChatsList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentChatInfo, setCurrentChatInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const messagesEndRef = useRef(null);
    const stompClient = useRef(null);

    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    const [totalUnread, setTotalUnread] = useState(0);

    // Запрашиваем количество непрочитанных при загрузке
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/chats/unread-count')
                .then(res => setTotalUnread(res.data))
                .catch(err => console.error("Ошибка загрузки счетчика:", err));
        }
    }, []);

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (chatId) return;

        const fetchChats = async () => {
            try {
                const response = await api.get('/chats');
                setChatsList(response.data);
            } catch (err) {
                console.error("Ошибка загрузки чатов", err);
            } finally {
                setLoading(false);
            }
        };
        fetchChats();
    }, [chatId]);

    useEffect(() => {
        if (!chatId) return;

        setLoading(true);
        api.get(`/chats/${chatId}/messages`)
            .then(res => {
                setMessages(res.data);
                api.get('/chats/unread-count')
                    .then(countRes => setTotalUnread(countRes.data))
                    .catch(e => console.error(e));
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
        api.get('/chats').then(res => {
            const chat = res.data.find(c => c.id === chatId);
            if (chat) setCurrentChatInfo(chat);
        });

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                client.subscribe(`/topic/chat/${chatId}`, (message) => {
                    const newMsg = JSON.parse(message.body);
                    setMessages(prev => [...prev, newMsg]);
                });
            }
        });

        client.activate();
        stompClient.current = client;

        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !stompClient.current || !stompClient.current.connected) return;

        const msgObj = {
            senderId: user.id,
            content: newMessage
        };

        stompClient.current.publish({
            destination: `/app/chat/${chatId}/sendMessage`,
            body: JSON.stringify(msgObj)
        });

        setNewMessage('');
    };

    const handleLogout = () => {
        if (stompClient.current) {
            stompClient.current.deactivate();
        }

        localStorage.clear();
        sessionStorage.clear();

        navigate('/login');

        window.location.reload();
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateSeparator = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        // Выдаст формат вроде "пн, 15 апреля"
        return d.toLocaleDateString('ru-RU', { weekday: 'short', month: 'long', day: 'numeric' });
    };

    return (
        <div className="chats-layout">
            <header className="home-header" style={{ padding: '20px 60px', margin: '0 auto', maxWidth: '1440px', width: '100%', boxSizing: 'border-box' }}>
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    💎 InvestHub
                </div>

                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ position: 'relative' }}>
                        <span className="user-nickname">{user?.name || 'Гость'}</span>
                        <div className="avatar-circle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        {/* КРАСНАЯ ТОЧКА УВЕДОМЛЕНИЯ */}
                        {totalUnread > 0 && <span className="unread-dot"></span>}
                    </div>
                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name}</p>
                                <p className="d-email">{user?.email}</p>
                                <p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>{user?.role}</p>
                            </div>
                            <button className="dropdown-item">Мой профиль</button>

                            {/* КНОПКА ЧАТОВ СО СЧЕТЧИКОМ */}
                            <button
                                className="dropdown-item"
                                onClick={() => navigate('/chats')}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                Чаты
                                {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                            </button>

                            <button className="dropdown-item logout" onClick={handleLogout}>Выйти</button>
                        </div>
                    )}
                </div>
            </header>

            <div className="chats-container">
                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '50px' }}>Загрузка...</div>
                ) : !chatId ? (
                    <>
                        {/* ДОБАВЛЕННЫЙ БЛОК: Кнопка На главную + Заголовок */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
                            <button
                                className="btn-back"
                                onClick={() => navigate('/')}
                                style={{ background: '#2c2c2e', padding: '8px 16px', borderRadius: '10px', color: '#fff', textDecoration: 'none' }}
                            >
                                ← На главную
                            </button>
                            <h1 className="chat-list-title" style={{ margin: 0 }}>Мои чаты</h1>
                        </div>

                        {chatsList.length === 0 ? (
                            <p style={{ color: '#8e8e93' }}>У вас пока нет активных диалогов.</p>
                        ) : (
                            <div className="chat-list">
                                {chatsList.map(chat => (
                                    <div key={chat.id} className="chat-list-item" onClick={() => navigate(`/chats/${chat.id}`)}>
                                        <div className="chat-item-details">
                                            <h3 className="chat-opponent-name">{chat.opponentName}</h3>
                                            <p className="chat-object-info">{chat.objectTitle}</p>
                                            <p className="chat-last-message">
                                                {chat.lastMessage || "Нет сообщений"}
                                            </p>
                                        </div>
                                        {chat.unreadCount > 0 && (
                                            <div className="chat-unread-badge">{chat.unreadCount}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="chat-room-container">
                        <div className="chat-room-header">
                            <button className="btn-back" onClick={() => navigate('/chats')}>
                                ← Назад
                            </button>
                            {currentChatInfo && (
                                /* ВАЖНО: Если страница не грузится, проверьте в App.jsx, как называется роут: /object/:id или /objects/:id.
                                   Если /objects/:id, измените ниже '/object/' на '/objects/' */
                                <div className="chat-header-object" onClick={() => navigate(`/object/${currentChatInfo.objectId}`)}>
                                    <div>
                                        <h4 className="cho-title">{currentChatInfo.objectTitle}</h4>
                                        <p className="cho-opponent">Собеседник: {currentChatInfo.opponentName}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="chat-messages-area">
                            {(() => {
                                let lastDateStr = null; // Переменная для хранения даты предыдущего сообщения

                                return messages.map((msg) => {
                                    const isMine = msg.senderId === user.id;
                                    const isSystem = msg.content.startsWith("🤖 Система:");

                                    // Проверяем, изменился ли день
                                    const msgDateStr = new Date(msg.createdAt).toDateString();
                                    const showDateSeparator = lastDateStr !== msgDateStr;
                                    lastDateStr = msgDateStr; // Обновляем для следующей итерации

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {/* ЕСЛИ НОВЫЙ ДЕНЬ - ПОКАЗЫВАЕМ ПУЗЫРЕК С ДАТОЙ */}
                                            {showDateSeparator && (
                                                <div className="chat-date-separator">
                                                    {formatDateSeparator(msg.createdAt)}
                                                </div>
                                            )}

                                            {/* САМО СООБЩЕНИЕ */}
                                            <div className={`message-wrapper ${isMine && !isSystem ? 'mine' : 'theirs'}`} style={isSystem ? { alignSelf: 'center', maxWidth: '90%' } : {}}>
                                                {!isMine && !isSystem && <span className="message-sender-name">{msg.senderName}</span>}
                                                <div className="message-bubble" style={isSystem ? { background: 'rgba(255, 149, 0, 0.15)', color: '#ff9500', border: '1px solid #ff9500', fontSize: '13px', textAlign: 'center' } : {}}>
                                                    {msg.content}
                                                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                });
                            })()}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Напишите сообщение..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit" className="btn-send">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chats;