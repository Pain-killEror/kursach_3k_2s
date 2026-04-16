import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import './Chats.css';
import { useCurrency } from '../context/CurrencyContext';

const API_BASE_URL = "http://localhost:8080";


// ==========================================
// 1. КОМПОНЕНТ КНОПКИ С УДЕРЖАНИЕМ И ПРОГРЕСС-БАРОМ
// ==========================================
const ProgressButton = ({ onLongPress, onClick, className, style, children, defaultBg = '#2c2c2e', progressColor = '#34c759' }) => {
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);
    const timerRef = useRef(null);
    const isLongPressTriggered = useRef(false);
    const isPressing = useRef(false);


    const start = (e) => {
        isPressing.current = true;
        isLongPressTriggered.current = false;
        setProgress(0);

        intervalRef.current = setInterval(() => {
            setProgress(prev => (prev >= 100 ? 100 : prev + 2.5));
        }, 50);

        timerRef.current = setTimeout(() => {
            isLongPressTriggered.current = true;
            onLongPress();
            clearInterval(intervalRef.current);
            setTimeout(() => setProgress(0), 200);
        }, 2000);
    };

    const clear = (e) => {
        if (!isPressing.current) return;
        isPressing.current = false;

        clearInterval(intervalRef.current);
        clearTimeout(timerRef.current);

        if (!isLongPressTriggered.current) {
            if (onClick) onClick(e);
        }

        setProgress(0);
    };

    return (
        <button
            className={className}
            onMouseDown={start}
            onMouseUp={clear}
            onMouseLeave={() => { if (isPressing.current) clear(); }}
            onTouchStart={start}
            onTouchEnd={clear}
            style={{
                ...style,
                background: progress > 0
                    ? `linear-gradient(to right, ${progressColor} ${progress}%, ${defaultBg} ${progress}%)`
                    : defaultBg,
                transition: 'background 0.1s linear',
                position: 'relative',
                overflow: 'hidden',
                userSelect: 'none'
            }}
        >
            {children}
        </button>
    );
};

