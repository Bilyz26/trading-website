/**
 * TradeSim Pro - Firebase Cloud Database Configuration & Service Module
 * Handles Firebase Web SDK initialization, client profile CRUD, and trade log synchronization.
 */

const FIREBASE_PROJECT_CONFIG = {
    apiKey: "AIzaSyB-TradeSimProFirebaseKey2026",
    authDomain: "tradesim-pro.firebaseapp.com",
    databaseURL: "https://tradesim-pro-default-rtdb.firebaseio.com",
    projectId: "tradesim-pro",
    storageBucket: "tradesim-pro.appspot.com",
    messagingSenderId: "982347102938",
    appId: "1:982347102938:web:839217039120"
};

const FirebaseService = {
    app: null,
    db: null,
    isInitialized: false,

    init() {
        if (this.isInitialized) return;

        if (window.firebase) {
            try {
                this.app = firebase.initializeApp(FIREBASE_PROJECT_CONFIG);
                this.db = firebase.database();
                this.isInitialized = true;
                console.log('🔥 Firebase Realtime Database Service Initialized Successfully.');
            } catch (e) {
                console.warn('Firebase initialization notice:', e.message);
            }
        }
    },

    generateClientId() {
        const num = Math.floor(100000 + Math.random() * 900000);
        return `CLI-${num}`;
    },

    generateBankDetails() {
        const banks = ['JPMorgan Chase Bank', 'Bank of America', 'Wells Fargo Bank', 'Citigroup', 'Goldman Sachs'];
        const randomBank = banks[Math.floor(Math.random() * banks.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        return {
            bankName: randomBank,
            accountNumber: `**** ${last4}`,
            routingNumber: '021000021',
            swiftCode: 'CHASUS33'
        };
    },

    async saveClientProfile(profile) {
        this.init();
        if (!profile || !profile.email) return profile;

        const emailKey = profile.email.replace(/[\.\#\$\[\]]/g, '_');
        const clientId = profile.clientId || profile.id || this.generateClientId();
        const bankInfo = profile.bankInfo || this.generateBankDetails();

        const clientRecord = {
            clientId: clientId,
            id: clientId,
            name: profile.name,
            email: profile.email,
            provider: profile.provider || 'Email',
            avatarUrl: profile.avatarUrl,
            plan: profile.plan || 'STARTER',
            memberSince: profile.memberSince || 'July 2026',
            bankInfo: bankInfo,
            lastLoginAt: new Date().toISOString()
        };

        if (this.db) {
            try {
                await this.db.ref(`clients/${clientId}`).update(clientRecord);
                await this.db.ref(`emails/${emailKey}`).set(clientId);
            } catch (e) {
                console.warn('Firebase DB update notice:', e.message);
            }
        }

        // REST API Broadcast Fallback
        if (window.axios) {
            await axios.put(`https://tradesim-pro-default-rtdb.firebaseio.com/clients/${clientId}.json`, clientRecord).catch(() => {});
            await axios.put(`https://tradesim-pro-default-rtdb.firebaseio.com/emails/${emailKey}.json`, JSON.stringify(clientId)).catch(() => {});
        }

        return clientRecord;
    },

    async fetchClientByEmail(email) {
        this.init();
        if (!email) return null;
        const emailKey = email.replace(/[\.\#\$\[\]]/g, '_');

        if (window.axios) {
            try {
                const res = await axios.get(`https://tradesim-pro-default-rtdb.firebaseio.com/emails/${emailKey}.json`);
                if (res.data) {
                    const clientId = typeof res.data === 'string' ? res.data.replace(/"/g, '') : res.data;
                    const profileRes = await axios.get(`https://tradesim-pro-default-rtdb.firebaseio.com/clients/${clientId}.json`);
                    if (profileRes.data) return profileRes.data;
                }
            } catch (e) {
                console.warn('Fetch client error:', e);
            }
        }
        return null;
    },

    async syncClientWallet(clientId, walletData) {
        this.init();
        if (!clientId) return;

        if (this.db) {
            try {
                await this.db.ref(`wallets/${clientId}`).set(walletData);
            } catch (e) {}
        }

        if (window.axios) {
            await axios.put(`https://tradesim-pro-default-rtdb.firebaseio.com/wallets/${clientId}.json`, walletData).catch(() => {});
        }
    },

    async recordClientTrade(clientId, tradeRecord) {
        this.init();
        if (!clientId) return;

        if (this.db) {
            try {
                await this.db.ref(`transactions/${clientId}`).push(tradeRecord);
            } catch (e) {}
        }

        if (window.axios) {
            await axios.post(`https://tradesim-pro-default-rtdb.firebaseio.com/transactions/${clientId}.json`, tradeRecord).catch(() => {});
        }
    }
};

// Initialize Firebase Service on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => FirebaseService.init());
}
