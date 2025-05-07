// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', function() {
    document.documentElement.classList.toggle('dark');
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

// Real-time updates every 2 seconds
setInterval(async () => {
    // Update all stocks simultaneously
    await Promise.all(STOCKS.map(async (symbol, index) => {
        const stockData = await fetchStockData(symbol);
        if (stockData) {
            // Update stock card
            const priceElement = document.querySelector(`#stock${index + 1} .price`);
            const changeElement = document.querySelector(`#stock${index + 1} .change`);
            if (priceElement) priceElement.textContent = `$${stockData.c.toFixed(2)}`;
            if (changeElement) {
                const change = `${stockData.d >= 0 ? '+' : ''}${stockData.d.toFixed(2)} (${stockData.dp.toFixed(2)}%)`;
                changeElement.textContent = change;
                changeElement.classList.remove('positive', 'negative');
                changeElement.classList.add(stockData.d >= 0 ? 'positive' : 'negative');
            }

            // Update mini chart
            const chart = Chart.getChart(`miniChart${index + 1}`);
            if (chart) {
                chart.data.datasets[0].data.shift();
                chart.data.datasets[0].data.push(stockData.c);
                chart.update('none'); // Use 'none' for better performance
            }

            // Update main chart if it's the first stock (AAPL)
            if (index === 0) {
                mainChart.data.datasets[0].data.shift();
                mainChart.data.datasets[0].data.push(stockData.c);
                mainChart.update('none');
            }
        }
    }));

    // Update portfolio table
    await updatePortfolioTable();
}, 2000); // Update every 5 seconds to stay within rate limits

// Finnhub API configuration
const FINNHUB_API_KEY = 'd0cfedhr01ql2j3cqmqgd0cfedhr01ql2j3cqmr0';
const STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];

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

// Initialize with real data
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize main chart with AAPL data
        const mainChartData = await fetchCandleData('AAPL', 'D', 30);
        if (mainChartData && mainChartData.s === 'ok') {
            mainChart.data.datasets[0].data = mainChartData.c;
            mainChart.data.labels = mainChartData.t.map(timestamp => {
                const date = new Date(timestamp * 1000);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            mainChart.update();
        }

        // Update stock cards with current prices
        for (let i = 0; i < STOCKS.length; i++) {
            const stockData = await fetchStockData(STOCKS[i]);
            if (stockData) {
                const priceElement = document.querySelector(`#stock${i + 1} .price`);
                const changeElement = document.querySelector(`#stock${i + 1} .change`);
                if (priceElement) priceElement.textContent = `$${stockData.c.toFixed(2)}`;
                if (changeElement) {
                    const change = `${stockData.d >= 0 ? '+' : ''}${stockData.d.toFixed(2)} (${stockData.dp.toFixed(2)}%)`;
                    changeElement.textContent = change;
                    changeElement.classList.add(stockData.d >= 0 ? 'positive' : 'negative');
                }
            }
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
});