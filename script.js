// --- 配置 ---
const ASSETS = {
    "CORNERSTONE": {
        id: "CORNERSTONE", icon: "fa-solid fa-landmark-dome",
        name_zh: "人类文明基石", name_en: "Civilization Cornerstone",
        components: ["NVDA", "BTC", "GOLD", "AAPL", "GOOG", "ASML"],
        cagr: 0.35 
    },
    "BTC": { id: "BTC", icon: "fa-brands fa-bitcoin", name_zh: "比特币", name_en: "Bitcoin", cagr: 0.20 },
    "GOLD": { id: "GOLD", icon: "fa-solid fa-ring", name_zh: "黄金", name_en: "Gold", cagr: 0.05 },
    "QQQ": { id: "QQQ", icon: "fa-solid fa-chart-line", name_zh: "纳指100", name_en: "Nasdaq 100", cagr: 0.11 },
    "SP500": { id: "SP500", icon: "fa-solid fa-flag-usa", name_zh: "标普500", name_en: "S&P 500", cagr: 0.08 },
    "CSI300": { id: "CSI300", icon: "fa-solid fa-yen-sign", name_zh: "沪深300", name_en: "CSI 300", cagr: 0.03 }
};

const I18N = {
    zh: {
        settingsTitle: "配置引擎", lblTarget: "核心标的", lblInitial: "初始本金", lblAmount: "定投金额",
        lblFreq: "定投频率", optDaily: "日", optWeekly: "周", optMonthly: "月",
        lblStepUp: "每年增加投入 (%)", lblInflation: "扣除通胀 (3%)",
        lblDuration: "回测年限", lblFuture: "未来推演",
        advSettings: "专家模式: 修正年化率", cagrNote: "* 基于2014-2024真实数据，可手动调低。",
        lblTotalInvested: "本金总投入", lblPastAPY: "历史回测 APY", lblNetValue: "净值", lblFutureValue: "未来推演净值",
        chartTitle: "财富增长曲线", chartWealth: "总资产", chartPrincipal: "投入本金",
        tableTitle: "年度详细预测", thYear: "年份", thInvested: "累计本金", thBalance: "期末资产", thProfit: "收益率"
    },
    en: {
        settingsTitle: "Config Engine", lblTarget: "Target Asset", lblInitial: "Initial Capital", lblAmount: "DCA Amount",
        lblFreq: "Frequency", optDaily: "Daily", optWeekly: "Weekly", optMonthly: "Monthly",
        lblStepUp: "Annual Step-up (%)", lblInflation: "Inflation Adj. (3%)",
        lblDuration: "Backtest Years", lblFuture: "Future Years",
        advSettings: "Expert: Adjust CAGR", cagrNote: "* Based on 2014-2024 data.",
        lblTotalInvested: "Total Invested", lblPastAPY: "Historical APY", lblNetValue: "Net Value", lblFutureValue: "Future Result",
        chartTitle: "Wealth Growth Curve", chartWealth: "Total Wealth", chartPrincipal: "Principal",
        tableTitle: "Yearly Projection", thYear: "Year", thInvested: "Invested", thBalance: "Balance", thProfit: "Profit %"
    }
};

let state = { lang: 'zh', asset: 'CORNERSTONE', chart: null };

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    calculate();
});

function initUI() {
    const container = document.getElementById('assetContainer');
    container.innerHTML = '';
    
    const order = ["CORNERSTONE", "BTC", "GOLD", "QQQ", "SP500", "CSI300"];
    
    order.forEach(key => {
        const asset = ASSETS[key];
        const btn = document.createElement('div');
        btn.className = `asset-btn ${key === state.asset ? 'active' : ''}`;
        btn.setAttribute('data-id', key);
        btn.innerHTML = `<i class="${asset.icon}"></i><span>${state.lang === 'zh' ? asset.name_zh : asset.name_en}</span>`;
        btn.onclick = () => switchAsset(key);
        container.appendChild(btn);
    });

    const ids = ['initialCapital', 'amount', 'stepUpRate', 'historyYears', 'futureYears', 'customApy', 'inflationToggle'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', debounce(calculate, 50));
    });
    document.querySelectorAll('input[name="freq"]').forEach(el => el.addEventListener('change', calculate));
    
    document.getElementById('stepUpRate').addEventListener('input', (e) => {
        document.getElementById('stepUpVal').innerText = e.target.value + "%";
    });

    document.getElementById('customApy').value = (ASSETS[state.asset].cagr * 100).toFixed(1);
}

function switchAsset(id) {
    state.asset = id;
    document.querySelectorAll('.asset-btn').forEach(b => {
        b.classList.remove('active');
        if(b.getAttribute('data-id') === id) b.classList.add('active');
    });
    document.getElementById('customApy').value = (ASSETS[id].cagr * 100).toFixed(1);
    calculate();
}

function toggleLang() {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    document.getElementById('langText').innerText = state.lang === 'zh' ? 'EN / 中文' : '中文 / EN';
    const t = I18N[state.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(t[key]) el.innerText = t[key];
    });
    initUI(); 
    calculate();
}

