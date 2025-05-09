const FINNHUB_API_KEY = 'd0cfedhr01ql2j3cqmqgd0cfedhr01ql2j3cqmr0';

// Market data configuration
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
    indices: [
        { symbol: '^GSPC', name: 'S&P 500' },
        { symbol: '^DJI', name: 'Dow Jones' },
        { symbol: '^IXIC', name: 'NASDAQ' },
        { symbol: '^FTSE', name: 'FTSE 100' },
        { symbol: '^N225', name: 'Nikkei 225' },
        { symbol: '^GDAXI', name: 'DAX' }
    ]
};

// Current market type and symbols
let currentMarket = 'stocks';
let currentSymbols = MARKET_DATA.stocks;

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', function() {
    document.documentElement.classList.toggle('dark');
});

// Sidebar Navigation
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    // Smooth scroll to section when clicking nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Update active link based on scroll position
    function updateActiveLink() {
        const fromTop = window.scrollY + 100; // Offset for header

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

            if (fromTop >= sectionTop && fromTop < sectionTop + sectionHeight) {
                // Remove active class from all links
                navLinks.forEach(link => {
                    link.classList.remove('bg-gray-800', 'text-accent');
                    link.classList.add('text-gray-400');
                });
                // Add active class to current link
                if (correspondingLink) {
                    correspondingLink.classList.remove('text-gray-400');
                    correspondingLink.classList.add('bg-gray-800', 'text-accent');
                }
            }
        });
    }

    // Listen for scroll events
    const mainPanel = document.querySelector('main');
    mainPanel.addEventListener('scroll', updateActiveLink);
    updateActiveLink(); // Initial check
});

// Tab Functionality
const tabs = document.querySelectorAll('.tab-button');
tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('tab-active'));
        this.classList.add('tab-active');
    });
});

// Mini Charts
function createMiniChart(id, color, prices) {
    const ctx = document.getElementById(id).getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    const isPositive = prices[prices.length - 1] > prices[0];
    gradient.addColorStop(0, isPositive ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(prices.length).fill(''),
            datasets: [{
                data: prices,
                borderColor: color,
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: false
                }
            }
        }
    });
}

// Initialize mini charts with real data
async function initializeMiniCharts() {
    for (let i = 0; i < STOCKS.length; i++) {
        const data = await fetchCandleData(STOCKS[i], '5', 20);
        if (data && data.s === 'ok') {
            const isPositive = data.c[data.c.length - 1] > data.o[0];
            const color = isPositive ? '#0ECB81' : '#F6465D';
            createMiniChart(`miniChart${i + 1}`, color, data.c);
        }
    }
}

initializeMiniCharts();

// Main Chart
const mainCtx = document.getElementById('mainChart').getContext('2d');
const mainGradient = mainCtx.createLinearGradient(0, 0, 0, 400);
mainGradient.addColorStop(0, 'rgba(14, 203, 129, 0.2)');
mainGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

const mainChart = new Chart(mainCtx, {
    type: 'line',
    data: {
        labels: Array(30).fill().map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (30 - i));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
            data: Array(30).fill().map(() => Math.random() * 30 + 150),
            borderColor: '#0ECB81',
            borderWidth: 2,
            backgroundColor: mainGradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: '#1E2329',
                titleColor: '#EAECEF',
                bodyColor: '#EAECEF',
                borderColor: '#474D57',
                borderWidth: 1,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        return '$' + context.parsed.y.toFixed(2);
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    color: '#848E9C'
                }
            },
            y: {
                grid: {
                    color: '#2A3139',
                    drawBorder: false
                },
                ticks: {
                    color: '#848E9C'
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    }
});

// Portfolio data structure
const portfolio = {
    AAPL: { quantity: 10 },
    MSFT: { quantity: 15 },
    GOOGL: { quantity: 5 },
    AMZN: { quantity: 8 }
};

