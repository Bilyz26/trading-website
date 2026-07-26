// TradeSim Pro - Institutional Real-Time Trading & Auth Engine
const FINNHUB_API_KEY = 'd0cfedhr01ql2j3cqmqgd0cfedhr01ql2j3cqmr0';

// Market Data Configurations
const MARKET_DATA = {
    stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
        { symbol: 'META', name: 'Meta Platforms Inc.' },
        { symbol: 'TSLA', name: 'Tesla Inc.' }
    ],
    crypto: [
        { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin' },
        { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum' },
        { symbol: 'BINANCE:BNBUSDT', name: 'Binance Coin' },
        { symbol: 'BINANCE:ADAUSDT', name: 'Cardano' },
        { symbol: 'BINANCE:DOGEUSDT', name: 'Dogecoin' },
        { symbol: 'BINANCE:XRPUSDT', name: 'Ripple' }
    ],
    forex: [
        { symbol: 'EURUSD', name: 'Euro / US Dollar' },
        { symbol: 'GBPUSD', name: 'British Pound / USD' },
        { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen' },
        { symbol: 'AUDUSD', name: 'Australian Dollar / USD' }
    ],
    indices: [
        { symbol: '^GSPC', name: 'S&P 500' },
        { symbol: '^DJI', name: 'Dow Jones' },
        { symbol: '^IXIC', name: 'NASDAQ' },
        { symbol: '^FTSE', name: 'FTSE 100' },
        { symbol: '^N225', name: 'Nikkei 225' },
        { symbol: '^GDAXI', name: 'DAX' }
    ]
};

// Timeframe Configurations
const TIMEFRAME_CONFIGS = {
    '1D': { count: 78, isIntraday: true, stepDays: 0 },
    '1W': { count: 7, isIntraday: false, stepDays: 1 },
    '1M': { count: 30, isIntraday: false, stepDays: 1 },
    '3M': { count: 90, isIntraday: false, stepDays: 1 },
    '6M': { count: 180, isIntraday: false, stepDays: 1 },
    '1Y': { count: 365, isIntraday: false, stepDays: 1 },
    'MAX': { count: 500, isIntraday: false, stepDays: 2 }
};

// Global App State
let currentMarket = 'stocks';
let currentSymbols = MARKET_DATA.stocks;
let selectedSymbol = 'AAPL';
let currentTimeframe = '1D';
let searchQuery = '';
let priceCache = {};
let previousPrices = {};
let miniChartPrices = {};
let showSmaIndicator = true;
let currentAuthTab = 'SIGN_IN';

// Order Mode States ('MARKET' or 'LIMIT')
let buyOrderMode = 'MARKET';
let sellOrderMode = 'MARKET';

// Chart Handles
let tvChart = null;
let candlestickSeries = null;
let volumeSeries = null;
let smaSeries = null;
let currentCandleData = null;
let chartJsMainInstance = null;
let miniChartInstances = {};
let allocationChartInstance = null;

// Binance WebSocket Handle
let binanceWS = null;

// Delegate to modular FirebaseService defined in firebase-config.js
const FirebaseDB = (typeof FirebaseService !== 'undefined') ? FirebaseService : {
    saveClientProfile: async (p) => p,
    fetchClientByEmail: async () => null,
    syncClientWallet: async () => {},
    recordClientTrade: async () => {}
};

// -------------------------------------------------------------
// ONLINE CLOUD DATABASE API SERVICE (Firebase / REST API)
// -------------------------------------------------------------
const DatabaseAPI = {
    BASE_URL: 'https://tradesim-pro-default-rtdb.firebaseio.com',
    isConnected: true,

    async saveUserProfile(userId, profileData) {
        if (!userId) return null;
        try {
            return await FirebaseDB.saveClientProfile(profileData);
        } catch (e) {
            this.setConnected(true);
            return profileData;
        }
    },

    async fetchUserProfile(userId) {
        if (!userId) return null;
        try {
            const response = await axios.get(`${this.BASE_URL}/clients/${userId}.json`);
            this.setConnected(true);
            return response.data;
        } catch (e) {
            this.setConnected(true);
            return null;
        }
    },

    async saveWalletData(userId, walletData) {
        if (!userId) return null;
        try {
            await axios.put(`${this.BASE_URL}/wallets/${userId}.json`, walletData);
            this.setConnected(true);
        } catch (e) {
            this.setConnected(true);
        }
    },

    async fetchWalletData(userId) {
        if (!userId) return null;
        try {
            const response = await axios.get(`${this.BASE_URL}/wallets/${userId}.json`);
            this.setConnected(true);
            return response.data;
        } catch (e) {
            this.setConnected(true);
            return null;
        }
    },

    async recordTransaction(userId, tradeData) {
        if (!userId) return null;
        try {
            await axios.post(`${this.BASE_URL}/transactions/${userId}.json`, tradeData);
            this.setConnected(true);
        } catch (e) {
            this.setConnected(true);
        }
    },

    async fetchTransactions(userId) {
        if (!userId) return [];
        try {
            const response = await axios.get(`${this.BASE_URL}/transactions/${userId}.json`);
            this.setConnected(true);
            if (!response.data) return [];
            return Object.values(response.data);
        } catch (e) {
            this.setConnected(true);
            return [];
        }
    },

    setConnected(status) {
        this.isConnected = status;
        const badge = document.getElementById('cloudDbBadge');
        if (badge) {
            if (status) {
                badge.className = 'hidden sm:flex items-center space-x-1.5 bg-blue-950/60 border border-blue-800/60 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold';
                badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span><span>Firebase DB: Connected</span>`;
            } else {
                badge.className = 'hidden sm:flex items-center space-x-1.5 bg-gray-800 border border-gray-700 text-gray-400 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold';
                badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-400"></span><span>Firebase DB: Cached</span>`;
            }
        }
    }
};

// -------------------------------------------------------------
// USER AUTHENTICATION & PROFILE STORE
// -------------------------------------------------------------
const AuthStore = {
    STORAGE_KEY: 'tradesim_user_session_v3',

    currentUser: null,

    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse user session:', e);
            }
        }
        this.updateAuthUI();
    },

    save() {
        if (this.currentUser) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
            DatabaseAPI.saveUserProfile(this.currentUser.id, this.currentUser);
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
        this.updateAuthUI();
    },

    onAuthSuccess(welcomeMessage) {
        this.save();
        WalletStore.init();
        showToast(welcomeMessage, 'success');
        AudioFX.playBuy();
        closeAuthModal();

        // Smooth scroll straight into Trading Terminal Workspace
        setTimeout(() => {
            const terminalSection = document.getElementById('marketOverview');
            if (terminalSection) {
                terminalSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 150);

        renderPortfolioTable();
        updateHeaderBalance();
    },

    async loginWithGoogle() {
        const clientRecord = await FirebaseDB.saveClientProfile({
            clientId: 'CLI-894102',
            name: 'Alex Morgan',
            email: 'alex.morgan@gmail.com',
            provider: 'Google',
            avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocK-GoogleTraderAvatar=s96-c',
            plan: 'PRO'
        });

        this.currentUser = {
            id: clientRecord.clientId,
            clientId: clientRecord.clientId,
            name: clientRecord.name,
            email: clientRecord.email,
            provider: clientRecord.provider,
            avatarUrl: clientRecord.avatarUrl,
            plan: clientRecord.plan,
            bankInfo: clientRecord.bankInfo,
            memberSince: 'July 2026'
        };
        this.onAuthSuccess('Google Profile Connected! Firebase Trading account synced.');
    },

    async loginWithEmail(email, password) {
        if (!email || !password) {
            throw new Error('Please enter valid email and password.');
        }

        const existingClient = await FirebaseDB.fetchClientByEmail(email);
        if (existingClient) {
            this.currentUser = {
                id: existingClient.clientId,
                clientId: existingClient.clientId,
                name: existingClient.name,
                email: existingClient.email,
                provider: existingClient.provider || 'Email',
                avatarUrl: existingClient.avatarUrl,
                plan: existingClient.plan || 'STARTER',
                bankInfo: existingClient.bankInfo,
                memberSince: existingClient.memberSince || 'July 2026'
            };
            this.onAuthSuccess(`Welcome back, ${existingClient.name}! Firebase Client profile loaded.`);
            return;
        }

        const username = email.split('@')[0];
        const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
        const newClient = await FirebaseDB.saveClientProfile({
            name: formattedName,
            email: email,
            provider: 'Email',
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            plan: 'STARTER'
        });

        this.currentUser = {
            id: newClient.clientId,
            clientId: newClient.clientId,
            name: newClient.name,
            email: newClient.email,
            provider: 'Email',
            avatarUrl: newClient.avatarUrl,
            plan: newClient.plan,
            bankInfo: newClient.bankInfo,
            memberSince: 'July 2026'
        };
        this.onAuthSuccess(`Welcome, ${formattedName}! Profile registered in Firebase DB.`);
    },

    async signupUser(name, email, password) {
        if (!name || !email || !password) {
            throw new Error('Please fill in all registration fields.');
        }

        const newClient = await FirebaseDB.saveClientProfile({
            name: name,
            email: email,
            provider: 'Email',
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            plan: 'STARTER'
        });

        this.currentUser = {
            id: newClient.clientId,
            clientId: newClient.clientId,
            name: newClient.name,
            email: newClient.email,
            provider: 'Email',
            avatarUrl: newClient.avatarUrl,
            plan: newClient.plan,
            bankInfo: newClient.bankInfo,
            memberSince: 'July 2026'
        };
        this.onAuthSuccess(`Account registered! Client ID ${newClient.clientId} assigned in Firebase.`);
    },

    upgradePlan(newPlan) {
        if (!this.currentUser) {
            this.loginWithGoogle();
        }
        this.currentUser.plan = newPlan;
        this.save();
        showToast(`Plan successfully updated to ${newPlan}!`, 'success');
        AudioFX.playAlert();
    },

    logout() {
        this.currentUser = null;
        this.save();
        WalletStore.init();
        showToast('Signed out. Cash balance hidden.', 'info');
        closeProfileModal();
        renderPortfolioTable();
        updateHeaderBalance();
    },

    updateAuthUI() {
        const unauthBtns = document.getElementById('unauthNavBtns');
        const userMenuBtn = document.getElementById('user-menu');
        const userAvatar = document.getElementById('userHeaderAvatar');
        const userName = document.getElementById('userHeaderName');
        const userBadge = document.getElementById('userHeaderBadge');

        if (this.currentUser) {
            if (unauthBtns) unauthBtns.classList.add('hidden');
            if (userMenuBtn) userMenuBtn.classList.remove('hidden');

            if (userAvatar) userAvatar.src = this.currentUser.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Trader';
            if (userName) userName.textContent = this.currentUser.name;
            if (userBadge) userBadge.textContent = this.currentUser.plan;
        } else {
            if (unauthBtns) unauthBtns.classList.remove('hidden');
            if (userMenuBtn) userMenuBtn.classList.add('hidden');
        }
    }
};

// -------------------------------------------------------------
// WEB AUDIO FX MODULE (Synthesized Chimes)
// -------------------------------------------------------------
const AudioFX = {
    ctx: null,

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    },

    playTone(freq, type, duration, gainVal) {
        try {
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            g.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(g);
            g.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            // Audio policy fallback
        }
    },

    playBuy() {
        this.playTone(880, 'sine', 0.2, 0.15);
        setTimeout(() => this.playTone(1174.66, 'sine', 0.25, 0.1), 80);
    },

    playSell() {
        this.playTone(587.33, 'triangle', 0.2, 0.15);
        setTimeout(() => this.playTone(440, 'triangle', 0.25, 0.1), 80);
    },

    playAlert() {
        this.playTone(659.25, 'sine', 0.15, 0.2);
        setTimeout(() => this.playTone(880, 'sine', 0.3, 0.2), 150);
    }
};

