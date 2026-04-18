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
    const { convertPrice, formatPrice } = useCurrency();
    const isActive = msg.offerStatus === 'ACTIVE';

    const handleReject = () => {
        stompClient.current.publish({
            destination: `/app/chat/${currentChatInfo.id}/rejectOffer`,
            body: JSON.stringify({ id: msg.id, senderId: user.id })
        });
    };

    const translateStatus = (status) => {
        switch (status) {
            case 'ACTIVE': return 'Ожидает ответа';
            case 'REJECTED': return 'Отклонен';
            case 'CANCELED': return 'Отозван';
            case 'ACCEPTED': return 'Сделка заключена!';
            default: return status;
        }
    };

    let offerIcon = '🤝';
    let offerTitle = 'Договор о сделке';
    let priceLabel = 'Сумма:';

    if (msg.offerContractType === 'SALE') {
        offerIcon = '💰'; offerTitle = 'Договор купли-продажи'; priceLabel = 'Сумма:';
    } else if (msg.offerContractType === 'LONG_RENT') {
        offerIcon = '🔑'; offerTitle = 'Долгосрочная аренда'; priceLabel = 'Платеж (в месяц):';
    } else if (msg.offerContractType === 'SHORT_RENT') {
        offerIcon = '📅'; offerTitle = 'Посуточная аренда'; priceLabel = 'Платеж (в сутки):';
    } else if (msg.offerContractType === 'TERMINATION') {
        offerIcon = '🛑'; offerTitle = 'Расторжение договора';
    }

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
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{offerIcon}</div>
                <h4 style={{ margin: '0 0 12px 0', color: isActive ? '#0a84ff' : '#8e8e93' }}>
                    {offerTitle}
                </h4>
                <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#d1d1d6' }}>
                    <p style={{ margin: '4px 0' }}><strong>Объект:</strong> {currentChatInfo?.objectTitle}</p>

                    {(msg.offerStartDate || msg.offerEndDate) && (
                        <div style={{ background: '#3a3a3c', padding: '8px', borderRadius: '8px', margin: '10px 0', fontSize: '13px' }}>
                            {msg.offerStartDate && <div>С: {new Date(msg.offerStartDate).toLocaleDateString()}</div>}
                            {msg.offerEndDate && <div>По: {new Date(msg.offerEndDate).toLocaleDateString()}</div>}
                        </div>
                    )}

                    {msg.offerContractType !== 'TERMINATION' && (
                        <p style={{ margin: '10px 0', fontSize: '18px', color: '#fff' }}>
                            <strong>{priceLabel} {formatPrice(convertPrice(msg.offerAmount, msg.offerCurrency || 'USD'))}</strong>
                        </p>
                    )}

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
                                onClick={() => showToast("Удерживайте 'Отозвать' пару секунд для отмены ⏱️")}
                            >
                                Отозвать
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
                                    onClick={() => showToast("Удерживайте 'Принять' пару секунд для подтверждения ⏱️")}
                                >
                                    Принять
                                </ProgressButton>

                                <ProgressButton
                                    defaultBg="transparent"
                                    progressColor="rgba(255, 69, 58, 0.2)"
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ff453a', color: '#ff453a', cursor: 'pointer', fontWeight: 'bold' }}
                                    onLongPress={handleReject}
                                    onClick={() => showToast("Удерживайте 'Отклонить' для отказа ⏱️")}
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
    const [fullObjectInfo, setFullObjectInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const { formatPrice, currency, setCurrency, convertPrice } = useCurrency();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const dropdownRef = useRef(null);
    const messagesEndRef = useRef(null);
    const stompClient = useRef(null);

    const [totalUnread, setTotalUnread] = useState(0);
    const [toastMsg, setToastMsg] = useState(null);

    const [isDealModalOpen, setIsDealModalOpen] = useState(false);
    const [dealAmount, setDealAmount] = useState('');
    const [dealCurrency, setDealCurrency] = useState('USD');
    const [dealContractType, setDealContractType] = useState('SALE');
    const [dealStartDate, setDealStartDate] = useState('');
    const [dealEndDate, setDealEndDate] = useState('');

    const user = useMemo(() => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    }, []);

    const showToast = useCallback((msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 4500);
    }, []);

    const handleAmountChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 1 && val.startsWith('0')) {
            val = val.replace(/^0+/, '');
        }
        setDealAmount(val);
    };

    const submitDealOffer = () => {
        if (dealContractType !== 'TERMINATION' && (!dealAmount || parseInt(dealAmount) <= 0)) {
            showToast("Введите корректную сумму больше нуля.");
            return;
        }
        if (dealContractType === 'SHORT_RENT' && (!dealStartDate || !dealEndDate)) {
            showToast("Пожалуйста, выберите даты заезда и выезда.");
            return;
        }

        if (stompClient.current && stompClient.current.connected) {
            stompClient.current.publish({
                destination: `/app/chat/${chatId}/sendOffer`,
                body: JSON.stringify({
                    senderId: user.id,
                    offerAmount: dealContractType === 'TERMINATION' ? 0 : dealAmount,
                    offerCurrency: dealCurrency,
                    offerContractType: dealContractType,
                    offerStartDate: dealStartDate || null,
                    offerEndDate: dealEndDate || null
                })
            });
            setIsDealModalOpen(false);
            setDealAmount('');
            setDealStartDate('');
            setDealEndDate('');
            showToast("Договор успешно отправлен!");
        }
    };

    // ==========================================
    // ЗАГРУЗКА ОБЪЕКТА С ПРОВЕРКОЙ ПРАВ
    // ==========================================
    useEffect(() => {
        if (currentChatInfo && user) {
            // ВАЖНО: Передаем userId, чтобы бэкенд нас пустил, даже если объект скрыт!
            api.get(`/objects/${currentChatInfo.objectId}?userId=${user.id}`).then(res => {
                const obj = res.data;
                setFullObjectInfo(obj);

                if (obj.currentOccupant) {
                    setDealContractType('TERMINATION');
                } else if (obj.objectStatus === 'FOR_SALE' || obj.objectStatus === 'SOLD') {
                    setDealContractType('SALE');
                } else if (obj.objectStatus === 'FOR_RENT' || obj.objectStatus === 'RENTED') {
                    try {
                        const attrs = typeof obj.attributes === 'string' ? JSON.parse(obj.attributes) : (obj.attributes || {});
                        const rentType = attrs.type_rent || '';

                        if (rentType.toLowerCase().includes('краткосрочная')) {
                            setDealContractType('SHORT_RENT');
                        } else {
                            setDealContractType('LONG_RENT');
                        }
                    } catch (e) {
                        setDealContractType('LONG_RENT');
                    }
                }
            }).catch(e => console.error("Ошибка загрузки объекта", e));
        }
    }, [currentChatInfo, user]);

    // ==========================================
    // ЛОГИКА ПЕРЕХОДА НА ОБЪЕКТ ПО ТВОЕМУ ТЗ
    // ==========================================
    const handleObjectClick = () => {
        if (!fullObjectInfo) {
            navigate(`/object/${currentChatInfo.objectId}`);
            return;
        }

        const isOwner = fullObjectInfo.user?.id === user.id;
        const isOccupant = fullObjectInfo.currentOccupant?.id === user.id;
        const status = fullObjectInfo.objectStatus;

        // Определяем, краткосрочная ли аренда (в краткосроке пускаем всех и всегда)
        let isShortRent = false;
        try {
            const attrs = typeof fullObjectInfo.attributes === 'string' ? JSON.parse(fullObjectInfo.attributes) : (fullObjectInfo.attributes || {});
            if ((attrs.type_rent || '').toLowerCase().includes('краткосрочная')) {
                isShortRent = true;
            }
        } catch (e) { }

        if (isShortRent) {
            navigate(`/object/${currentChatInfo.objectId}`);
            return;
        }

        // Если объект ПРОДАН
        if (status === 'SOLD') {
            if (isOwner || isOccupant) {
                showToast("Вас бы перенаправило в Портфель (в разработке)...");
            } else {
                showToast("Объект уже продан 🤝");
            }
            return;
        }

        // Если объект СДАН (долгосрок)
        if (status === 'RENTED' || fullObjectInfo.currentOccupant) {
            if (isOwner || isOccupant) {
                showToast("Вас бы перенаправило в Портфель (в разработке)...");
            } else {
                showToast("Объект уже сдан 🔑");
            }
            return;
        }

        // Во всех остальных случаях (если объект свободен)
        navigate(`/object/${currentChatInfo.objectId}`);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/chats/unread-count').then(res => setTotalUnread(res.data)).catch(e => console.error(e));
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
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchChats();
    }, [chatId]);

    useEffect(() => {
        if (!chatId) return;

        setLoading(true);
        api.get(`/chats/${chatId}/messages`)
            .then(res => {
                setMessages(res.data);
                api.get('/chats/unread-count').then(c => setTotalUnread(c.data)).catch(e => console.error(e));
            })
            .catch(err => {
                console.error("Ошибка загрузки сообщений:", err);
                if (err.response?.status === 403) {
                    showToast("Ошибка доступа к сообщениям 🚫");
                }
            })
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

                    if (newMsg.messageType === 'ERROR') {
                        showToast(`❌ ${newMsg.content}`);
                        return;
                    }

                    setMessages(prev => {
                        if (newMsg.messageType === 'OFFER') {
                            const existingIdx = prev.findIndex(m => m.id === newMsg.id);
                            if (existingIdx !== -1) {
                                const oldMsg = prev[existingIdx];
                                if (oldMsg.offerStatus === 'ACTIVE' && newMsg.offerStatus === 'CANCELED') {
                                    showToast("⚠️ Предложение было отозвано.");
                                } else if (oldMsg.offerStatus === 'ACTIVE' && newMsg.offerStatus === 'ACCEPTED') {
                                    showToast("🎉 Сделка успешно заключена!");
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

        stompClient.current.publish({
            destination: `/app/chat/${chatId}/sendMessage`,
            body: JSON.stringify({ senderId: user.id, content: newMessage })
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

    const rawPriceUsd = currentChatInfo?.priceUsd;
    const displayPrice = rawPriceUsd ? formatPrice(convertPrice(rawPriceUsd, 'USD')) : 'Не указана';

    return (
        <div className="chats-layout">
            <style>{`
                .toast-notification {
                    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                    background: rgba(44, 44, 46, 0.95); color: white; padding: 14px 28px;
                    border-radius: 30px; z-index: 2000; font-size: 15px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: fadeInOut 4.5s ease forwards;
                    border: 1px solid #48484a;
                }
                @keyframes fadeInOut {
                    0% { opacity: 0; top: 0px; } 10% { opacity: 1; top: 20px; }
                    90% { opacity: 1; top: 20px; } 100% { opacity: 0; top: 0px; }
                }
                .deal-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center;
                    z-index: 1500; backdrop-filter: blur(5px);
                }
                .deal-modal {
                    background: #1c1c1e; border: 1px solid #3a3a3c; border-radius: 20px; 
                    width: 480px; padding: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.5); color: #fff;
                }
                .deal-modal h3 { margin-top: 0; color: #0a84ff; text-align: center; }
                .deal-modal-input-group { display: flex; gap: 10px; margin: 10px 0 25px 0; }
                .deal-modal-input-group input, .deal-modal-input-group select {
                    padding: 12px 15px; border-radius: 10px; border: 1px solid #3a3a3c;
                    background: #2c2c2e; color: #fff; font-size: 16px; outline: none;
                }
                .deal-modal-input-group input { flex: 1; }
                .deal-modal-input-group input:focus { border-color: #0a84ff; }
                .deal-modal-input-group input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
                .deal-modal-actions { display: flex; gap: 15px; margin-top: 20px; }
                .deal-modal-actions button {
                    flex: 1; padding: 12px; border-radius: 10px; border: none;
                    font-size: 16px; font-weight: bold; cursor: pointer;
                }
                .btn-cancel-deal { background: #3a3a3c; color: #fff; }
                .btn-submit-deal { background: #0a84ff; color: #fff; }
                .contract-type-badge {
                    background: rgba(10, 132, 255, 0.1); border: 1px solid #0a84ff; color: #0a84ff;
                    padding: 10px 15px; border-radius: 10px; text-align: center; 
                    margin-bottom: 20px; font-weight: bold; font-size: 15px;
                }
            `}</style>

            {toastMsg && <div className="toast-notification">{toastMsg}</div>}

            <header className="home-header" style={{ padding: '20px 60px', margin: '0 auto', maxWidth: '1440px', width: '100%', boxSizing: 'border-box' }}>
                <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>💎 InvestHub</div>
                <div className="currency-selector" style={{ marginLeft: 'auto', marginRight: '15px' }}>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #444', cursor: 'pointer', outline: 'none', background: '#1a1a1a', color: 'white', fontWeight: '600', fontSize: '14px' }}>
                        <option value="USD">USD ($)</option>
                        <option value="BYN">BYN (Br)</option>
                    </select>
                </div>
                <div className="user-profile-container" ref={dropdownRef}>
                    <div className="avatar-wrapper" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ position: 'relative' }}>
                        <span className="user-nickname">{user?.name || 'Гость'}</span>
                        <div className="avatar-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                        {totalUnread > 0 && <span className="unread-dot"></span>}
                    </div>
                    {isMenuOpen && (
                        <div className="user-dropdown-menu">
                            <div className="dropdown-header">
                                <p className="d-name">{user?.name}</p>
                                <p className="d-email">{user?.email}</p>
                                <p className="d-role" style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
                                    {user?.role}
                                </p>
                            </div>

                            {/* Теперь кнопка ведет в портфель и закрывает меню */}
                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    navigate('/portfolio');
                                }}
                            >
                                Мой портфель
                            </button>

                            <button
                                className="dropdown-item"
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    navigate('/chats');
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                Чаты
                                {totalUnread > 0 && <span className="menu-badge">{totalUnread}</span>}
                            </button>

                            <button className="dropdown-item logout" onClick={handleLogout}>
                                Выйти
                            </button>
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
                            <button className="btn-back" onClick={() => navigate('/')} style={{ background: '#2c2c2e', padding: '8px 16px', borderRadius: '10px', color: '#fff', textDecoration: 'none' }}>← На главную</button>
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
                                            <p className="chat-last-message">{chat.lastMessage || "Нет сообщений"}</p>
                                        </div>
                                        {chat.unreadCount > 0 && <div className="chat-unread-badge">{chat.unreadCount}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="chat-room-container">
                        <div className="chat-room-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button className="btn-back" onClick={() => navigate('/chats')}>← Назад</button>
                                {currentChatInfo && (
                                    <div className="chat-header-object" onClick={handleObjectClick} style={{ cursor: 'pointer' }}>
                                        <h4 className="cho-title" style={{ margin: 0 }}>{currentChatInfo.objectTitle}</h4>
                                        <p className="cho-opponent" style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8e8e93' }}>Собеседник: {currentChatInfo.opponentName}</p>
                                    </div>
                                )}
                            </div>
                            {currentChatInfo && (
                                <div style={{ textAlign: 'right', background: '#2c2c2e', padding: '8px 16px', borderRadius: '12px' }}>
                                    <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginBottom: '2px' }}>Оценка объекта:</span>
                                    <span style={{ fontWeight: 'bold', color: '#30d158', fontSize: '15px' }}>{displayPrice}</span>
                                </div>
                            )}
                        </div>

                        <div className="chat-messages-area">
                            {(() => {
                                let lastDateStr = null;
                                return messages.map((msg) => {
                                    const isMine = msg.senderId === user.id;
                                    const isSystem = msg.content && msg.content.startsWith("Системное сообщение");
                                    const msgDateStr = new Date(msg.createdAt).toDateString();
                                    const showDateSeparator = lastDateStr !== msgDateStr;
                                    lastDateStr = msgDateStr;

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showDateSeparator && <div className="chat-date-separator">{formatDateSeparator(msg.createdAt)}</div>}
                                            {msg.messageType === 'OFFER' ? (
                                                <OfferCard msg={msg} isMine={isMine} currentChatInfo={currentChatInfo} user={user} stompClient={stompClient} showToast={showToast} />
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
                                className="btn-send" defaultBg="#2c2c2e" progressColor="#0a84ff"
                                style={{ color: '#fff', marginRight: '10px', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onLongPress={() => setIsDealModalOpen(true)}
                                onClick={() => showToast("Удерживайте кнопку 📄 пару секунд для создания договора ⏱️")}
                            >
                                📄
                            </ProgressButton>
                            <input type="text" placeholder="Напишите сообщение..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                            <button type="submit" className="btn-send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
                        </form>
                    </div>
                )}
            </div>

            {/* УМНАЯ МОДАЛКА ДОГОВОРА */}
            {isDealModalOpen && (
                <div className="deal-modal-overlay">
                    <div className="deal-modal">
                        <h3>Формирование договора</h3>
                        <p style={{ color: '#8e8e93', fontSize: '14px', textAlign: 'center', marginBottom: '20px' }}>
                            {currentChatInfo?.objectTitle}
                        </p>

                        <div className="contract-type-badge">
                            {dealContractType === 'SALE' && '🤝 Договор купли-продажи'}
                            {dealContractType === 'LONG_RENT' && '🔑 Долгосрочная аренда'}
                            {dealContractType === 'SHORT_RENT' && '📅 Краткосрочная аренда'}
                            {dealContractType === 'TERMINATION' && '🛑 Расторжение договора'}
                        </div>

                        {(dealContractType === 'SHORT_RENT' || dealContractType === 'LONG_RENT') && (
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '13px', color: '#d1d1d6' }}>С:</label>
                                    <input type="date" value={dealStartDate} onChange={e => setDealStartDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3a3a3c', background: '#2c2c2e', color: '#fff', marginTop: '5px' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '13px', color: '#d1d1d6' }}>По: {dealContractType === 'LONG_RENT' && '(необязательно)'}</label>
                                    <input type="date" value={dealEndDate} onChange={e => setDealEndDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #3a3a3c', background: '#2c2c2e', color: '#fff', marginTop: '5px' }} />
                                </div>
                            </div>
                        )}

                        {dealContractType !== 'TERMINATION' && (
                            <>
                                <label style={{ fontSize: '13px', color: '#d1d1d6' }}>
                                    {dealContractType === 'SALE' && 'Сумма сделки:'}
                                    {dealContractType === 'LONG_RENT' && 'Арендная плата (за месяц):'}
                                    {dealContractType === 'SHORT_RENT' && 'Арендная плата (за сутки):'}
                                </label>
                                <div className="deal-modal-input-group">
                                    <input
                                        type="text"
                                        placeholder="Например: 150000"
                                        value={dealAmount}
                                        onChange={handleAmountChange}
                                        autoFocus
                                    />
                                    <select value={dealCurrency} onChange={(e) => setDealCurrency(e.target.value)} style={{ width: '100px' }}>
                                        <option value="USD">USD</option>
                                        <option value="BYN">BYN</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {dealContractType === 'TERMINATION' && (
                            <div style={{ padding: '15px', background: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', borderRadius: '10px', border: '1px solid #ff453a', textAlign: 'center', margin: '20px 0' }}>
                                Внимание! После принятия расторжения, объект появится в поиске только через 30 дней.
                            </div>
                        )}

                        <div className="deal-modal-actions">
                            <button type="button" className="btn-cancel-deal" onClick={() => setIsDealModalOpen(false)}>Отмена</button>
                            <button type="button" className="btn-submit-deal" onClick={submitDealOffer}>Отправить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chats;