function calculate() {
    const initialCap = parseFloat(document.getElementById('initialCapital').value) || 0;
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const freq = document.querySelector('input[name="freq"]:checked').value;
    const histYears = parseInt(document.getElementById('historyYears').value) || 10;
    const futYears = parseInt(document.getElementById('futureYears').value) || 10;
    const stepUpRate = parseFloat(document.getElementById('stepUpRate').value) / 100 || 0;
    const useInflation = document.getElementById('inflationToggle').checked; // 获取通胀开关状态
    
    let customApy = parseFloat(document.getElementById('customApy').value);
    let nominalRate = isNaN(customApy) ? ASSETS[state.asset].cagr : customApy / 100;

    // 通胀调整逻辑: Real Rate = (1 + Nominal) / (1 + Inflation) - 1
    // 假设通胀率为 3%
    const inflationRate = 0.03;
    let effectiveRate = useInflation ? ((1 + nominalRate) / (1 + inflationRate) - 1) : nominalRate;

    let periodsPerYear = 12;
    if (freq === 'weekly') periodsPerYear = 52;
    if (freq === 'daily') periodsPerYear = 365;

    // 组合描述
    const compEl = document.getElementById('compositionDesc');
    if (ASSETS[state.asset].components) {
        compEl.innerHTML = (state.lang==='zh' ? '包含: ' : 'Incl: ') + ASSETS[state.asset].components.join(" + ");
        compEl.style.display = 'block';
    } else {
        compEl.style.display = 'none';
    }

    // 计算
    let chartLabels = [];
    let chartWealth = [];
    let chartPrincipal = [];
    let tableData = [];
    
    let currentWealth = initialCap;
    let currentPrincipal = initialCap;
    let currentDCA = amount;
    
    chartLabels.push("Start");
    chartWealth.push(initialCap);
    chartPrincipal.push(initialCap);
    
    const totalYears = histYears + futYears;
    let pastWealth = 0;

    for(let y = 1; y <= totalYears; y++) {
        for(let p = 0; p < periodsPerYear; p++) {
            currentWealth = currentWealth * (1 + effectiveRate / periodsPerYear);
            currentWealth += currentDCA;
            currentPrincipal += currentDCA;
        }
        
        chartLabels.push(`Year ${y}`);
        chartWealth.push(currentWealth);
        chartPrincipal.push(currentPrincipal);
        
        let profit = currentPrincipal > 0 ? ((currentWealth - currentPrincipal) / currentPrincipal) * 100 : 0;
        tableData.push({
            year: y,
            principal: currentPrincipal,
            balance: currentWealth,
            profit: profit,
            isFuture: y > histYears
        });

        currentDCA = currentDCA * (1 + stepUpRate);
        if (y === histYears) pastWealth = currentWealth;
    }

    // 更新 Dashboard UI
    animateValue('resPrincipal', currentPrincipal);
    // 中间卡片：主数字显示年化( nominal or real )，小标签显示净值
    document.getElementById('resApyBig').innerText = (effectiveRate * 100).toFixed(1) + "%";
    document.getElementById('resPastValueSmall').innerText = formatMoney(pastWealth);
    
    animateValue('resFutureValue', currentWealth);

    // 绘制图表与表格
    drawChart(chartLabels, chartWealth, chartPrincipal, histYears);
    renderTable(tableData, histYears);
}

function renderTable(data, splitYear) {
    const tbody = document.querySelector('#projectionTable tbody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const tr = document.createElement('tr');
        if(row.isFuture) tr.classList.add('future-row');
        
        let yearLabel = row.year <= splitYear ? `Year ${row.year}` : `Year ${row.year} (Fut)`;
        let profitClass = row.profit >= 0 ? 'positive' : 'negative';
        
        tr.innerHTML = `
            <td>${yearLabel}</td>
            <td>${formatMoney(row.principal)}</td>
            <td><strong>${formatMoney(row.balance)}</strong></td>
            <td class="${profitClass}">${row.profit > 0 ? '+' : ''}${row.profit.toFixed(1)}%</td>
        `;
        tbody.appendChild(tr);
    });
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    obj.innerText = formatMoney(end);
}

function formatMoney(num) {
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', currency: 'USD', 
        maximumFractionDigits: 0,
        notation: num > 1000000 ? "compact" : "standard" 
    }).format(num);
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function drawChart(labels, wealth, principal, splitYear) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    const t = I18N[state.lang];
    
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

    if(state.chart) state.chart.destroy();
    
    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: t.chartWealth,
                data: wealth,
                borderColor: '#06b6d4',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                pointRadius: 0,
                tension: 0.4
            }, {
                label: t.chartPrincipal,
                data: principal,
                borderColor: '#64748b',
                borderDash: [5, 5],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#94a3b8', font: {family: 'Outfit'} } },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line', xMin: splitYear, xMax: splitYear,
                            borderColor: '#a855f7', borderWidth: 2,
                            label: { content: 'NOW', enabled: true, backgroundColor: 'rgba(168, 85, 247, 0.8)', font: {family: 'Outfit'} }
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#06b6d4',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit' },
                    bodyFont: { family: 'Outfit' },
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}` }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: {family: 'Outfit'} } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: {family: 'Outfit'}, callback: v => formatMoney(v) } }
            }
        }
    });

}