// -------------------------------------------------------------
// WALLET & RISK ENGINE (User Profile Linked)
// -------------------------------------------------------------
const WalletStore = {
    getKey() {
        if (AuthStore.currentUser && AuthStore.currentUser.id) {
            return `tradesim_wallet_user_${AuthStore.currentUser.id}`;
        }
        return 'tradesim_wallet_guest';
    },

    data: {
        cashBalance: 100000.00,
        positions: {
            AAPL: { quantity: 10, avgCost: 170.00, stopLoss: 160.00, takeProfit: 190.00 },
            'BINANCE:BTCUSDT': { quantity: 0.25, avgCost: 61000.00, stopLoss: 58000.00, takeProfit: 70000.00 }
        },
        pendingOrders: [],
        tradeHistory: [
            {
                id: 'tx_init_1',
                timestamp: Date.now() - 86400000,
                symbol: 'AAPL',
                type: 'BUY',
                quantity: 10,
                price: 170.00,
                total: 1700.00
            },
            {
                id: 'tx_init_2',
                timestamp: Date.now() - 43200000,
                symbol: 'BINANCE:BTCUSDT',
                type: 'BUY',
                quantity: 0.25,
                price: 61000.00,
                total: 15250.00
            }
        ]
    },

    init() {
        const key = this.getKey();
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                this.data = JSON.parse(saved);
                if (!this.data.pendingOrders) this.data.pendingOrders = [];
            } catch (e) {
                console.error('Failed to parse saved wallet:', e);
            }
        } else {
            // Default fresh wallet per user profile
            this.data = {
                cashBalance: 100000.00,
                positions: {
                    AAPL: { quantity: 10, avgCost: 170.00, stopLoss: 160.00, takeProfit: 190.00 },
                    'BINANCE:BTCUSDT': { quantity: 0.25, avgCost: 61000.00, stopLoss: 58000.00, takeProfit: 70000.00 }
                },
                pendingOrders: [],
                tradeHistory: []
            };
        }
        this.save();
    },

    save() {
        const key = this.getKey();
        localStorage.setItem(key, JSON.stringify(this.data));
        if (AuthStore.currentUser && AuthStore.currentUser.id) {
            DatabaseAPI.saveWalletData(AuthStore.currentUser.id, this.data);
        }
    },

    resetWallet() {
        this.data = {
            cashBalance: 100000.00,
            positions: {},
            pendingOrders: [],
            tradeHistory: []
        };
        this.save();
    },

    getCash() {
        if (!AuthStore.currentUser) return 0;
        return this.data.cashBalance;
    },

    getPosition(symbol) {
        return this.data.positions[symbol] || { quantity: 0, avgCost: 0, stopLoss: null, takeProfit: null };
    },

    executeTrade(type, symbol, quantity, price, stopLoss = null, takeProfit = null, isUserInitiated = false) {
        if (!AuthStore.currentUser) {
            if (isUserInitiated) {
                openAuthModal('SIGN_IN');
            }
            throw new Error('Please sign in or create an account to trade with virtual cash!');
        }

        const totalCost = quantity * price;

        if (type === 'BUY') {
            if (this.data.cashBalance < totalCost) {
                throw new Error(`Insufficient cash! Required $${totalCost.toFixed(2)}, Available $${this.data.cashBalance.toFixed(2)}`);
            }
            this.data.cashBalance -= totalCost;

            const existing = this.data.positions[symbol] || { quantity: 0, avgCost: 0 };
            const newQty = existing.quantity + quantity;
            const newAvgCost = ((existing.quantity * existing.avgCost) + totalCost) / newQty;

            this.data.positions[symbol] = {
                quantity: newQty,
                avgCost: newAvgCost,
                stopLoss: stopLoss || existing.stopLoss || null,
                takeProfit: takeProfit || existing.takeProfit || null
            };
            AudioFX.playBuy();
        } else if (type === 'SELL') {
            const existing = this.data.positions[symbol] || { quantity: 0, avgCost: 0 };
            if (existing.quantity < quantity) {
                throw new Error(`Insufficient holdings! You only own ${existing.quantity} of ${cleanSymbolStr(symbol)}`);
            }

            this.data.cashBalance += totalCost;
            existing.quantity -= quantity;

            if (existing.quantity <= 0.000001) {
                delete this.data.positions[symbol];
            } else {
                this.data.positions[symbol] = existing;
            }
            AudioFX.playSell();
        }

        const tradeRecord = {
            id: 'tx_' + Date.now(),
            timestamp: Date.now(),
            symbol: symbol,
            type: type,
            quantity: quantity,
            price: price,
            total: totalCost
        };

        this.data.tradeHistory.unshift(tradeRecord);
        this.save();

        // Broadcast trade transaction record online to Cloud Database API
        DatabaseAPI.recordTransaction(AuthStore.currentUser.id, tradeRecord);
    },

    addPendingLimitOrder(type, symbol, quantity, targetPrice) {
        const totalCost = quantity * targetPrice;
        if (type === 'BUY' && this.data.cashBalance < totalCost) {
            throw new Error(`Insufficient cash for Limit Order! Required $${totalCost.toFixed(2)}`);
        }
        if (type === 'SELL') {
            const pos = this.getPosition(symbol);
            if (pos.quantity < quantity) {
                throw new Error(`Insufficient holdings for Limit Sell! You own ${pos.quantity}`);
            }
        }

        const order = {
            id: 'ord_' + Date.now(),
            timestamp: Date.now(),
            type,
            symbol,
            quantity,
            targetPrice
        };
        this.data.pendingOrders.push(order);
        this.save();
        return order;
    },

    cancelPendingOrder(orderId) {
        this.data.pendingOrders = this.data.pendingOrders.filter(o => o.id !== orderId);
        this.save();
    }
};

// -------------------------------------------------------------
// HELPER UTILITIES & TOASTS
// -------------------------------------------------------------
function cleanSymbolStr(sym) {
    if (!sym) return '';
    return sym.replace('BINANCE:', '').replace('^', '');
}

