const FINNHUB_API_KEY = 'd0cfedhr01ql2j3cqmqgd0cfedhr01ql2j3cqmr0';

// Available stocks with full company names
const STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' }
];

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

// Initialize stock cards
function initializeStockCards() {
    const stockCardsContainer = document.getElementById('stockCards');
    stockCardsContainer.innerHTML = STOCKS.map(stock => createStockCard(stock)).join('');
    updateAllStockPrices();
}

// Update stock price and change
async function updateStockPrice(symbol) {
    try {
        const quote = await fetchStockData(symbol);
        if (quote) {
            const priceElement = document.getElementById(`price-${symbol}`);
            const changeElement = document.getElementById(`change-${symbol}`);
            
            const price = quote.c.toFixed(2);
            const change = quote.d.toFixed(2);
            const changePercent = quote.dp.toFixed(2);
            
            priceElement.innerText = `$${price}`;
            changeElement.innerText = `${changePercent > 0 ? '+' : ''}${changePercent}% ($${change})`;
            changeElement.className = `text-sm ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`;
        }
    } catch (error) {
        console.error(`Error updating stock price for ${symbol}:`, error);
    }
}

// Update all stock prices
async function updateAllStockPrices() {
    for (const stock of STOCKS) {
        await updateStockPrice(stock.symbol);
    }
}

// Select stock and update detail view
async function selectStock(symbol) {
    const stock = STOCKS.find(s => s.symbol === symbol);
    if (!stock) return;

    // Update detail view
    document.getElementById('stockSymbolIcon').innerText = symbol[0];
    document.getElementById('stockSymbol').innerText = symbol;
    document.getElementById('stockName').innerText = stock.name;
    
    const quote = await fetchStockData(symbol);
    if (quote) {
        const price = quote.c.toFixed(2);
        const change = quote.d.toFixed(2);
        const changePercent = quote.dp.toFixed(2);
        
        document.getElementById('stockPrice').innerText = `$${price}`;
        document.getElementById('stockChange').innerText = `${changePercent > 0 ? '+' : ''}${changePercent}% ($${change})`;
        document.getElementById('stockChange').className = `text-sm ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`;
    }

    // Show detail section
    document.getElementById('stockDetail').classList.remove('hidden');

    // Update chart
    await updateChartWithSymbol(symbol);
}

// Update chart with new symbol
async function updateChartWithSymbol(symbol) {
    try {
        const data = await fetchCandleData(symbol);
        if (data && data.s === 'ok') {
            mainChart.data.datasets[0].data = data.c;
            mainChart.data.labels = data.t.map(timestamp => {
                const date = new Date(timestamp * 1000);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            mainChart.update();
        }
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

// Real-time updates every 10 seconds
setInterval(updateAllStockPrices, 10000);

// Fetch real-time stock data from Finnhub
async function fetchStockData(symbol) {
    try {
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching stock data for ${symbol}:`, error);
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
        // Initialize stock cards
        initializeStockCards();
        
        // Initialize main chart with AAPL data
        await selectStock('AAPL');
        
        // Start real-time updates
        updateAllStockPrices();
    } catch (error) {
        console.error('Error initializing data:', error);
    }
});