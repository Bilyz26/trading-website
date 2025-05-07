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
function createMiniChart(id, color, positive) {
    const ctx = document.getElementById(id).getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 70);
    gradient.addColorStop(0, positive ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                data: Array(20).fill().map(() => Math.random() * 10 + (positive ? 5 : -5)),
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

// Create mini charts
createMiniChart('miniChart1', '#0ECB81', true);
createMiniChart('miniChart2', '#F6465D', false);
createMiniChart('miniChart3', '#0ECB81', true);
createMiniChart('miniChart4', '#0ECB81', true);

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

// Simulate real-time updates
setInterval(() => {
    // Update mini charts
    const charts = ['miniChart1', 'miniChart2', 'miniChart3', 'miniChart4'];
    charts.forEach(id => {
        const chart = Chart.getChart(id);
        if (chart) {
            chart.data.datasets[0].data.shift();
            chart.data.datasets[0].data.push(Math.random() * 10 + (id === 'miniChart2' ? -5 : 5));
            chart.update();
        }
    });

    // Update main chart
    mainChart.data.datasets[0].data.shift();
    mainChart.data.datasets[0].data.push(Math.random() * 30 + 150);
    mainChart.update();
}, 2000);

// Mock API calls
async function fetchStockData(symbol) {
    try {
        // In a real app, you would use:
        // const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=YOUR_API_KEY`);
        // return response.data;
        
        // Mock response
        return {
            c: Math.random() * 100 + 100, // Current price
            d: (Math.random() * 5 - 2.5).toFixed(2), // Change
            dp: (Math.random() * 5 - 2.5).toFixed(2), // Percent change
            h: Math.random() * 10 + 100, // High
            l: Math.random() * 10 + 90, // Low
            o: Math.random() * 10 + 95, // Open
            pc: Math.random() * 10 + 95, // Previous close
            t: Date.now() / 1000 // Timestamp
        };
    } catch (error) {
        console.error('Error fetching stock data:', error);
        return null;
    }
}

// Initialize with some data
document.addEventListener('DOMContentLoaded', () => {
    // You would typically fetch data here
    // fetchStockData('AAPL').then(data => console.log(data));
});