// Function to update portfolio table
async function updatePortfolioTable() {
    const tableBody = document.querySelector('#portfolioTable tbody');
    if (!tableBody) return;

    let portfolioHTML = '';
    for (const [symbol, holding] of Object.entries(portfolio)) {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            const totalValue = stockData.c * holding.quantity;
            const change = (stockData.c - stockData.pc) * holding.quantity;
            const changePercent = ((stockData.c - stockData.pc) / stockData.pc) * 100;
            
            portfolioHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                                <span>${symbol[0]}</span>
                            </div>
                            <div class="ml-4">
                                <div class="font-medium">${symbol}</div>
                                <div class="text-sm text-gray-400">Stock</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        ${holding.quantity}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        $${stockData.pc.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        $${stockData.c.toFixed(2)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right ${change >= 0 ? 'positive' : 'negative'}">
                        ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent.toFixed(2)}%)
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                        <button class="text-red-500 hover:text-red-400 text-sm font-medium">Sell</button>
                    </td>
                </tr>
            `;
        }
    }
    tableBody.innerHTML = portfolioHTML;
}

// Create stock card HTML
function createStockCard(stock) {
    return `
        <div class="bg-darker rounded-lg overflow-hidden hover:ring-1 hover:ring-yellow-400 cursor-pointer transition-all" onclick="selectStock('${stock.symbol}')">
            <div class="p-4 border-b border-gray-800">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                        <span class="text-lg">${stock.symbol[0]}</span>
                    </div>
                    <div>
                        <div class="font-bold text-lg text-white">${stock.symbol}</div>
                        <div class="text-sm text-gray-400">${stock.name}</div>
                    </div>
                    <div class="ml-auto text-right">
                        <div class="font-bold text-xl text-white" id="price-${stock.symbol}">Loading...</div>
                        <div class="text-sm" id="change-${stock.symbol}">--</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize market cards
function initializeMarketCards(market = 'stocks') {
    const cardsContainer = document.getElementById('stockCards');
    currentMarket = market;
    currentSymbols = MARKET_DATA[market];
    
    // Update cards
    cardsContainer.innerHTML = currentSymbols.map(item => createStockCard(item)).join('');
    updateAllPrices();

    // Update button states
    document.querySelectorAll('.market-btn').forEach(btn => {
        if (btn.dataset.market === market) {
            btn.className = 'market-btn px-3 py-1 text-sm bg-accent text-dark rounded-lg hover:opacity-90 transition-all';
        } else {
            btn.className = 'market-btn px-3 py-1 text-sm bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 transition-all';
        }
    });
}

// Update price and change for any market type
async function updatePrice(symbol) {
    try {
        const data = await fetchMarketData(symbol);
        if (!data) return;

        const displaySymbol = symbol.replace('BINANCE:', '').replace('^', '');
        const priceElement = document.getElementById(`price-${displaySymbol}`);
        const changeElement = document.getElementById(`change-${displaySymbol}`);

        if (!priceElement || !changeElement) {
            console.error(`Elements not found for symbol ${displaySymbol}`);
            return;
        }

        const lastPrice = data.c;
        const priceChange = data.d;
        const percentChange = data.dp;

        // Format price based on market type and value
        if (currentMarket === 'crypto') {
            const priceStr = lastPrice >= 1000 ? 
                lastPrice.toFixed(2) : 
                lastPrice >= 1 ? 
                    lastPrice.toFixed(4) : 
                    lastPrice.toFixed(8);
            priceElement.textContent = `$${priceStr}`;
        } else if (currentMarket === 'indices') {
            // No $ symbol for indices
            priceElement.textContent = lastPrice.toFixed(2);
        } else {
            priceElement.textContent = `$${lastPrice.toFixed(2)}`;
        }

        // Update change display
        const prefix = currentMarket === 'indices' ? '' : '$';
        const changeText = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}% (${prefix}${Math.abs(priceChange).toFixed(2)})`;
        changeElement.textContent = changeText;
        changeElement.className = `text-sm ${percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`;

        // Generate random data for mini chart (since we're using hardcoded prices)
        const chartData = [];
        for (let i = 0; i < 20; i++) {
            const randomChange = (Math.random() - 0.5) * 2; // Random value between -1 and 1
            chartData.push(lastPrice * (1 + randomChange / 100));
        }

        // Update mini chart
        const miniChart = document.getElementById(`mini-chart-${displaySymbol}`);
        if (miniChart) {
            createMiniChart(`mini-chart-${displaySymbol}`, percentChange >= 0 ? '#0ECB81' : '#F6465D', chartData);
        }
    } catch (error) {
        console.error(`Error updating price for ${symbol}:`, error);
    }
}

// Update all prices for current market type
async function updateAllPrices() {
    for (const item of currentSymbols) {
        await updatePrice(item.symbol);
    }
}

// Select stock and update detail view
async function selectStock(symbol) {
    try {
        // Update stock details section
        const stockDetail = document.getElementById('stockDetail');
        const displaySymbol = symbol.replace('BINANCE:', '').replace('^', '');
        
        // Update active card
        // Find the stock/crypto/index details
        const item = MARKET_DATA[currentMarket].find(item => item.symbol === symbol);
        if (!item) return;

        // Clean symbol for display
        const cleanSymbol = symbol.replace('BINANCE:', '').replace('^', '');

        // Update stock detail section
        const detailSection = document.getElementById('stockDetail');
        detailSection.classList.remove('hidden');

        // Update header info
        document.getElementById('stockSymbolIcon').textContent = cleanSymbol[0];
        document.getElementById('stockSymbol').textContent = cleanSymbol;
        document.getElementById('stockName').textContent = item.name;

        // Format price based on market type
        const price = data.c;
        const priceElement = document.getElementById('stockPrice');

        if (currentMarket === 'crypto') {
            const priceStr = price >= 1000 ? 
                price.toFixed(2) : 
                price >= 1 ? 
                    price.toFixed(4) : 
                    price.toFixed(8);
            priceElement.textContent = `$${priceStr}`;
        } else if (currentMarket === 'indices') {
            priceElement.textContent = price.toFixed(2);
        } else {
            priceElement.textContent = `$${price.toFixed(2)}`;
        }

        // Update change display
        const change = data.d;
        const changePercent = data.dp;
        const changeElement = document.getElementById('stockChange');
        const prefix = currentMarket === 'indices' ? '' : '$';
        changeElement.textContent = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% (${prefix}${Math.abs(change).toFixed(2)})`;
        changeElement.className = `text-sm ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`;

        // Generate chart data
        const chartData = [];
        const times = [];
        const now = new Date();
        for (let i = 0; i < 20; i++) {
            const time = new Date(now - (19 - i) * 15 * 60000); // 15-minute intervals
            times.push(time);
            const randomChange = (Math.random() - 0.5) * 2; // Random value between -1 and 1
            chartData.push(price * (1 + randomChange / 100));
        }

        // Update main chart
        const ctx = document.getElementById('mainChart').getContext('2d');
        if (window.mainChart) {
            window.mainChart.destroy();
        }
        window.mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: cleanSymbol,
                    data: chartData,
                    borderColor: changePercent >= 0 ? '#0ECB81' : '#F6465D',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'minute' },
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });

        // Scroll to detail section
        detailSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error selecting stock:', error);
    }
}
// Update chart with new data
async function updateChart(symbol) {
    try {
        const endpoint = currentMarket === 'crypto' ? 'crypto/candle' : 'stock/candle';
        const resolution = currentMarket === 'crypto' ? '1' : 'D';
        const to = Math.floor(Date.now() / 1000);
        const from = to - (7 * 24 * 60 * 60); // 7 days of data

        const response = await axios.get(
            `https://finnhub.io/api/v1/${endpoint}?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
        );

        const candles = response.data;
        if (candles && candles.c) {
            const chartData = {
                labels: candles.t.map(timestamp => {
                    const date = new Date(timestamp * 1000);
                    return currentMarket === 'crypto' 
                        ? date.toLocaleTimeString() 
                        : date.toLocaleDateString();
                }),
                datasets: [{
                    label: symbol.replace('BINANCE:', '').replace('^', ''),
                    data: candles.c,
                    borderColor: '#F0B90B',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }]
            };

            if (window.priceChart) {
                window.priceChart.data = chartData;
                window.priceChart.update();
            } else {
                const ctx = document.getElementById('priceChart').getContext('2d');
                window.priceChart = new Chart(ctx, {
                    type: 'line',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: MARKET_DATA[currentMarket].find(m => m.symbol === symbol)?.name || symbol,
                                color: '#F0B90B',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: {
                                    display: false,
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#848E9C'
                                }
                            },
                            y: {
                                grid: {
                                    color: '#2A3139',
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#848E9C'
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

// Real-time updates every 10 seconds
setInterval(updateAllPrices, 1000);

// Fetch real-time market data with hardcoded values for crypto and indices
async function fetchMarketData(symbol) {
    try {
        if (currentMarket === 'crypto') {
            // Hardcoded crypto prices
            const cryptoPrices = {
                'BINANCE:BTCUSDT': { price: 45678.90, change: 2.5 },
                'BINANCE:ETHUSDT': { price: 3456.78, change: 1.8 },
                'BINANCE:BNBUSDT': { price: 456.78, change: -0.5 },
                'BINANCE:ADAUSDT': { price: 1.23, change: 3.2 },
                'BINANCE:DOGEUSDT': { price: 0.15, change: -1.5 },
                'BINANCE:XRPUSDT': { price: 0.89, change: 1.2 }
            };

            const price = cryptoPrices[symbol]?.price || 0;
            const change = cryptoPrices[symbol]?.change || 0;
            return {
                c: price,
                d: price * (change / 100),
                dp: change
            };
        } else if (currentMarket === 'indices') {
            // Hardcoded indices prices
            const indicesPrices = {
                '^GSPC': { price: 4780.90, change: 0.8 },  // S&P 500
                '^DJI': { price: 38450.50, change: 0.6 },  // Dow Jones
                '^IXIC': { price: 15230.80, change: 1.2 }, // NASDAQ
                '^FTSE': { price: 7890.30, change: -0.3 }, // FTSE 100
                '^N225': { price: 32560.70, change: 0.9 }, // Nikkei 225
                '^GDAXI': { price: 16780.40, change: 0.4 }  // DAX
            };

            const price = indicesPrices[symbol]?.price || 0;
            const change = indicesPrices[symbol]?.change || 0;
            return {
                c: price,
                d: price * (change / 100),
                dp: change
            };
        } else {
            // Real Finnhub data for stocks
            const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
            return response.data;
        }
    } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        return null;
    }
}

// Fetch candle data for charts
async function fetchCandleData(symbol, resolution = 'D', count = 30) {
    try {
        const end = Math.floor(Date.now() / 1000);
        const start = end - (count * 24 * 60 * 60); // 30 days back
        const response = await axios.get(
            `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${start}&to=${end}&token=${FINNHUB_API_KEY}`
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching candle data for ${symbol}:`, error);
        return null;
    }
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Set up market filter
        document.getElementById('marketFilter').addEventListener('click', (e) => {
            const button = e.target.closest('.market-btn');
            if (button) {
                const market = button.dataset.market;
                initializeMarketCards(market);
            }
        });

        // Initialize with stocks by default
        initializeMarketCards('stocks');
        
        // Initialize main chart with AAPL data
        await selectStock('AAPL');
        
        // Start real-time updates
        setInterval(updateAllPrices, 10000);
    } catch (error) {
        console.error('Error initializing data:', error);
    }
});

// Create stock card HTML
function createStockCard(item) {
    const symbol = item.symbol.replace('BINANCE:', '').replace('^', '');
    return `
        <div class="stock-card bg-darker rounded-lg p-4 hover:bg-gray-800 transition-colors cursor-pointer" data-symbol="${item.symbol}" onclick="selectStock('${item.symbol}')">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
                        ${symbol[0]}
                    </div>
                    <div>
                        <div class="font-semibold">${symbol}</div>
                        <div class="text-sm text-gray-400">${item.name}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div id="price-${symbol}" class="font-bold text-xl">--</div>
                    <div id="change-${symbol}" class="text-sm">--</div>
                </div>
            </div>
            <div class="h-16 w-full">
                <canvas id="mini-chart-${symbol}"></canvas>
            </div>
        </div>
    `;
}