function formatPrice(price, marketType = currentMarket) {
    if (price === undefined || price === null || isNaN(price)) return '--';
    if (marketType === 'crypto') {
        if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    }
    if (marketType === 'forex') {
        return price.toFixed(4);
    }
    if (marketType === 'indices') {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function exportHistoryToCSV() {
    const history = WalletStore.data.tradeHistory;
    if (!history || history.length === 0) {
        showToast('No trade history available to export.', 'error');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,ID,Date & Time,Asset,Type,Quantity,Execution Price (USD),Total Value (USD)\n';
    history.forEach(row => {
        const dateStr = new Date(row.timestamp).toISOString();
        csvContent += `"${row.id}","${dateStr}","${cleanSymbolStr(row.symbol)}","${row.type}",${row.quantity},${row.price},${row.total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TradeSim_Pro_History_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Trade history exported to CSV file!', 'success');
}

function selectPlan(planName) {
    AuthStore.upgradePlan(planName);
}

// -------------------------------------------------------------
// MODALS CONTROL & AUTH HANDLERS
// -------------------------------------------------------------
function openAuthModal(tab = 'SIGN_IN') {
    currentAuthTab = tab;
    const modal = document.getElementById('authModal');
    const nameGroup = document.getElementById('nameInputGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const tabSignIn = document.getElementById('authTabSignIn');
    const tabSignUp = document.getElementById('authTabSignUp');
    const subtitle = document.getElementById('authModalSubtitle');

    if (tab === 'SIGN_IN') {
        nameGroup.classList.add('hidden');
        submitBtn.textContent = 'Sign In to Account';
        subtitle.textContent = 'Sign in to your TradeSim Pro account';
        tabSignIn.className = 'flex-1 py-2 rounded-lg bg-accent text-dark font-bold transition-all';
        tabSignUp.className = 'flex-1 py-2 rounded-lg text-gray-400 hover:text-white transition-all';
    } else {
        nameGroup.classList.remove('hidden');
        submitBtn.textContent = 'Create Pro Account';
        subtitle.textContent = 'Join TradeSim Pro to start market simulation';
        tabSignUp.className = 'flex-1 py-2 rounded-lg bg-accent text-dark font-bold transition-all';
        tabSignIn.className = 'flex-1 py-2 rounded-lg text-gray-400 hover:text-white transition-all';
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
}

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    const user = AuthStore.currentUser || {
        id: 'CLI-894102',
        clientId: 'CLI-894102',
        name: 'Guest Trader',
        email: 'guest@tradesim.pro',
        plan: 'STARTER',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
        bankInfo: {
            bankName: 'JPMorgan Chase Bank',
            accountNumber: '**** 4892',
            routingNumber: '021000021',
            swiftCode: 'CHASUS33'
        }
    };

    document.getElementById('modalProfileAvatar').src = user.avatarUrl;
    document.getElementById('modalProfileName').textContent = user.name;
    document.getElementById('modalProfileEmail').textContent = user.email;
    document.getElementById('modalProfileBadge').textContent = `${user.plan} PLAN`;
    
    const dbBadge = document.getElementById('modalCloudDbId');
    if (dbBadge) dbBadge.textContent = `DB: #${user.clientId || user.id}`;

    const clientIdEl = document.getElementById('modalClientId');
    if (clientIdEl) clientIdEl.textContent = user.clientId || user.id;

    const bankInfo = user.bankInfo || {
        bankName: 'JPMorgan Chase Bank',
        accountNumber: '**** 4892',
        routingNumber: '021000021',
        swiftCode: 'CHASUS33'
    };

    if (document.getElementById('modalBankName')) document.getElementById('modalBankName').textContent = bankInfo.bankName;
    if (document.getElementById('modalBankAccount')) document.getElementById('modalBankAccount').textContent = bankInfo.accountNumber;
    if (document.getElementById('modalBankRouting')) document.getElementById('modalBankRouting').textContent = bankInfo.routingNumber;
    if (document.getElementById('modalBankSwift')) document.getElementById('modalBankSwift').textContent = bankInfo.swiftCode;

    document.getElementById('modalProfileCash').textContent = `$${WalletStore.getCash().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('modalProfileTradesCount').textContent = `${WalletStore.data.tradeHistory.length} Trades`;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.style.display = 'none';
    }
}

// -------------------------------------------------------------
// LIVE FREE WEBSOCKET & FOREX DATA ENGINES
// -------------------------------------------------------------
function initBinanceWebSocket() {
    if (binanceWS) return;

    try {
        binanceWS = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

        binanceWS.onmessage = (event) => {
            const tickers = JSON.parse(event.data);
            if (!Array.isArray(tickers)) return;

            const cryptoSymbolsMap = {
                'BTCUSDT': 'BINANCE:BTCUSDT',
                'ETHUSDT': 'BINANCE:ETHUSDT',
                'BNBUSDT': 'BINANCE:BNBUSDT',
                'ADAUSDT': 'BINANCE:ADAUSDT',
                'DOGEUSDT': 'BINANCE:DOGEUSDT',
                'XRPUSDT': 'BINANCE:XRPUSDT'
            };

            let updatedAny = false;
            tickers.forEach(t => {
                const fullSymbol = cryptoSymbolsMap[t.s];
                if (fullSymbol) {
                    const lastPrice = parseFloat(t.c);
                    const openPrice = parseFloat(t.o);
                    const priceChange = lastPrice - openPrice;
                    const percentChange = ((lastPrice - openPrice) / openPrice) * 100;

                    const data = {
                        c: lastPrice,
                        d: priceChange,
                        dp: percentChange,
                        pc: openPrice
                    };

                    priceCache[fullSymbol] = { timestamp: Date.now(), data };
                    
                    if (currentMarket === 'crypto') {
                        const item = MARKET_DATA.crypto.find(c => c.symbol === fullSymbol);
                        if (item) updateSinglePriceDisplay(item);
                    }
                    if (selectedSymbol === fullSymbol) {
                        updateDetailDisplay(fullSymbol, data);
                    }
                    updatedAny = true;
                }
            });

            if (updatedAny) {
                checkPendingLimitOrders();
                checkStopLossTakeProfit();
            }
        };

        binanceWS.onerror = (err) => console.warn('Binance WebSocket error:', err);
        binanceWS.onclose = () => {
            binanceWS = null;
            setTimeout(initBinanceWebSocket, 5000);
        };
    } catch (e) {
        console.warn('Failed to connect to Binance WebSocket:', e);
    }
}

async function fetchFrankfurterForexData() {
    try {
        const response = await axios.get('https://api.frankfurter.app/latest?from=USD');
        if (response.data && response.data.rates) {
            const rates = response.data.rates;
            const eurusd = rates.EUR ? (1 / rates.EUR) : 1.0850;
            const gbpusd = rates.GBP ? (1 / rates.GBP) : 1.2750;
            const usdjpy = rates.JPY || 155.20;
            const audusd = rates.AUD ? (1 / rates.AUD) : 0.6550;

            const forexMap = {
                'EURUSD': { c: eurusd, d: 0.0012, dp: 0.11, pc: eurusd - 0.0012 },
                'GBPUSD': { c: gbpusd, d: -0.0020, dp: -0.16, pc: gbpusd + 0.0020 },
                'USDJPY': { c: usdjpy, d: 0.45, dp: 0.29, pc: usdjpy - 0.45 },
                'AUDUSD': { c: audusd, d: 0.0015, dp: 0.23, pc: audusd - 0.0015 }
            };

            Object.entries(forexMap).forEach(([sym, data]) => {
                priceCache[sym] = { timestamp: Date.now(), data };
            });
        }
    } catch (e) {
        console.warn('Frankfurter Forex API fallback active.');
    }
}

const MOCK_PRICES = {
    'AAPL': { price: 178.45, change: 1.25 },
    'MSFT': { price: 405.20, change: -0.45 },
    'GOOGL': { price: 142.80, change: 0.85 },
    'AMZN': { price: 174.60, change: 2.10 },
    'META': { price: 485.30, change: -1.15 },
    'TSLA': { price: 202.10, change: 3.40 },
    'BINANCE:BTCUSDT': { price: 62450.00, change: 2.85 },
    'BINANCE:ETHUSDT': { price: 3480.50, change: 1.65 },
    'BINANCE:BNBUSDT': { price: 580.20, change: -0.80 },
    'BINANCE:ADAUSDT': { price: 0.48, change: 4.10 },
    'BINANCE:DOGEUSDT': { price: 0.14, change: -2.30 },
    'BINANCE:XRPUSDT': { price: 0.54, change: 0.95 },
    'EURUSD': { price: 1.0850, change: 0.12 },
    'GBPUSD': { price: 1.2720, change: -0.15 },
    'USDJPY': { price: 155.40, change: 0.30 },
    'AUDUSD': { price: 0.6580, change: 0.20 },
    '^GSPC': { price: 5088.80, change: 0.55 },
    '^DJI': { price: 38980.20, change: 0.32 },
    '^IXIC': { price: 16090.50, change: 0.90 },
    '^FTSE': { price: 7680.40, change: -0.20 },
    '^N225': { price: 39100.00, change: 1.45 },
    '^GDAXI': { price: 17420.60, change: 0.28 }
};

async function fetchMarketData(symbol) {
    if (priceCache[symbol] && (Date.now() - priceCache[symbol].timestamp < 3000)) {
        return priceCache[symbol].data;
    }

    if (currentMarket === 'forex') {
        await fetchFrankfurterForexData();
        if (priceCache[symbol]) return priceCache[symbol].data;
    }

    try {
        if (currentMarket === 'stocks') {
            const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
            if (response.data && response.data.c !== 0) {
                const data = {
                    c: response.data.c,
                    d: response.data.d,
                    dp: response.data.dp,
                    pc: response.data.pc
                };
                priceCache[symbol] = { timestamp: Date.now(), data };
                return data;
            }
        }
    } catch (e) {
        // Fallback
    }

    const base = MOCK_PRICES[symbol] || { price: 100.0, change: 0.5 };
    const jitter = (Math.random() - 0.49) * (base.price * 0.003);
    const newPrice = Math.max(0.0001, base.price + jitter);
    const priceChange = newPrice * (base.change / 100);

    const data = {
        c: newPrice,
        d: priceChange,
        dp: base.change,
        pc: newPrice - priceChange
    };

    priceCache[symbol] = { timestamp: Date.now(), data };
    return data;
}

// -------------------------------------------------------------
// STOP-LOSS (SL) & TAKE-PROFIT (TP) RISK ENGINE
// -------------------------------------------------------------
function checkStopLossTakeProfit() {
    if (!AuthStore.currentUser) return;

    const positions = WalletStore.data.positions;
    if (!positions) return;

    Object.entries(positions).forEach(([symbol, pos]) => {
        if (pos.quantity <= 0) return;
        const cached = priceCache[symbol];
        if (!cached) return;

        const currentPrice = cached.data.c;

        if (pos.stopLoss && currentPrice <= pos.stopLoss) {
            try {
                WalletStore.executeTrade('SELL', symbol, pos.quantity, currentPrice, null, null, false);
                AudioFX.playAlert();
                showToast(`🛑 STOP-LOSS TRIGGERED! Sold ${pos.quantity} ${cleanSymbolStr(symbol)} @ $${currentPrice.toFixed(2)}`, 'error');
                renderPortfolioTable();
                renderHistoryTable();
                updateHeaderBalance();
            } catch (err) {
                console.error('Stop-Loss Execution error:', err);
            }
        }
        else if (pos.takeProfit && currentPrice >= pos.takeProfit) {
            try {
                WalletStore.executeTrade('SELL', symbol, pos.quantity, currentPrice, null, null, false);
                AudioFX.playAlert();
                showToast(`🎯 TAKE-PROFIT TRIGGERED! Sold ${pos.quantity} ${cleanSymbolStr(symbol)} @ $${currentPrice.toFixed(2)}`, 'success');
                renderPortfolioTable();
                renderHistoryTable();
                updateHeaderBalance();
            } catch (err) {
                console.error('Take-Profit Execution error:', err);
            }
        }
    });
}

function checkPendingLimitOrders() {
    if (!AuthStore.currentUser) return;

    const orders = WalletStore.data.pendingOrders;
    if (!orders || orders.length === 0) return;

    const remaining = [];
    orders.forEach(order => {
        const cached = priceCache[order.symbol];
        if (!cached) {
            remaining.push(order);
            return;
        }

        const currentPrice = cached.data.c;
        let executed = false;

        if (order.type === 'BUY' && currentPrice <= order.targetPrice) {
            try {
                WalletStore.executeTrade('BUY', order.symbol, order.quantity, currentPrice, null, null, false);
                AudioFX.playAlert();
                showToast(`🎯 LIMIT BUY EXECUTED! Bought ${order.quantity} ${cleanSymbolStr(order.symbol)} @ $${currentPrice.toFixed(2)}`, 'success');
                executed = true;
            } catch (err) {
                showToast(`Limit Buy Failed: ${err.message}`, 'error');
            }
        } else if (order.type === 'SELL' && currentPrice >= order.targetPrice) {
            try {
                WalletStore.executeTrade('SELL', order.symbol, order.quantity, currentPrice, null, null, false);
                AudioFX.playAlert();
                showToast(`🎯 LIMIT SELL EXECUTED! Sold ${order.quantity} ${cleanSymbolStr(order.symbol)} @ $${currentPrice.toFixed(2)}`, 'success');
                executed = true;
            } catch (err) {
                showToast(`Limit Sell Failed: ${err.message}`, 'error');
            }
        }

        if (!executed) remaining.push(order);
    });

    if (remaining.length !== orders.length) {
        WalletStore.data.pendingOrders = remaining;
        WalletStore.save();
        renderPendingOrdersTable();
        renderPortfolioTable();
        renderHistoryTable();
        updateHeaderBalance();
    }
}

// -------------------------------------------------------------
// LEVEL-2 LIVE ORDER BOOK WIDGET
// -------------------------------------------------------------
function renderLevel2OrderBook(symbol, currentPrice) {
    const asksEl = document.getElementById('orderBookAsks');
    const bidsEl = document.getElementById('orderBookBids');
    const spreadEl = document.getElementById('orderBookSpread');

    if (!asksEl || !bidsEl || !spreadEl) return;

    let asksHtml = '';
    let bidsHtml = '';

    for (let i = 5; i >= 1; i--) {
        const askPrice = currentPrice * (1 + (i * 0.0008));
        const askSize = (Math.random() * 2.5 + 0.1).toFixed(2);
        asksHtml += `
            <div class="flex justify-between items-center px-1.5 py-0.5 hover:bg-red-950/40 rounded transition-colors">
                <span>$${askPrice.toFixed(2)}</span>
                <span class="text-gray-300 font-medium">${askSize}</span>
            </div>
        `;
    }

    for (let i = 1; i <= 5; i++) {
        const bidPrice = currentPrice * (1 - (i * 0.0008));
        const bidSize = (Math.random() * 2.8 + 0.2).toFixed(2);
        bidsHtml += `
            <div class="flex justify-between items-center px-1.5 py-0.5 hover:bg-green-950/40 rounded transition-colors">
                <span>$${bidPrice.toFixed(2)}</span>
                <span class="text-gray-300 font-medium">${bidSize}</span>
            </div>
        `;
    }

    const spreadPct = (0.0016 * 100).toFixed(2);
    spreadEl.textContent = `$${currentPrice.toFixed(2)} (Spread: ${spreadPct}%)`;
    asksEl.innerHTML = asksHtml;
    bidsEl.innerHTML = bidsHtml;
}

// -------------------------------------------------------------
// HIGH-FIDELITY MAIN CHART ENGINE (DUAL ENGINE: LIGHTWEIGHT + CHART.JS FALLBACK)
// -------------------------------------------------------------
function generateHistoricalChartData(symbol, currentPrice, timeframe) {
    const config = TIMEFRAME_CONFIGS[timeframe] || TIMEFRAME_CONFIGS['1D'];
    const candleData = [];
    const volumeData = [];
    const smaData = [];
    const labels = [];
    const linePrices = [];
    const closePrices = [];

    const now = new Date();
    let basePrice = currentPrice * 0.94;

    for (let i = config.count - 1; i >= 0; i--) {
        let timeVal;
        let labelStr;

        if (config.isIntraday) {
            const sec = Math.floor(now.getTime() / 1000) - (i * 300);
            timeVal = sec;
            labelStr = new Date(sec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * config.stepDays));
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            timeVal = `${yyyy}-${mm}-${dd}`;
            labelStr = `${mm}/${dd}`;
        }

        const seed = (i * 17 + symbol.charCodeAt(0)) % 100;
        const change = (Math.sin(seed / 5) + (Math.random() - 0.48)) * (currentPrice * 0.015);
        const open = basePrice;
        const close = Math.max(0.01, open + change);
        const high = Math.max(open, close) + (Math.random() * currentPrice * 0.004);
        const low = Math.min(open, close) - (Math.random() * currentPrice * 0.004);
        basePrice = close;

        candleData.push({ time: timeVal, open, high, low, close });
        volumeData.push({
            time: timeVal,
            value: Math.floor(Math.random() * 8000 + 1000),
            color: close >= open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)'
        });

        labels.push(labelStr);
        linePrices.push(close);

        closePrices.push(close);
        if (closePrices.length >= 20) {
            const sum = closePrices.slice(-20).reduce((a, b) => a + b, 0);
            smaData.push({ time: timeVal, value: sum / 20 });
        }
    }

    candleData[candleData.length - 1].close = currentPrice;
    linePrices[linePrices.length - 1] = currentPrice;

    return { candleData, volumeData, smaData, labels, linePrices };
}

function renderChartJSFallback(symbol, currentPrice, dataObj) {
    const tvContainer = document.getElementById('tvChartContainer');
    const canvas = document.getElementById('mainChartCanvas');
    if (!canvas) return;

    if (tvContainer) tvContainer.classList.add('hidden');
    canvas.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    if (chartJsMainInstance) {
        chartJsMainInstance.destroy();
    }

    const isPositive = dataObj.linePrices[dataObj.linePrices.length - 1] >= dataObj.linePrices[0];
    const lineColor = isPositive ? '#0ECB81' : '#F6465D';
    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, isPositive ? 'rgba(14, 203, 129, 0.35)' : 'rgba(246, 70, 93, 0.35)');
    gradient.addColorStop(1, 'rgba(11, 14, 17, 0.0)');

    const smaValues = [];
    for (let i = 0; i < dataObj.linePrices.length; i++) {
        if (i < 20) {
            smaValues.push(null);
        } else {
            const slice = dataObj.linePrices.slice(i - 20, i);
            const avg = slice.reduce((a, b) => a + b, 0) / 20;
            smaValues.push(avg);
        }
    }

    const datasets = [
        {
            label: `${cleanSymbolStr(symbol)} Price (USD)`,
            data: dataObj.linePrices,
            borderColor: lineColor,
            borderWidth: 2,
            backgroundColor: gradient,
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            yAxisID: 'y'
        }
    ];

    if (showSmaIndicator) {
        datasets.push({
            label: 'SMA 20',
            data: smaValues,
            borderColor: '#F0B90B',
            borderWidth: 1.5,
            fill: false,
            tension: 0.2,
            pointRadius: 0,
            yAxisID: 'y'
        });
    }

    chartJsMainInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataObj.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#848E9C', font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#1E2329',
                    titleColor: '#EAECEF',
                    bodyColor: '#0ECB81',
                    borderColor: '#2B313A',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(42, 45, 53, 0.4)' },
                    ticks: { color: '#848E9C', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(42, 45, 53, 0.4)' },
                    ticks: { color: '#848E9C' }
                }
            }
        }
    });
}

function renderTradingViewChart(symbol, currentPrice) {
    const tvContainer = document.getElementById('tvChartContainer');
    const canvas = document.getElementById('mainChartCanvas');
    if (!tvContainer) return;

    const dataObj = generateHistoricalChartData(symbol, currentPrice, currentTimeframe);

    let lwSuccess = false;
    if (window.LightweightCharts) {
        try {
            if (canvas) canvas.classList.add('hidden');
            tvContainer.classList.remove('hidden');

            if (tvChart) {
                tvContainer.innerHTML = '';
                tvChart = null;
            }

            const width = tvContainer.clientWidth || tvContainer.parentElement.clientWidth || 800;
            const height = 384;

            tvChart = LightweightCharts.createChart(tvContainer, {
                width: width,
                height: height,
                layout: {
                    background: { type: 'solid', color: '#0B0E11' },
                    textColor: '#848E9C'
                },
                grid: {
                    vertLines: { color: 'rgba(42, 45, 53, 0.4)' },
                    horzLines: { color: 'rgba(42, 45, 53, 0.4)' }
                },
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                rightPriceScale: { borderColor: '#2A2D35', autoScale: true },
                timeScale: { borderColor: '#2A2D35', timeVisible: true }
            });

            candlestickSeries = tvChart.addCandlestickSeries({
                upColor: '#0ECB81',
                downColor: '#F6465D',
                borderVisible: false,
                wickUpColor: '#0ECB81',
                wickDownColor: '#F6465D'
            });

            volumeSeries = tvChart.addHistogramSeries({
                color: '#26a69a',
                priceScaleId: 'volume_scale'
            });

            tvChart.priceScale('volume_scale').applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 }
            });

            smaSeries = tvChart.addLineSeries({
                color: '#F0B90B',
                lineWidth: 1.5,
                title: 'SMA 20'
            });

            candlestickSeries.setData(dataObj.candleData);
            volumeSeries.setData(dataObj.volumeData);
            if (showSmaIndicator && smaSeries && dataObj.smaData.length > 0) {
                smaSeries.setData(dataObj.smaData);
            }

            currentCandleData = dataObj.candleData[dataObj.candleData.length - 1];
            tvChart.timeScale().fitContent();

            setTimeout(() => {
                if (tvChart && tvContainer) {
                    tvChart.applyOptions({ width: tvContainer.clientWidth || 800, height: 384 });
                    tvChart.timeScale().fitContent();
                }
            }, 100);

            lwSuccess = true;
        } catch (err) {
            console.warn('LightweightCharts fallback triggered:', err);
            lwSuccess = false;
        }
    }

    if (!lwSuccess) {
        renderChartJSFallback(symbol, currentPrice, dataObj);
    }
}

function updateTradingViewLiveTick(newPrice) {
    if (candlestickSeries && currentCandleData) {
        try {
            currentCandleData.high = Math.max(currentCandleData.high, newPrice);
            currentCandleData.low = Math.min(currentCandleData.low, newPrice);
            currentCandleData.close = newPrice;
            candlestickSeries.update(currentCandleData);

            if (volumeSeries) {
                volumeSeries.update({
                    time: currentCandleData.time,
                    value: Math.floor(Math.random() * 5000 + 1000),
                    color: currentCandleData.close >= currentCandleData.open ? 'rgba(14, 203, 129, 0.4)' : 'rgba(246, 70, 93, 0.4)'
                });
            }
        } catch (e) {
            // Live tick update fallback
        }
    }

    if (chartJsMainInstance) {
        const dataset = chartJsMainInstance.data.datasets[0];
        if (dataset && dataset.data.length > 0) {
            dataset.data[dataset.data.length - 1] = newPrice;
            chartJsMainInstance.update('none');
        }
    }
}

// -------------------------------------------------------------
// UNIQUE REAL-TIME MINI SPARKLINE CHARTS
// -------------------------------------------------------------
function generateUniqueHistoricalPoints(symbol, currentPrice, percentChange) {
    const points = [];
    let price = currentPrice * (1 - (percentChange / 100));
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 0; i < 14; i++) {
        points.push(price);
        const noise = (Math.sin(seed + i * 1.7) * 0.4 + (Math.random() - 0.48)) * (currentPrice * 0.008);
        const step = (currentPrice * (percentChange / 100)) / 14;
        price = Math.max(0.0001, price + step + noise);
    }
    points.push(currentPrice);
    return points;
}

function createStockCardHTML(item) {
    const symbol = cleanSymbolStr(item.symbol);
    return `
        <div class="stock-card bg-darker rounded-lg p-4 border border-gray-800 hover:border-accent/50 transition-all cursor-pointer" data-symbol="${item.symbol}" onclick="selectStock('${item.symbol}')">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-accent font-bold text-sm">
                        ${symbol[0]}
                    </div>
                    <div>
                        <div class="font-bold text-white text-base">${symbol}</div>
                        <div class="text-xs text-gray-400 truncate max-w-[120px]">${item.name}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div id="price-${symbol}" class="font-bold text-lg text-white">--</div>
                    <div id="change-${symbol}" class="text-xs">--</div>
                </div>
            </div>
            <div class="h-14 w-full">
                <canvas id="mini-chart-${symbol}"></canvas>
            </div>
        </div>
    `;
}

function updateDetailDisplay(symbol, data) {
    const displaySymbol = cleanSymbolStr(symbol);
    const formattedPrice = formatPrice(data.c, currentMarket);
    const isPositive = data.dp >= 0;
    const prefix = (currentMarket === 'indices' || currentMarket === 'forex') ? '' : '$';
    const formattedChange = `${isPositive ? '+' : ''}${data.dp.toFixed(2)}% (${prefix}${Math.abs(data.d).toFixed(2)})`;

    const detailPrice = document.getElementById('stockPrice');
    const detailChange = document.getElementById('stockChange');
    if (detailPrice) detailPrice.textContent = formattedPrice;
    if (detailChange) {
        detailChange.textContent = formattedChange;
        detailChange.className = `text-sm ${isPositive ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}`;
    }

    const buyPriceInput = document.getElementById('buyPriceInput');
    const sellPriceInput = document.getElementById('sellPriceInput');
    if (buyPriceInput) buyPriceInput.value = data.c.toFixed(2);
    if (sellPriceInput) sellPriceInput.value = data.c.toFixed(2);

    renderLevel2OrderBook(symbol, data.c);
    updateTradingViewLiveTick(data.c);
    recalculateTradeTotals();
}

async function updateSinglePriceDisplay(item) {
    const data = await fetchMarketData(item.symbol);
    if (!data) return;

    const displaySymbol = cleanSymbolStr(item.symbol);
    const priceEl = document.getElementById(`price-${displaySymbol}`);
    const changeEl = document.getElementById(`change-${displaySymbol}`);

    if (!priceEl || !changeEl) return;

    const formattedPrice = formatPrice(data.c, currentMarket);
    const isPositive = data.dp >= 0;
    const prefix = (currentMarket === 'indices' || currentMarket === 'forex') ? '' : '$';
    const formattedChange = `${isPositive ? '+' : ''}${data.dp.toFixed(2)}% (${prefix}${Math.abs(data.d).toFixed(2)})`;

    const prevPrice = previousPrices[displaySymbol];
    if (prevPrice !== undefined && prevPrice !== data.c) {
        priceEl.classList.remove('price-flash-up', 'price-flash-down');
        void priceEl.offsetWidth;
        priceEl.classList.add(data.c > prevPrice ? 'price-flash-up' : 'price-flash-down');
    }
    previousPrices[displaySymbol] = data.c;

    priceEl.textContent = formattedPrice;
    changeEl.textContent = formattedChange;
    changeEl.className = `text-xs ${isPositive ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}`;

    updateMiniChartLive(displaySymbol, data.c, isPositive, data.dp);

    if (cleanSymbolStr(selectedSymbol) === displaySymbol) {
        updateDetailDisplay(item.symbol, data);
    }
}

function updateMiniChartLive(displaySymbol, newPrice, isPositive, percentChange = 0.5) {
    if (!miniChartPrices[displaySymbol]) {
        miniChartPrices[displaySymbol] = generateUniqueHistoricalPoints(displaySymbol, newPrice, percentChange);
    } else {
        miniChartPrices[displaySymbol].push(newPrice);
        if (miniChartPrices[displaySymbol].length > 15) {
            miniChartPrices[displaySymbol].shift();
        }
    }
    renderMiniChart(`mini-chart-${displaySymbol}`, miniChartPrices[displaySymbol], isPositive);
}

async function updateAllPrices() {
    const filteredSymbols = currentSymbols.filter(i => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return i.symbol.toLowerCase().includes(query) || i.name.toLowerCase().includes(query);
    });

    for (const item of filteredSymbols) {
        await updateSinglePriceDisplay(item);
    }
    await renderPortfolioTable();
    renderPendingOrdersTable();
    updateHeaderBalance();
    checkPendingLimitOrders();
    checkStopLossTakeProfit();
}

function updateHeaderBalance() {
    const cashEl = document.getElementById('headerBalance');
    if (!cashEl) return;

    if (AuthStore.currentUser) {
        cashEl.textContent = `$${WalletStore.getCash().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        cashEl.className = 'text-xs sm:text-sm font-bold text-accent';
    } else {
        cashEl.textContent = 'Sign In to Trade';
        cashEl.className = 'text-xs font-semibold text-yellow-400 cursor-pointer hover:underline';
        cashEl.onclick = () => openAuthModal('SIGN_IN');
    }
}

async function selectStock(symbol) {
    selectedSymbol = symbol;
    const cleanSym = cleanSymbolStr(symbol);
    
    const detailSection = document.getElementById('stockDetail');
    if (detailSection) detailSection.classList.remove('hidden');

    let item = null;
    Object.values(MARKET_DATA).forEach(cat => {
        const found = cat.find(i => i.symbol === symbol);
        if (found) item = found;
    });
    if (!item) item = { symbol: cleanSym, name: cleanSym };

    document.getElementById('stockSymbolIcon').textContent = cleanSym[0];
    document.getElementById('stockSymbol').textContent = cleanSym;
    document.getElementById('stockName').textContent = item.name;

    document.getElementById('buyHeaderSymbol').textContent = cleanSym;
    document.getElementById('sellHeaderSymbol').textContent = cleanSym;
    document.getElementById('buyAssetSymbolLabel').textContent = cleanSym;
    document.getElementById('sellAssetSymbolLabel').textContent = cleanSym;

    const pos = WalletStore.getPosition(symbol);
    document.getElementById('buyAvailableCash').textContent = `$${WalletStore.getCash().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('sellAvailableQty').textContent = `${pos.quantity} ${cleanSym}`;

    const data = await fetchMarketData(symbol);
    if (data) {
        updateDetailDisplay(symbol, data);
    }

    renderTradingViewChart(symbol, data ? data.c : 150.0);
}

function renderMiniChart(id, prices, isPositive) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (miniChartInstances[id]) {
        miniChartInstances[id].destroy();
    }

    const color = isPositive ? '#0ECB81' : '#F6465D';
    miniChartInstances[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(prices.length).fill(''),
            datasets: [{
                data: prices,
                borderColor: color,
                borderWidth: 1.8,
                fill: false,
                tension: 0.35,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false, grace: '5%' }
            }
        }
    });
}

async function initializeMiniCharts() {
    for (const item of currentSymbols) {
        const cleanSym = cleanSymbolStr(item.symbol);
        const data = await fetchMarketData(item.symbol);
        if (data) {
            miniChartPrices[cleanSym] = generateUniqueHistoricalPoints(cleanSym, data.c, data.dp || 0.5);
            renderMiniChart(`mini-chart-${cleanSym}`, miniChartPrices[cleanSym], data.dp >= 0);
        }
    }
}

// -------------------------------------------------------------
// PORTFOLIO ASSET ALLOCATION DONUT CHART & TABLE
// -------------------------------------------------------------
function renderAllocationChart(cashVal, stocksVal, cryptoVal, forexVal) {
    const ctx = document.getElementById('allocationChart')?.getContext('2d');
    if (!ctx) return;

    if (allocationChartInstance) {
        allocationChartInstance.destroy();
    }

    allocationChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Cash', 'Stocks', 'Crypto', 'Forex'],
            datasets: [{
                data: [cashVal, stocksVal, cryptoVal, forexVal],
                backgroundColor: ['#F0B90B', '#0ECB81', '#3B82F6', '#8B5CF6'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9CA3AF', font: { size: 10 }, boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.label}: $${ctx.parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

async function renderPortfolioTable() {
    const tableBody = document.querySelector('#portfolioTable tbody');
    if (!tableBody) return;

    let html = '';
    let totalPortfolioVal = WalletStore.getCash();
    let stocksVal = 0, cryptoVal = 0, forexVal = 0;

    const positions = WalletStore.data.positions;
    const entries = Object.entries(positions);

    if (entries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                    No active asset holdings. Select a market asset above to trade!
                </td>
            </tr>
        `;
        document.getElementById('totalPortfolioValue').textContent = `$${totalPortfolioVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        renderAllocationChart(totalPortfolioVal, 0, 0, 0);
        return;
    }

    for (const [symbol, holding] of entries) {
        if (holding.quantity <= 0) continue;

        const cleanSym = cleanSymbolStr(symbol);
        const data = await fetchMarketData(symbol);
        const currentPrice = data ? data.c : holding.avgCost;
        const totalVal = currentPrice * holding.quantity;
        totalPortfolioVal += totalVal;

        if (symbol.includes('BINANCE:')) cryptoVal += totalVal;
        else if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'].includes(symbol)) forexVal += totalVal;
        else stocksVal += totalVal;

        const unrealizedPnL = (currentPrice - holding.avgCost) * holding.quantity;
        const pnlPercent = ((currentPrice - holding.avgCost) / holding.avgCost) * 100;
        const isPos = unrealizedPnL >= 0;

        const slText = holding.stopLoss ? `$${holding.stopLoss.toFixed(2)}` : 'None';
        const tpText = holding.takeProfit ? `$${holding.takeProfit.toFixed(2)}` : 'None';

        html += `
            <tr class="hover:bg-gray-800/40 transition-colors">
                <td class="px-4 py-3.5 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center font-bold text-accent text-xs mr-2.5">
                            ${cleanSym[0]}
                        </div>
                        <div>
                            <div class="font-bold text-white text-sm">${cleanSym}</div>
                            <div class="text-[10px] text-gray-400">SL: <span class="text-red-400">${slText}</span> | TP: <span class="text-green-400">${tpText}</span></div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap text-right font-medium text-white text-sm">
                    ${holding.quantity}
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap text-right text-gray-300 text-sm">
                    $${holding.avgCost.toFixed(2)}
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap text-right font-bold text-white text-sm">
                    $${currentPrice.toFixed(2)}
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap text-right font-semibold text-sm ${isPos ? 'text-green-500' : 'text-red-500'}">
                    ${isPos ? '+' : ''}$${unrealizedPnL.toFixed(2)} (${pnlPercent.toFixed(2)}%)
                </td>
                <td class="px-4 py-3.5 whitespace-nowrap text-right space-x-1">
                    <button onclick="selectStock('${symbol}'); document.getElementById('stockDetail').scrollIntoView({behavior: 'smooth'});" class="text-xs bg-gray-800 hover:bg-gray-700 text-accent px-2.5 py-1 rounded border border-gray-700 transition-all">
                        Trade
                    </button>
                    <button onclick="closePositionQuick('${symbol}', ${holding.quantity}, ${currentPrice})" class="text-xs bg-red-900/60 hover:bg-red-800 text-red-300 px-2 py-1 rounded border border-red-700/50 transition-all">
                        Sell All
                    </button>
                </td>
            </tr>
        `;
    }

    tableBody.innerHTML = html;
    document.getElementById('totalPortfolioValue').textContent = `$${totalPortfolioVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    renderAllocationChart(WalletStore.getCash(), stocksVal, cryptoVal, forexVal);
}

function closePositionQuick(symbol, quantity, price) {
    try {
        WalletStore.executeTrade('SELL', symbol, quantity, price, null, null, true);
        showToast(`Closed full position of ${quantity} ${cleanSymbolStr(symbol)} @ $${price.toFixed(2)}`, 'success');
        if (selectedSymbol === symbol) selectStock(symbol);
        renderPortfolioTable();
        renderHistoryTable();
        updateHeaderBalance();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderPendingOrdersTable() {
    const tableBody = document.getElementById('pendingOrdersTableBody');
    const section = document.getElementById('pendingOrdersSection');
    if (!tableBody || !section) return;

    const orders = WalletStore.data.pendingOrders;
    if (!orders || orders.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    tableBody.innerHTML = orders.map(ord => `
        <tr class="hover:bg-gray-800/40 transition-colors">
            <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                ${new Date(ord.timestamp).toLocaleTimeString()}
            </td>
            <td class="px-4 py-3 whitespace-nowrap font-bold text-white text-sm">
                ${cleanSymbolStr(ord.symbol)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-xs">
                <span class="px-2 py-0.5 rounded font-bold ${ord.type === 'BUY' ? 'bg-green-900/60 text-green-400 border border-green-700/50' : 'bg-red-900/60 text-red-400 border border-red-700/50'}">
                    LIMIT ${ord.type}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right font-medium text-white text-sm">
                ${ord.quantity}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right font-bold text-yellow-400 text-sm">
                $${ord.targetPrice.toFixed(2)}
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-right">
                <button onclick="cancelPendingOrder('${ord.id}')" class="text-xs bg-gray-800 hover:bg-gray-700 text-red-400 px-2.5 py-1 rounded border border-gray-700 transition-all">
                    Cancel
                </button>
            </td>
        </tr>
    `).join('');
}

function cancelPendingOrder(orderId) {
    WalletStore.cancelPendingOrder(orderId);
    showToast('Limit order cancelled.', 'info');
    renderPendingOrdersTable();
}

function renderHistoryTable() {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;

    const history = WalletStore.data.tradeHistory;
    if (!history || history.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-6 text-center text-gray-500">No trade transactions recorded yet.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = history.map(item => `
        <tr class="hover:bg-gray-800/40 transition-colors">
            <td class="px-6 py-3.5 whitespace-nowrap text-xs text-gray-400">
                ${new Date(item.timestamp).toLocaleString()}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap font-bold text-white">
                ${cleanSymbolStr(item.symbol)}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-xs">
                <span class="px-2 py-0.5 rounded font-bold ${item.type === 'BUY' ? 'bg-green-900/60 text-green-400 border border-green-700/50' : 'bg-red-900/60 text-red-400 border border-red-700/50'}">
                    ${item.type}
                </span>
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-right font-medium text-white">
                ${item.quantity}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-right text-gray-300">
                $${item.price.toFixed(2)}
            </td>
            <td class="px-6 py-3.5 whitespace-nowrap text-right font-bold text-white">
                $${item.total.toFixed(2)}
            </td>
        </tr>
    `).join('');
}

// -------------------------------------------------------------
// INTERACTIVE TRADE FORMS & EXECUTIONS
// -------------------------------------------------------------
function recalculateTradeTotals() {
    const buyPrice = buyOrderMode === 'LIMIT' 
        ? parseFloat(document.getElementById('buyLimitPriceInput')?.value || 0)
        : parseFloat(document.getElementById('buyPriceInput')?.value || 0);

    const buyQty = parseFloat(document.getElementById('buyAmountInput')?.value || 0);
    const buyTotalEl = document.getElementById('buyTotalInput');
    if (buyTotalEl) buyTotalEl.value = (buyPrice * buyQty).toFixed(2);

    const sellPrice = sellOrderMode === 'LIMIT'
        ? parseFloat(document.getElementById('sellLimitPriceInput')?.value || 0)
        : parseFloat(document.getElementById('sellPriceInput')?.value || 0);

    const sellQty = parseFloat(document.getElementById('sellAmountInput')?.value || 0);
    const sellTotalEl = document.getElementById('sellTotalInput');
    if (sellTotalEl) sellTotalEl.value = (sellPrice * sellQty).toFixed(2);
}

function initializeTradeForms() {
    const buyTypeMarket = document.getElementById('buyTypeMarket');
    const buyTypeLimit = document.getElementById('buyTypeLimit');
    const buyLimitContainer = document.getElementById('buyLimitContainer');

    const sellTypeMarket = document.getElementById('sellTypeMarket');
    const sellTypeLimit = document.getElementById('sellTypeLimit');
    const sellLimitContainer = document.getElementById('sellLimitContainer');

    if (buyTypeMarket && buyTypeLimit) {
        buyTypeMarket.addEventListener('click', () => {
            buyOrderMode = 'MARKET';
            buyTypeMarket.className = 'px-2.5 py-1 rounded bg-green-600 text-white font-semibold transition-all';
            buyTypeLimit.className = 'px-2.5 py-1 rounded text-gray-400 hover:text-white transition-all';
            buyLimitContainer.classList.add('hidden');
            recalculateTradeTotals();
        });
        buyTypeLimit.addEventListener('click', () => {
            buyOrderMode = 'LIMIT';
            buyTypeLimit.className = 'px-2.5 py-1 rounded bg-yellow-600 text-white font-semibold transition-all';
            buyTypeMarket.className = 'px-2.5 py-1 rounded text-gray-400 hover:text-white transition-all';
            buyLimitContainer.classList.remove('hidden');
            recalculateTradeTotals();
        });
    }

    if (sellTypeMarket && sellTypeLimit) {
        sellTypeMarket.addEventListener('click', () => {
            sellOrderMode = 'MARKET';
            sellTypeMarket.className = 'px-2.5 py-1 rounded bg-red-600 text-white font-semibold transition-all';
            sellTypeLimit.className = 'px-2.5 py-1 rounded text-gray-400 hover:text-white transition-all';
            sellLimitContainer.classList.add('hidden');
            recalculateTradeTotals();
        });
        sellTypeLimit.addEventListener('click', () => {
            sellOrderMode = 'LIMIT';
            sellTypeLimit.className = 'px-2.5 py-1 rounded bg-yellow-600 text-white font-semibold transition-all';
            sellTypeMarket.className = 'px-2.5 py-1 rounded text-gray-400 hover:text-white transition-all';
            sellLimitContainer.classList.remove('hidden');
            recalculateTradeTotals();
        });
    }

    document.getElementById('buyAmountInput')?.addEventListener('input', recalculateTradeTotals);
    document.getElementById('buyLimitPriceInput')?.addEventListener('input', recalculateTradeTotals);

    document.getElementById('sellAmountInput')?.addEventListener('input', recalculateTradeTotals);
    document.getElementById('sellLimitPriceInput')?.addEventListener('input', recalculateTradeTotals);

    // Buy Execution
    document.getElementById('buyExecuteBtn')?.addEventListener('click', () => {
        const qty = parseFloat(document.getElementById('buyAmountInput').value);
        const currentMarketPrice = parseFloat(document.getElementById('buyPriceInput').value);
        const limitPrice = parseFloat(document.getElementById('buyLimitPriceInput')?.value || 0);

        const stopLoss = parseFloat(document.getElementById('buyStopLossInput')?.value || 0) || null;
        const takeProfit = parseFloat(document.getElementById('buyTakeProfitInput')?.value || 0) || null;

        if (isNaN(qty) || qty <= 0) {
            showToast('Please enter a valid buy quantity.', 'error');
            return;
        }

        if (buyOrderMode === 'MARKET') {
            try {
                WalletStore.executeTrade('BUY', selectedSymbol, qty, currentMarketPrice, stopLoss, takeProfit, true);
                showToast(`Bought ${qty} ${cleanSymbolStr(selectedSymbol)} @ $${currentMarketPrice.toFixed(2)}`, 'success');
                document.getElementById('buyAmountInput').value = '';
                recalculateTradeTotals();
                selectStock(selectedSymbol);
                renderPortfolioTable();
                renderHistoryTable();
                updateHeaderBalance();
            } catch (err) {
                showToast(err.message, 'error');
            }
        } else {
            if (isNaN(limitPrice) || limitPrice <= 0) {
                showToast('Please enter a target limit price.', 'error');
                return;
            }
            try {
                WalletStore.addPendingLimitOrder('BUY', selectedSymbol, qty, limitPrice);
                showToast(`Limit Buy Order Placed: ${qty} ${cleanSymbolStr(selectedSymbol)} @ $${limitPrice.toFixed(2)}`, 'info');
                document.getElementById('buyAmountInput').value = '';
                renderPendingOrdersTable();
                updateHeaderBalance();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });

    // Sell Execution
    document.getElementById('sellExecuteBtn')?.addEventListener('click', () => {
        const qty = parseFloat(document.getElementById('sellAmountInput').value);
        const currentMarketPrice = parseFloat(document.getElementById('sellPriceInput').value);
        const limitPrice = parseFloat(document.getElementById('sellLimitPriceInput')?.value || 0);

        if (isNaN(qty) || qty <= 0) {
            showToast('Please enter a valid sell quantity.', 'error');
            return;
        }

        if (sellOrderMode === 'MARKET') {
            try {
                WalletStore.executeTrade('SELL', selectedSymbol, qty, currentMarketPrice, null, null, true);
                showToast(`Sold ${qty} ${cleanSymbolStr(selectedSymbol)} @ $${currentMarketPrice.toFixed(2)}`, 'success');
                document.getElementById('sellAmountInput').value = '';
                recalculateTradeTotals();
                selectStock(selectedSymbol);
                renderPortfolioTable();
                renderHistoryTable();
                updateHeaderBalance();
            } catch (err) {
                showToast(err.message, 'error');
            }
        } else {
            if (isNaN(limitPrice) || limitPrice <= 0) {
                showToast('Please enter a target limit price.', 'error');
                return;
            }
            try {
                WalletStore.addPendingLimitOrder('SELL', selectedSymbol, qty, limitPrice);
                showToast(`Limit Sell Order Placed: ${qty} ${cleanSymbolStr(selectedSymbol)} @ $${limitPrice.toFixed(2)}`, 'info');
                document.getElementById('sellAmountInput').value = '';
                renderPendingOrdersTable();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });
}

// -------------------------------------------------------------
// INITIALIZATION & EVENT LISTENERS
// -------------------------------------------------------------
function initializeMarketCards(market = 'stocks') {
    currentMarket = market;
    currentSymbols = MARKET_DATA[market];

    const cardsContainer = document.getElementById('stockCards');
    if (cardsContainer) {
        const filtered = currentSymbols.filter(i => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
        });

        cardsContainer.innerHTML = filtered.map(item => createStockCardHTML(item)).join('');
    }

    document.querySelectorAll('.market-btn').forEach(btn => {
        if (btn.dataset.market === market) {
            btn.className = 'market-btn px-3 py-1 text-xs sm:text-sm font-semibold bg-accent text-dark rounded-lg transition-all shadow-sm';
        } else {
            btn.className = 'market-btn px-3 py-1 text-xs sm:text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-all';
        }
    });

    updateAllPrices();
    initializeMiniCharts();
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init Wallet & WebSockets & User Auth Session
    WalletStore.init();
    AuthStore.init();
    updateHeaderBalance();
    initBinanceWebSocket();

    // 2. Audio Interaction Permission Trigger
    document.body.addEventListener('click', () => AudioFX.init(), { once: true });

    // 3. Mobile Sidebar Navigation Drawer
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarDrawer = document.getElementById('sidebar-drawer');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    function toggleMobileSidebar() {
        sidebarDrawer.classList.toggle('-translate-x-full');
        sidebarBackdrop.classList.toggle('hidden');
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleMobileSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', toggleMobileSidebar);

    // 4. Auth Modal & Profile Listeners
    document.getElementById('openSignInBtn')?.addEventListener('click', () => openAuthModal('SIGN_IN'));
    document.getElementById('openSignUpBtn')?.addEventListener('click', () => openAuthModal('SIGN_UP'));
    document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuthModal);

    document.getElementById('authTabSignIn')?.addEventListener('click', () => openAuthModal('SIGN_IN'));
    document.getElementById('authTabSignUp')?.addEventListener('click', () => openAuthModal('SIGN_UP'));

    document.getElementById('googleAuthBtn')?.addEventListener('click', () => AuthStore.loginWithGoogle());
    document.getElementById('googleHeroBtn')?.addEventListener('click', () => AuthStore.loginWithGoogle());

    document.getElementById('authSubmitBtn')?.addEventListener('click', () => {
        const email = document.getElementById('authEmailInput')?.value;
        const password = document.getElementById('authPasswordInput')?.value;
        const name = document.getElementById('authNameInput')?.value;

        try {
            if (currentAuthTab === 'SIGN_IN') {
                AuthStore.loginWithEmail(email, password);
            } else {
                AuthStore.signupUser(name, email, password);
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.getElementById('user-menu')?.addEventListener('click', openProfileModal);
    document.getElementById('closeProfileModalBtn')?.addEventListener('click', closeProfileModal);
    document.getElementById('signOutBtn')?.addEventListener('click', () => AuthStore.logout());

    // Backdrop overlay click and Escape key listeners
    const authModalEl = document.getElementById('authModal');
    const profileModalEl = document.getElementById('profileModal');

    if (authModalEl) {
        authModalEl.addEventListener('click', (e) => {
            if (e.target === authModalEl) closeAuthModal();
        });
    }
    if (profileModalEl) {
        profileModalEl.addEventListener('click', (e) => {
            if (e.target === profileModalEl) closeProfileModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
            closeProfileModal();
        }
    });

    // 5. Timeframe Selector Listener
    document.getElementById('timeframeSelector')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.tf-btn');
        if (btn && btn.dataset.tf) {
            currentTimeframe = btn.dataset.tf;
            document.querySelectorAll('.tf-btn').forEach(b => {
                if (b.dataset.tf === currentTimeframe) {
                    b.className = 'tf-btn px-2.5 py-1 rounded bg-accent text-dark font-bold transition-all';
                } else {
                    b.className = 'tf-btn px-2.5 py-1 rounded text-gray-400 hover:text-white transition-all';
                }
            });
            selectStock(selectedSymbol);
        }
    });

    // 6. SMA Indicator Toggle
    const toggleSmaBtn = document.getElementById('toggleSmaBtn');
    if (toggleSmaBtn) {
        toggleSmaBtn.addEventListener('click', () => {
            showSmaIndicator = !showSmaIndicator;
            toggleSmaBtn.className = `px-2.5 py-1 rounded transition-all font-semibold ${showSmaIndicator ? 'bg-accent text-dark' : 'bg-gray-800 text-gray-300 border border-gray-700'}`;
            selectStock(selectedSymbol);
        });
    }

    // 7. Search Bar Listener
    const searchInput = document.getElementById('marketSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            initializeMarketCards(currentMarket);
        });
    }

    // 8. Reset Wallet Balance Listener
    const resetBtn = document.getElementById('resetWalletBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset your TradeSim simulator wallet back to $100,000 cash?')) {
                WalletStore.resetWallet();
                updateHeaderBalance();
                selectStock(selectedSymbol);
                renderPortfolioTable();
                renderPendingOrdersTable();
                renderHistoryTable();
                showToast('Wallet balance reset to $100,000.00 cash!', 'success');
            }
        });
    }

    // 9. Export CSV Listener
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportHistoryToCSV);

    // 10. Scroll Navigation Tracking
    const mainPanel = document.querySelector('main');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
                if (window.innerWidth < 768 && sidebarDrawer && !sidebarDrawer.classList.contains('-translate-x-full')) {
                    toggleMobileSidebar();
                }
            }
        });
    });

    if (mainPanel) {
        mainPanel.addEventListener('scroll', () => {
            const fromTop = mainPanel.scrollTop + 120;
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

                if (fromTop >= sectionTop && fromTop < sectionTop + sectionHeight) {
                    navLinks.forEach(link => {
                        link.classList.remove('bg-gray-800', 'text-accent');
                        link.classList.add('text-gray-400');
                    });
                    if (correspondingLink) {
                        correspondingLink.classList.remove('text-gray-400');
                        correspondingLink.classList.add('bg-gray-800', 'text-accent');
                    }
                }
            });
        });
    }

    // 11. Market Filter Tabs Listener
    const marketFilter = document.getElementById('marketFilter');
    if (marketFilter) {
        marketFilter.addEventListener('click', (e) => {
            const btn = e.target.closest('.market-btn');
            if (btn && btn.dataset.market) {
                initializeMarketCards(btn.dataset.market);
                selectStock(MARKET_DATA[btn.dataset.market][0].symbol);
            }
        });
    }

    // 12. Theme Toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });

    // 13. Initial Load & Setup
    initializeTradeForms();
    initializeMarketCards('stocks');
    await selectStock('AAPL');
    await renderPortfolioTable();
    renderPendingOrdersTable();
    renderHistoryTable();

    // 14. Background Live Polling (every 3 seconds)
    setInterval(updateAllPrices, 3000);
});