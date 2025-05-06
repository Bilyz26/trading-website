// Finnhub API configuration
const FINNHUB_API_KEY = 'd0brmj1r01qs9fjiv9ugd0brmj1r01qs9fjiv9v0';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Function to fetch candle data from Finnhub
async function fetchCandleData(symbol, resolution = 'D') {
    const toTimestamp = Math.floor(Date.now() / 1000);
    const fromTimestamp = toTimestamp - (100 * 24 * 60 * 60); // 100 days of data

    try {
        const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
            params: {
                symbol: symbol,
                resolution: resolution,
                from: fromTimestamp,
                to: toTimestamp,
                token: FINNHUB_API_KEY
            }
        });

        if (response.data.s === 'ok') {
            return {
                timestamps: response.data.t,
                prices: response.data.c,
                opens: response.data.o,
                highs: response.data.h,
                lows: response.data.l
            };
        } else {
            throw new Error('Invalid data received from Finnhub');
        }
    } catch (error) {
        console.error('Error fetching candle data:', error);
        return null;
    }
}

// Function to fetch real-time quote
async function fetchQuote(symbol) {
    try {
        const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
            params: {
                symbol: symbol,
                token: FINNHUB_API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching quote:', error);
        return null;
    }
}

// Initialize main chart with real data
async function initializeMainChart(symbol = 'AAPL') {
    const mainCtx = document.getElementById('mainChart').getContext('2d');
    const mainGradient = mainCtx.createLinearGradient(0, 0, 0, 400);
    mainGradient.addColorStop(0, 'rgba(240, 185, 11, 0.2)');
    mainGradient.addColorStop(1, 'rgba(240, 185, 11, 0)');

    const candleData = await fetchCandleData(symbol);
    if (!candleData) return;

    const mainChart = new Chart(mainCtx, {
        type: 'line',
        data: {
            labels: candleData.timestamps.map(timestamp => 
                new Date(timestamp * 1000).toLocaleDateString()
            ),
            datasets: [{
                label: `${symbol} Price`,
                data: candleData.prices,
                borderColor: '#F0B90B',
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
                        color: '#848E9C',
                        maxRotation: 45,
                        minRotation: 45
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

    // Update chart with real-time data every 5 seconds
    setInterval(async () => {
        const quote = await fetchQuote(symbol);
        if (quote) {
            mainChart.data.labels.push(new Date().toLocaleDateString());
            mainChart.data.labels.shift();
            mainChart.data.datasets[0].data.push(quote.c);
            mainChart.data.datasets[0].data.shift();
            mainChart.update();
        }
    }, 5000);

    return mainChart;
}

// Initialize mini charts with real data
async function initializeMiniChart(id, symbol) {
    const ctx = document.getElementById(id).getContext('2d');
    const candleData = await fetchCandleData(symbol, '5');
    if (!candleData) return;

    const isPositive = candleData.prices[candleData.prices.length - 1] > candleData.prices[0];
    const color = isPositive ? '#0ECB81' : '#F6465D';
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    gradient.addColorStop(0, `${color}33`); // 20% opacity
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: candleData.timestamps.map(t => ''),
            datasets: [{
                data: candleData.prices,
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

// Initialize all charts when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize main chart with Apple stock
    const mainChart = await initializeMainChart('AAPL');

    // Initialize mini charts with different stocks
    const miniCharts = await Promise.all([
        initializeMiniChart('miniChart1', 'AAPL'),
        initializeMiniChart('miniChart2', 'MSFT'),
        initializeMiniChart('miniChart3', 'GOOGL'),
        initializeMiniChart('miniChart4', 'AMZN')
    ]);

    // Update mini charts with real-time data every 5 seconds
    setInterval(async () => {
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];
        for (let i = 0; i < symbols.length; i++) {
            const quote = await fetchQuote(symbols[i]);
            if (quote && miniCharts[i]) {
                miniCharts[i].data.datasets[0].data.push(quote.c);
                miniCharts[i].data.datasets[0].data.shift();
                miniCharts[i].update();
            }
        }
    }, 5000);
});