// ==========================================
// 2. КОМПОНЕНТ КАРТОЧКИ ДОГОВОРА (ОФФЕРА)
// ==========================================
const OfferCard = ({ msg, isMine, currentChatInfo, user, stompClient, showToast }) => {
    const isActive = msg.offerStatus === 'ACTIVE';

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
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '25px 0', clear: 'both' }}>
            <div style={{
                background: isActive ? '#1c1c1e' : '#2c2c2e',
                border: `2px solid ${isActive ? '#0a84ff' : '#48484a'}`,
                borderRadius: '16px',
                padding: '20px',
                width: '350px',
                color: '#fff',
                opacity: isActive ? 1 : 0.6,
                boxShadow: isActive ? '0 8px 24px rgba(10, 132, 255, 0.15)' : 'none',
                position: 'relative',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🤝</div>
                <h4 style={{ margin: '0 0 12px 0', color: isActive ? '#0a84ff' : '#8e8e93' }}>
                    Договор о сделке
                </h4>
                <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#d1d1d6' }}>
                    <p style={{ margin: '4px 0' }}><strong>Категория:</strong> {currentChatInfo?.category || 'Недвижимость'}</p>
                    <p style={{ margin: '4px 0' }}><strong>Объект:</strong> {currentChatInfo?.objectTitle}</p>
                    <p style={{ margin: '10px 0', fontSize: '18px', color: '#fff' }}>
                        {/* Добавлено красивое форматирование цены */}
                        <strong>Сумма: {Number(msg.offerAmount).toLocaleString('ru-RU')} {msg.currency || '$'}</strong>
                    </p>
                    <p style={{
                        margin: '8px 0 0 0',
                        fontWeight: 'bold',
                        color: msg.offerStatus === 'ACCEPTED' ? '#30d158' : (msg.offerStatus === 'REJECTED' ? '#ff453a' : 'inherit')
                    }}>
                        {translateStatus(msg.offerStatus)}
                    </p>
                </div>

                {isActive && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        {isMine ? (
                            <ProgressButton
                                defaultBg="#ff453a"
                                progressColor="#ff6961"
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                onLongPress={() => {
                                    stompClient.current.publish({
                                        destination: `/app/chat/${currentChatInfo.id}/cancelOffer`,
                                        body: JSON.stringify({ id: msg.id, senderId: user.id })
                                    });
                                }}
                                onClick={() => showToast("Удерживайте 'Деактивировать' пару секунд для отмены ⏱️")}
                            >
                                Деактивировать
                            </ProgressButton>
                        ) : (
                            <>
                                <ProgressButton
                                    defaultBg="#30d158"
                                    progressColor="#32d74b"
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                    onLongPress={() => {
                                        stompClient.current.publish({
                                            destination: `/app/chat/${currentChatInfo.id}/acceptOffer`,
                                            body: JSON.stringify({ id: msg.id, senderId: user.id })
                                        });
                                    }}
                                    onClick={() => showToast("Удерживайте 'Принять' пару секунд для подтверждения сделки ⏱️")}
                                >
                                    Принять
                                </ProgressButton>

                                <ProgressButton
                                    defaultBg="transparent"
                                    progressColor="rgba(255, 69, 58, 0.2)"
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ff453a', color: '#ff453a', cursor: 'pointer', fontWeight: 'bold' }}
                                    onLongPress={handleReject}
                                    onClick={() => showToast("Удерживайте 'Отклонить' для отказа от сделки ⏱️")}
                                >
                                    Отклонить
                                </ProgressButton>
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
    const { formatPrice, currency } = useCurrency();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const messagesEndRef = useRef(null);
    const stompClient = useRef(null);

    const [totalUnread, setTotalUnread] = useState(0);
    const [toastMsg, setToastMsg] = useState(null);

    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [dealAmount, setDealAmount] = useState('');
    const [dealCurrency, setDealCurrency] = useState('USD');

    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    const showToast = useCallback((msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3500);
    }, []);

    const handleAmountChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 1 && val.startsWith('0')) {
            val = val.replace(/^0+/, '');
        }
        setDealAmount(val);
    };

    const submitDealOffer = () => {
        if (!dealAmount || parseInt(dealAmount) <= 0) {
            showToast("Введите корректную сумму больше нуля.");
            return;
        }

        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: `/app/chat/${chatId}/sendOffer`,
                body: JSON.stringify({
                    senderId: user.id,
                    offerAmount: dealAmount,
                    currency: dealCurrency
                })
            });
            setIsDealModalOpen(false);
            setDealAmount('');
            showToast("Договор успешно отправлен!");
        }
    };

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
                        if (newMsg.messageType === 'OFFER') {
                            const existingIdx = prev.findIndex(m => m.id === newMsg.id);

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
                                let newArr = [...prev];
                                if (newMsg.offerStatus === 'ACTIVE') {
                                    newArr = newArr.map(m => (m.messageType === 'OFFER' && m.offerStatus === 'ACTIVE') ? { ...m, offerStatus: 'CANCELED' } : m);
                                }
                                return [...newArr, newMsg];
                            }
                        }
                        return [...prev, newMsg];
                    });
                });
            }
        });

        client.activate();
        stompClient.current = client;

        return () => {
            if (stompClient.current) stompClient.current.deactivate();
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
        if (stompClient.current) stompClient.current.deactivate();
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

    // === ЛОГИКА КОНВЕРТАЦИИ ЦЕНЫ ===
    const rawPriceUsd = currentChatInfo?.priceUsd;

    // Используем вашу глобальную функцию из CurrencyContext
    // Если formatPrice уже возвращает строку с символом валюты (например "150 000 BYN"), то просто вызываем ее:
    const displayPrice = rawPriceUsd ? formatPrice(rawPriceUsd) : 'Не указана';

    return (
        <div className="chats-layout">
            <style>{`
                .toast-notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(44, 44, 46, 0.95);
                    color: white;
                    padding: 14px 28px;
                    border-radius: 30px;
                    z-index: 2000;
                    font-size: 15px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    animation: fadeInOut 3.5s ease forwards;
                    pointer-events: none;
                    border: 1px solid #48484a;
                }
                @keyframes fadeInOut {
                    0% { opacity: 0; top: 0px; }
                    10% { opacity: 1; top: 20px; }
                    90% { opacity: 1; top: 20px; }
                    100% { opacity: 0; top: 0px; }
                }
                .deal-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1500; backdrop-filter: blur(5px);
                }
                .deal-modal {
                    background: #1c1c1e; border: 1px solid #3a3a3c;
                    border-radius: 20px; width: 400px; padding: 30px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.5); color: #fff;
                }
                .deal-modal h3 { margin-top: 0; color: #0a84ff; text-align: center; }
                .deal-modal-input-group { display: flex; gap: 10px; margin: 25px 0; }
                .deal-modal-input-group input {
                    flex: 1; padding: 12px 15px; border-radius: 10px;
                    border: 1px solid #3a3a3c; background: #2c2c2e; color: #fff;
                    font-size: 16px; outline: none;
                }
                .deal-modal-input-group input:focus { border-color: #0a84ff; }
                .deal-modal-input-group select {
                    width: 80px; padding: 12px; border-radius: 10px;
                    border: 1px solid #3a3a3c; background: #2c2c2e; color: #fff;
                    font-size: 16px; outline: none; cursor: pointer;
                }
                .deal-modal-actions { display: flex; gap: 15px; }
                .deal-modal-actions button {
                    flex: 1; padding: 12px; border-radius: 10px; border: none;
                    font-size: 16px; font-weight: bold; cursor: pointer;
                }
                .btn-cancel-deal { background: #3a3a3c; color: #fff; }
                .btn-submit-deal { background: #0a84ff; color: #fff; }
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
                        <div className="chat-room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button className="btn-back" onClick={() => navigate('/chats')}>
                                    ← Назад
                                </button>
                                {currentChatInfo && (
                                    <div className="chat-header-object" onClick={() => navigate(`/object/${currentChatInfo.objectId}`)} style={{ cursor: 'pointer' }}>
                                        <h4 className="cho-title" style={{ margin: 0 }}>{currentChatInfo.objectTitle}</h4>
                                        <p className="cho-opponent" style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8e8e93' }}>
                                            Собеседник: {currentChatInfo.opponentName}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Вывод стоимости */}
                            {currentChatInfo && (
                                <div style={{ textAlign: 'right', background: '#2c2c2e', padding: '8px 16px', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginBottom: '2px' }}>Стоимость объекта:</span>
                                    <span style={{ fontWeight: 'bold', color: '#30d158', fontSize: '15px' }}>
                                        {displayPrice}
                                    </span>
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
                            <ProgressButton
                                className="btn-send"
                                defaultBg="#2c2c2e"
                                progressColor="#0a84ff"
                                style={{ color: '#fff', marginRight: '10px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onLongPress={() => setIsDealModalOpen(true)}
                                onClick={() => showToast("Удерживайте кнопку 📄 пару секунд для создания договора ⏱️")}
                            >
                                📄
                            </ProgressButton>

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

            {isDealModalOpen && (
                <div className="deal-modal-overlay">
                    <div className="deal-modal">
                        <h3>Создать предложение</h3>
                        <p style={{ color: '#8e8e93', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
                            Объект: {currentChatInfo?.objectTitle}
                        </p>

                        <label style={{ fontSize: '14px', color: '#d1d1d6' }}>Предлагаемая стоимость:</label>
                        <div className="deal-modal-input-group">
                            <input
                                type="text"
                                placeholder="Например: 150000"
                                value={dealAmount}
                                onChange={handleAmountChange}
                                autoFocus
                            />
                            <select value={dealCurrency} onChange={(e) => setDealCurrency(e.target.value)}>
                                <option value="$">$</option>
                                <option value="BYN">BYN</option>
                                <option value="RUB">RUB</option>
                            </select>
                        </div>

                        <div className="deal-modal-actions">
                            <button type="button" className="btn-cancel-deal" onClick={() => setIsDealModalOpen(false)}>
                                Отмена
                            </button>
                            <button type="button" className="btn-submit-deal" onClick={submitDealOffer}>
                                Отправить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chats;