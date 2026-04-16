import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import './Chats.css';

const API_BASE_URL = "http://localhost:8080";

// ==========================================
// 1. ХУК ДЛЯ ДОЛГОГО НАЖАТИЯ (УДЕРЖАНИЯ)
// ==========================================
const useLongPress = (onLongPress, onClick, ms = 2000) => {
    const timerRef = useRef(null);

    const start = useCallback((e) => {
        timerRef.current = setTimeout(() => {
            onLongPress(e);
            timerRef.current = null;
        }, ms);
    }, [onLongPress, ms]);

    const clear = useCallback((e) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            if (onClick) onClick(e); // Если таймер не успел истечь, значит это был короткий клик
        }
    }, [onClick]);

    return {
        onMouseDown: start,
        onMouseUp: clear,
        onMouseLeave: () => { if (timerRef.current) clearTimeout(timerRef.current); },
        onTouchStart: start,
        onTouchEnd: clear,
    };
};

// ==========================================
// 2. КОМПОНЕНТ КАРТОЧКИ ДОГОВОРА (ОФФЕРА)
// ==========================================
const OfferCard = ({ msg, isMine, currentChatInfo, user, stompClient, showToast }) => {
    const isActive = msg.offerStatus === 'ACTIVE';

    // Удержание "Принять"
    const acceptLongPress = useLongPress(
        () => {
            stompClient.current.publish({
                destination: `/app/chat/${currentChatInfo.id}/acceptOffer`,
                body: JSON.stringify({ id: msg.id, senderId: user.id })
            });
        },
        () => showToast("Удерживайте кнопку 'Принять' пару секунд для подтверждения сделки ⏱️")
    );

    // Удержание "Деактивировать" (для отправителя)
    const cancelLongPress = useLongPress(
        () => {
            stompClient.current.publish({
                destination: `/app/chat/${currentChatInfo.id}/cancelOffer`,
                body: JSON.stringify({ id: msg.id, senderId: user.id })
            });
        },
        () => showToast("Удерживайте 'Деактивировать' пару секунд для отмены ⏱️")
    );

    // Обычный клик "Отклонить" (без удержания)
    const handleReject = () => {
        stompClient.current.publish({
            destination: `/app/chat/${currentChatInfo.id}/rejectOffer`,
            body: JSON.stringify({ id: msg.id, senderId: user.id })
        });
    };

    const translateStatus = (status) => {
        switch (status) {
            case 'ACTIVE': return 'Активен (Ожидает ответа)';
            case 'REJECTED': return 'Отклонен';
            case 'CANCELED': return 'Неактивен (Отменен)';
            case 'ACCEPTED': return 'Сделка заключена!';
            default: return status;
        }
    };

    return (
        <div className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`} style={{ width: '100%', display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', margin: '10px 0' }}>
            <div style={{
                background: isActive ? '#ffffff' : '#f2f2f7',
                border: `2px solid ${isActive ? '#007aff' : '#d1d1d6'}`,
                borderRadius: '16px',
                padding: '16px',
                width: '320px',
                color: isActive ? '#000' : '#8e8e93',
                opacity: isActive ? 1 : 0.8,
                boxShadow: isActive ? '0 4px 12px rgba(0,122,255,0.1)' : 'none',
                position: 'relative'
            }}>
                <h4 style={{ margin: '0 0 12px 0', color: isActive ? '#007aff' : '#8e8e93', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📄 Договор о сделке
                </h4>
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <p style={{ margin: '4px 0' }}><strong>Объект:</strong> {currentChatInfo?.objectTitle}</p>
                    <p style={{ margin: '4px 0' }}><strong>Сумма:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{msg.offerAmount}</span></p>
                    <p style={{ margin: '4px 0', color: msg.offerStatus === 'ACCEPTED' ? '#34c759' : (msg.offerStatus === 'REJECTED' ? '#ff3b30' : 'inherit') }}>
                        <strong>Статус:</strong> {translateStatus(msg.offerStatus)}
                    </p>
                </div>

                {isActive && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        {isMine ? (
                            <button {...cancelLongPress} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#ff3b30', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                                Деактивировать
                            </button>
                        ) : (
                            <>
                                <button {...acceptLongPress} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#34c759', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Принять
                                </button>
                                <button onClick={handleReject} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ff3b30', background: 'transparent', color: '#ff3b30', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Отклонить
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


// ==========================================
// 3. ОСНОВНОЙ КОМПОНЕНТ CHATS
// ==========================================
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

    const [totalUnread, setTotalUnread] = useState(0);
    const [toastMsg, setToastMsg] = useState(null); // Состояние для уведомлений

    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    // Функция показа уведомлений (Toast)
    const showToast = useCallback((msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3500);
    }, []);

    // Удержание кнопки отправки нового договора
    const sendOfferLongPress = useLongPress(
        () => {
            const amount = window.prompt("Введите предлагаемую сумму сделки (только число):");
            if (amount && !isNaN(amount) && Number(amount) > 0) {
                if (stompClient.current && stompClient.current.connected) {
                    stompClient.current.publish({
                        destination: `/app/chat/${chatId}/sendOffer`,
                        body: JSON.stringify({ senderId: user.id, offerAmount: amount })
                    });
                }
            } else if (amount) {
                showToast("Пожалуйста, введите корректное положительное число.");
            }
        },
        () => showToast("Удерживайте кнопку 🤝 пару секунд для отправки договора ⏱️")
    );

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

                    setMessages(prev => {
                        // Если это сообщение-договор, проверяем, есть ли оно уже в списке
                        if (newMsg.messageType === 'OFFER') {
                            const existingIdx = prev.findIndex(m => m.id === newMsg.id);

                            // Если статус изменился (сообщение уже было в стейте)
                            if (existingIdx !== -1) {
                                const oldMsg = prev[existingIdx];
                                if (oldMsg.offerStatus === 'ACTIVE' && newMsg.offerStatus === 'CANCELED') {
                                    showToast("⚠️ Участник отозвал свое предложение.");
                                } else if (oldMsg.offerStatus === 'ACTIVE' && newMsg.offerStatus === 'ACCEPTED') {
                                    showToast("🎉 Сделка успешно заключена! Объект скрыт из поиска.");
                                } else if (oldMsg.offerStatus === 'ACTIVE' && newMsg.offerStatus === 'REJECTED') {
                                    showToast("❌ Предложение было отклонено.");
                                }

                                const newArr = [...prev];
                                newArr[existingIdx] = newMsg;
                                return newArr;
                            } else {
                                // Если пришел НОВЫЙ договор, все старые делаем неактивными (CANCELED) визуально
                                let newArr = [...prev];
                                if (newMsg.offerStatus === 'ACTIVE') {
                                    newArr = newArr.map(m => (m.messageType === 'OFFER' && m.offerStatus === 'ACTIVE') ? { ...m, offerStatus: 'CANCELED' } : m);
                                }
                                return [...newArr, newMsg];
                            }
                        }

                        // Обычное текстовое сообщение
                        return [...prev, newMsg];
                    });
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
    }, [chatId, showToast]);

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
        return d.toLocaleDateString('ru-RU', { weekday: 'short', month: 'long', day: 'numeric' });
    };

    return (
        <div className="chats-layout">
            {/* Стили для Toast уведомлений */}
            <style>{`
                .toast-notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.85);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 30px;
                    z-index: 1000;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: fadeInOut 3.5s ease forwards;
                    pointer-events: none;
                }
                @keyframes fadeInOut {
                    0% { opacity: 0; top: 0px; }
                    10% { opacity: 1; top: 20px; }
                    90% { opacity: 1; top: 20px; }
                    100% { opacity: 0; top: 0px; }
                }
            `}</style>

            {toastMsg && <div className="toast-notification">{toastMsg}</div>}

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
                                let lastDateStr = null;

                                return messages.map((msg) => {
                                    const isMine = msg.senderId === user.id;
                                    const isSystem = msg.content && msg.content.startsWith("🤖 Система:");

                                    const msgDateStr = new Date(msg.createdAt).toDateString();
                                    const showDateSeparator = lastDateStr !== msgDateStr;
                                    lastDateStr = msgDateStr;

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showDateSeparator && (
                                                <div className="chat-date-separator">
                                                    {formatDateSeparator(msg.createdAt)}
                                                </div>
                                            )}

                                            {/* ЕСЛИ ЭТО ДОГОВОР - РЕНДЕРИМ КАРТОЧКУ */}
                                            {msg.messageType === 'OFFER' ? (
                                                <OfferCard
                                                    msg={msg}
                                                    isMine={isMine}
                                                    currentChatInfo={currentChatInfo}
                                                    user={user}
                                                    stompClient={stompClient}
                                                    showToast={showToast}
                                                />
                                            ) : (
                                                /* ИНАЧЕ - ОБЫЧНОЕ СООБЩЕНИЕ */
                                                <div className={`message-wrapper ${isMine && !isSystem ? 'mine' : 'theirs'}`} style={isSystem ? { alignSelf: 'center', maxWidth: '90%' } : {}}>
                                                    {!isMine && !isSystem && <span className="message-sender-name">{msg.senderName}</span>}
                                                    <div className="message-bubble" style={isSystem ? { background: 'rgba(255, 149, 0, 0.15)', color: '#ff9500', border: '1px solid #ff9500', fontSize: '13px', textAlign: 'center' } : {}}>
                                                        {msg.content}
                                                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                });
                            })()}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            {/* НОВАЯ КНОПКА "ПРЕДЛОЖИТЬ ДОГОВОР" */}
                            <button
                                type="button"
                                className="btn-send"
                                style={{ background: '#f2f2f7', color: '#000', marginRight: '10px' }}
                                title="Удерживайте для создания договора"
                                {...sendOfferLongPress}
                            >
                                🤝
                            </button>

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