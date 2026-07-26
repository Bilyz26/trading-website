# 📈 TradeSim Pro - Institutional-Grade Trading Simulator Terminal

**TradeSim Pro** is a modern, high-performance, real-time web trading terminal designed for Stocks, Cryptocurrencies, Forex pairs, and Global Market Indices. Featuring **zero-latency Binance WebSockets**, **Frankfurter ECB Forex API**, **Dual-Engine Candlestick Charting**, **Stop-Loss / Take-Profit Risk Engine**, **Level-2 Live Order Book**, and **CSV Trade History Export**.

---

## ⚡ Key Features

### 📡 1. Real-Time Public Live APIs (Zero API Keys Required)
- **Binance Live WebSocket Stream (`wss://stream.binance.com:9443`)**: Zero-latency real-time ticker stream for `BTCUSDT`, `ETHUSDT`, `BNBUSDT`, `ADAUSDT`, `DOGEUSDT`, and `XRPUSDT`.
- **Frankfurter ECB Forex API (`https://api.frankfurter.app/latest`)**: Real-time European Central Bank foreign exchange rates for `EUR/USD`, `GBP/USD`, `USD/JPY`, and `AUD/USD`.
- **Live Search & Market Filters**: Instant search bar filtering across **Stocks**, **Crypto**, **Forex**, and **Indices**.

### 📊 2. Institutional Dual-Engine Charting
- **Primary Engine**: **TradingView Lightweight Charts** (`lightweight-charts.standalone.production.js`) with OHLC Candlesticks, Volume histogram bars, and SMA 20 Moving Average line.
- **Fallback Engine**: **Chart.js Financial Area Chart** guaranteeing 100% zero-blank chart rendering across all network environments.
- **Interactive Timeframe Selectors**: Switch seamlessly between **1D**, **1W**, **1M**, **3M**, **6M**, **1Y**, and **MAX** historical range views.
- **Unique Mini Sparkline Cards**: Every market asset displays its own unique historical trend line and live price flash micro-animations.

### 🎯 3. Advanced Order Engine & Risk Management
- **Market Orders**: Instant execution at live market price.
- **Limit Target Orders**: Set target entry/exit prices; background processor automatically executes orders when market hits target thresholds.
- **Attached Stop-Loss (SL) & Take-Profit (TP)**: Set automatic SL and TP targets on position entry. Real-time background risk engine automatically liquidates positions when thresholds are crossed.
- **Pending Orders Panel**: View and cancel active limit orders with one click.

### 💼 4. Portfolio Analytics & Asset Allocation
- **Cost-Basis Position Tracking**: Calculates true unrealized P&L: `(Current Price - Avg Cost) * Quantity`.
- **Asset Allocation Donut Chart**: Chart.js doughnut chart breaking down total portfolio equity across Cash, Stocks, Crypto, and Forex.
- **CSV Trade Log Export**: One-click download of full trading history into `.csv` format (`TradeSim_Pro_History.csv`).
- **One-Click Liquidation**: "Sell All" button directly in the portfolio row.
- **Reset Simulator Wallet**: Header button to reset account cash back to initial $100,000.00.

### 🔔 5. Audio Micro-Interactions & Level-2 Order Book
- **Web Audio FX**: Browser-synthesized audio chimes for Buy orders, Sell orders, and SL/TP trigger alerts.
- **Level-2 Live Order Book**: Real-time Bid (Green) and Ask (Red) depth visualization with live spread calculations.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Core**: HTML5, Vanilla JavaScript (ES6+), CSS3.
- **Styling**: Tailwind CSS (Dark Theme, Glassmorphism, Responsive Grid).
- **Libraries**: 
  - [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts)
  - [Chart.js](https://www.chartjs.org/) & `chartjs-adapter-date-fns`
  - [Axios HTTP Client](https://axios-http.com/)
- **Data Persistence**: `localStorage` (Client-side Wallet Engine).

---

## 🚀 Quick Start & Running Locally

Because TradeSim Pro runs 100% client-side with free public APIs, no server installation or API keys are required.

### Option 1: Direct File Launch
Simply double-click [`index.html`](file:///c:/Users/bilal/OneDrive/Bureau/Karrier%20projecte/trading-website/index.html) to open in your browser!

### Option 2: Local HTTP Server
```bash
# Clone the repository
git clone https://github.com/Bilyz26/trading-website.git

# Navigate to project directory
cd trading-website

# Run with Python
python -m http.server 8000

# OR run with Node / npx
npx serve .
```
Then open `http://localhost:8000` in your web browser.

---

## 📱 Responsive Layout Support

- **Mobile (< 768px)**: Collapsible sidebar navigation drawer with backdrop overlay, single-column market cards, touch-optimized trade controls.
- **Tablet & Desktop (>= 768px)**: Persistent sidebar navigation, multi-column market overview grid, side-by-side Order Book & Trading forms.

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
