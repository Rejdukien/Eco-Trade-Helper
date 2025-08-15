document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_BASE_URL = 'http://148.251.154.60:3011';
    const CORS_PROXIES = [
        'https://rejdukien-cors-proxy.alwaysdata.net/proxy.php?url=',
        'https://api.allorigins.win/raw?url=',
        'https://proxy.cors.sh/',
        'https://corsproxy.io/?url='
    ];
    let currentProxyIndex = 0;
    const USE_CORS_PROXY = window.location.protocol === 'https:';

    let baseApiUrl = DEFAULT_BASE_URL;
    let serverUrlInput = document.getElementById('server-url');
    let serverNameSpan = document.getElementById('server-name');
    let darkModeToggle = document.getElementById('dark-mode-toggle');

    // Elements
    // Currency selects (were text inputs previously)
    const currencyAInput = document.getElementById('currency-a');
    const currencyBInput = document.getElementById('currency-b');
    const rateAInput = document.getElementById('rate-a');
    const rateBInput = document.getElementById('rate-b');
    const applyRateBtn = document.getElementById('apply-rate');
    const refreshBtn = document.getElementById('refresh-btn');
    const minProfitInput = document.getElementById('min-profit');
    const hideWarningsCheckbox = document.getElementById('hide-warnings');

    const tradesTableBody = document.querySelector('#trades-table tbody');
    const totalProfitContainer = document.getElementById('total-profit-container');

    let allStores = [];
    let allItems = {};
    let onlinePlayerNames = [];
    let trades = [];
    // Saved (preferred) currency selections loaded before options exist
    let savedCurrencyA = null;
    let savedCurrencyB = null;

    // Online / owner helpers (mirroring other pages)
    function isPlayerOnline(playerName) {
        return onlinePlayerNames.includes(playerName);
    }
    function formatStoreOwner(ownerName) {
        if (!ownerName) ownerName = 'Unknown';
        const onlineIndicator = isPlayerOnline(ownerName) ? ' <span class="online-indicator">(online)</span>' : '';
        return ownerName + onlineIndicator;
    }

    function savePreferences() {
        localStorage.setItem('ecoTradeHelper_fx_darkMode', document.body.classList.contains('dark-mode'));
        localStorage.setItem('ecoTradeHelper_fx_serverUrl', baseApiUrl);
        localStorage.setItem('ecoTradeHelper_fx_currencyA', currencyAInput.value.trim());
        localStorage.setItem('ecoTradeHelper_fx_currencyB', currencyBInput.value.trim());
        localStorage.setItem('ecoTradeHelper_fx_rateA', rateAInput.value);
        localStorage.setItem('ecoTradeHelper_fx_rateB', rateBInput.value);
        localStorage.setItem('ecoTradeHelper_fx_minProfit', minProfitInput.value);
        localStorage.setItem('ecoTradeHelper_fx_hideWarnings', hideWarningsCheckbox.checked);
    }

    function loadPreferences() {
        if (localStorage.getItem('ecoTradeHelper_fx_darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
        }
        const savedServer = localStorage.getItem('ecoTradeHelper_fx_serverUrl');
        if (savedServer) { baseApiUrl = savedServer; }
        if (serverUrlInput) serverUrlInput.value = baseApiUrl;
        savedCurrencyA = localStorage.getItem('ecoTradeHelper_fx_currencyA') || 'Crabbies';
        savedCurrencyB = localStorage.getItem('ecoTradeHelper_fx_currencyB') || '';
        // Assign now (may be overridden once options populate)
        currencyAInput.value = savedCurrencyA;
        currencyBInput.value = savedCurrencyB;
        rateAInput.value = localStorage.getItem('ecoTradeHelper_fx_rateA') || '1';
        rateBInput.value = localStorage.getItem('ecoTradeHelper_fx_rateB') || '1';
        minProfitInput.value = localStorage.getItem('ecoTradeHelper_fx_minProfit') || '0';
        hideWarningsCheckbox.checked = localStorage.getItem('ecoTradeHelper_fx_hideWarnings') === 'true';
    }

    function populateCurrencySelects() {
        if (!currencyAInput || !currencyBInput) return;
        const currencies = [...new Set(allStores.map(s => s.CurrencyName).filter(Boolean))].sort();
        if (!currencies.length) return;
        // Helper to rebuild options only if list changed length or missing entries
        const rebuild = () => {
            const buildOptions = (selectEl, selectedVal) => {
                const prev = selectEl.value;
                selectEl.innerHTML = '';
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = '-- select --';
                selectEl.appendChild(placeholder);
                currencies.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c;
                    opt.textContent = c;
                    selectEl.appendChild(opt);
                });
                // Determine desired selection order: saved value -> previous -> default
                const desired = selectedVal || prev;
                if (desired && currencies.includes(desired)) {
                    selectEl.value = desired;
                }
            };
            buildOptions(currencyAInput, savedCurrencyA);
            buildOptions(currencyBInput, savedCurrencyB);
            // If A or B not valid, pick sensible defaults (first two distinct currencies)
            if (!currencyAInput.value || !currencies.includes(currencyAInput.value)) {
                currencyAInput.value = currencies[0];
            }
            if ((!currencyBInput.value || currencyAInput.value === currencyBInput.value) && currencies.length > 1) {
                const second = currencies.find(c => c !== currencyAInput.value);
                if (second) currencyBInput.value = second;
            }
        };
        rebuild();
    }

    function buildProxyUrl(url) {
        if (!USE_CORS_PROXY) return url;
        return `${CORS_PROXIES[currentProxyIndex]}${encodeURIComponent(url)}`;
    }

    async function fetchWithProxyFallback(url) {
        if (!USE_CORS_PROXY) return fetch(url);
        let lastErr;
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            currentProxyIndex = i;
            try {
                const resp = await fetch(buildProxyUrl(url), { headers: { 'Origin': 'https://rejdukien.github.io' } });
                if (!resp.ok) throw new Error(`Status ${resp.status}`);
                return resp;
            } catch (e) {
                lastErr = e;
                if (i === CORS_PROXIES.length - 1) throw lastErr;
            }
        }
    }

    async function fetchData() {
        try {
            const [infoResp, storesResp, itemsResp] = await Promise.all([
                fetchWithProxyFallback(`${baseApiUrl}/info`).catch(()=>null),
                fetchWithProxyFallback(`${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/stores`),
                fetchWithProxyFallback(`${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/allItems`)
            ]);
            if (infoResp) {
                const infoData = await infoResp.json();
                onlinePlayerNames = infoData.OnlinePlayersNames || [];
                const rawServerName = infoData.Description || 'Unknown Server';
                const serverName = rawServerName.replace(/<#[0-9a-fA-F]{6}>/g, '').trim();
                if (serverNameSpan) serverNameSpan.textContent = `Server: ${serverName}`;
            }
            const storesData = await storesResp.json();
            const itemsData = await itemsResp.json();
            allStores = storesData.Stores || [];
            allItems = itemsData.AllItems || {};
            populateCurrencySelects();
            recomputeTrades();
        } catch (e) {
            console.error('Fetch error', e);
            if (serverNameSpan) serverNameSpan.textContent = 'Server: Connection failed';
        }
    }

    function getSellingOffers(store) { return (store.AllOffers||[]).filter(o=>!o.Buying && o.Quantity>0); }
    function getBuyingOffers(store) { return (store.AllOffers||[]).filter(o=>o.Buying && o.Quantity>0); }

    function recomputeTrades() {
        const currencyA = currencyAInput.value.trim();
        const currencyB = currencyBInput.value.trim();
        const rateA = parseFloat(rateAInput.value) || 0; // A units
        const rateB = parseFloat(rateBInput.value) || 0; // B units equivalent
        const minProfit = parseFloat(minProfitInput.value) || 0;
        if (!currencyA || !currencyB || rateA <=0 || rateB <=0) {
            tradesTableBody.innerHTML = '<tr><td colspan="10">Enter currencies and positive rate.</td></tr>';
            return;
        }
        const fxAB = rateB / rateA; // 1 A = fxAB B
        const fxBA = rateA / rateB; // 1 B = fxBA A

        const results = [];

        // A -> B direction: Buy in A currency store, sell in B currency store
        for (const storeBuy of allStores) {
            if (storeBuy.CurrencyName !== currencyA) continue;
            for (const offerSell of getSellingOffers(storeBuy)) {
                for (const storeSell of allStores) {
                    if (storeSell.CurrencyName !== currencyB) continue;
                    for (const offerBuy of getBuyingOffers(storeSell)) {
                        if (offerBuy.ItemName !== offerSell.ItemName) continue;
                        // Convert B buy price to A using fxBA for comparison
                        const buyPriceA = offerSell.Price; // in A
                        const sellPriceB = offerBuy.Price; // in B
                        const sellPriceInA = sellPriceB * fxBA; // convert to A
                        const profitPerUnitA = sellPriceInA - buyPriceA;
                        if (profitPerUnitA <= 0) continue;
                        const qty = Math.min(offerSell.Quantity, offerBuy.Quantity);
                        if (qty <= 0) continue;
                        const buyerCanAfford = Math.floor((storeSell.Balance||0) / sellPriceB);
                        const sellerHas = offerSell.Quantity;
                        const feasibleQty = Math.min(qty, buyerCanAfford, sellerHas);
                        if (feasibleQty <= 0) continue;
                        const totalProfit = profitPerUnitA * feasibleQty;
                        if (totalProfit < minProfit) continue;
                        const warnings = [];
                        if (buyerCanAfford < qty) warnings.push('Buyer limited by balance');
                        if (feasibleQty < qty) warnings.push('Liquidity constrained');
                        results.push({
                            direction: `${currencyA} -> ${currencyB}`,
                            item: offerSell.ItemName,
                            buyFrom: storeBuy.Name,
                            buyOwner: storeBuy.Owner || 'Unknown',
                            buyStoreBalance: storeBuy.Balance || 0,
                            buyStoreCurrency: storeBuy.CurrencyName,
                            buyStoreStock: offerSell.Quantity,
                            sellTo: storeSell.Name,
                            sellOwner: storeSell.Owner || 'Unknown',
                            sellStoreBalance: storeSell.Balance || 0,
                            sellStoreCurrency: storeSell.CurrencyName,
                            sellStoreDemand: offerBuy.Quantity,
                            buyPrice: buyPriceA.toFixed(2) + ' ' + currencyA,
                            sellPrice: sellPriceB.toFixed(2) + ' ' + currencyB,
                            profitPerUnitA,
                            qty: feasibleQty,
                            totalProfit,
                            warnings
                        });
                    }
                }
            }
        }

        // B -> A direction
        for (const storeBuy of allStores) {
            if (storeBuy.CurrencyName !== currencyB) continue;
            for (const offerSell of getSellingOffers(storeBuy)) {
                for (const storeSell of allStores) {
                    if (storeSell.CurrencyName !== currencyA) continue;
                    for (const offerBuy of getBuyingOffers(storeSell)) {
                        if (offerBuy.ItemName !== offerSell.ItemName) continue;
                        const buyPriceB = offerSell.Price; // in B
                        const sellPriceA = offerBuy.Price; // in A
                        const sellPriceInB = sellPriceA * fxAB; // convert to B for comparison OR compute profit in A
                        // Profit per unit expressed in A: convert buyPriceB to A
                        const buyPriceInA = buyPriceB * fxBA;
                        const profitPerUnitA = sellPriceA - buyPriceInA;
                        if (profitPerUnitA <= 0) continue;
                        const qty = Math.min(offerSell.Quantity, offerBuy.Quantity);
                        if (qty <= 0) continue;
                        const buyerCanAfford = Math.floor((storeSell.Balance||0) / sellPriceA);
                        const sellerHas = offerSell.Quantity;
                        const feasibleQty = Math.min(qty, buyerCanAfford, sellerHas);
                        if (feasibleQty <= 0) continue;
                        const totalProfit = profitPerUnitA * feasibleQty;
                        if (totalProfit < minProfit) continue;
                        const warnings = [];
                        if (buyerCanAfford < qty) warnings.push('Buyer limited by balance');
                        if (feasibleQty < qty) warnings.push('Liquidity constrained');
                        results.push({
                            direction: `${currencyB} -> ${currencyA}`,
                            item: offerSell.ItemName,
                            buyFrom: storeBuy.Name,
                            buyOwner: storeBuy.Owner || 'Unknown',
                            buyStoreBalance: storeBuy.Balance || 0,
                            buyStoreCurrency: storeBuy.CurrencyName,
                            buyStoreStock: offerSell.Quantity,
                            sellTo: storeSell.Name,
                            sellOwner: storeSell.Owner || 'Unknown',
                            sellStoreBalance: storeSell.Balance || 0,
                            sellStoreCurrency: storeSell.CurrencyName,
                            sellStoreDemand: offerBuy.Quantity,
                            buyPrice: buyPriceB.toFixed(2) + ' ' + currencyB,
                            sellPrice: offerBuy.Price.toFixed(2) + ' ' + currencyA,
                            profitPerUnitA,
                            qty: feasibleQty,
                            totalProfit,
                            warnings
                        });
                    }
                }
            }
        }

        trades = results;
        renderTrades();
    }

    function renderTrades() {
        const hideWarnings = hideWarningsCheckbox.checked;
        tradesTableBody.innerHTML = '';
        if (!trades.length) {
            tradesTableBody.innerHTML = '<tr><td colspan="10">No trades found for current FX rate.</td></tr>';
            totalProfitContainer.textContent = '';
            return;
        }
        trades.sort((a,b)=> b.totalProfit - a.totalProfit);
        let total = 0;
        for (const t of trades) {
            if (hideWarnings && t.warnings.length) continue;
            total += t.totalProfit;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.direction}</td>
                <td>${t.item}</td>
                <td>${t.buyFrom}<br><small>Owner: ${formatStoreOwner(t.buyOwner)}<br>Balance: ${Number(t.buyStoreBalance).toFixed(2)} ${t.buyStoreCurrency}<br>Stock: ${t.buyStoreStock}</small></td>
                <td>${t.sellTo}<br><small>Owner: ${formatStoreOwner(t.sellOwner)}<br>Balance: ${Number(t.sellStoreBalance).toFixed(2)} ${t.sellStoreCurrency}<br>Wants: ${t.sellStoreDemand}</small></td>
                <td>${t.buyPrice}</td>
                <td>${t.sellPrice}</td>
                <td>${t.profitPerUnitA.toFixed(2)}</td>
                <td>${t.qty}</td>
                <td>${t.totalProfit.toFixed(2)}</td>
                <td>${t.warnings.join(', ')}</td>`;
            tradesTableBody.appendChild(row);
        }
        totalProfitContainer.innerHTML = `<h3>Total Potential Profit (in ${currencyAInput.value.trim()}): ${total.toFixed(2)}</h3>`;
    }

    function handleServerUrlChange() {
        const newUrl = serverUrlInput.value.trim();
        if (newUrl && newUrl !== baseApiUrl) {
            baseApiUrl = newUrl;
            savePreferences();
            fetchData();
        }
    }

    // Events
    applyRateBtn.addEventListener('click', () => { savePreferences(); recomputeTrades(); });
    refreshBtn.addEventListener('click', () => { fetchData(); });
    rateAInput.addEventListener('input', recomputeTrades);
    rateBInput.addEventListener('input', recomputeTrades);
    // React to currency selection changes
    ['change','input'].forEach(evt => {
        currencyAInput.addEventListener(evt, () => { savePreferences(); recomputeTrades(); });
        currencyBInput.addEventListener(evt, () => { savePreferences(); recomputeTrades(); });
    });
    minProfitInput.addEventListener('input', () => { savePreferences(); renderTrades(); });
    hideWarningsCheckbox.addEventListener('change', () => { savePreferences(); renderTrades(); });
    if (darkModeToggle) darkModeToggle.addEventListener('change', () => { document.body.classList.toggle('dark-mode'); savePreferences(); });
    if (serverUrlInput) {
        serverUrlInput.addEventListener('change', handleServerUrlChange);
        serverUrlInput.addEventListener('blur', handleServerUrlChange);
    }

    loadPreferences();
    fetchData();
});
