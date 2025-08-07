document.addEventListener('DOMContentLoaded', () => {
    const tradesContainer = document.getElementById('trades-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const minProfitInput = document.getElementById('min-profit');
    const sameIntermediateStoreCheckbox = document.getElementById('same-intermediate-store');
    const serverUrlInput = document.getElementById('server-url');
    const serverNameSpan = document.getElementById('server-name');
    
    const DEFAULT_BASE_URL = 'http://148.251.154.60:3011';
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    const USE_CORS_PROXY = window.location.protocol === 'https:';
    
    let baseApiUrl = DEFAULT_BASE_URL;
    let apiUrl = `${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/stores`;
    let itemsApiUrl = `${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/allItems`;
    let infoApiUrl = `${baseApiUrl}/info`;
    
    let allStores = [];
    let allTrades = [];
    let allItems = {};
    let serverInfo = {};
    let onlinePlayerNames = [];

    // Load saved preferences from localStorage
    function loadPreferences() {
        // Load dark mode preference
        const darkMode = localStorage.getItem('ecoTradeHelper_darkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }

        // Load server URL preference
        const savedServerUrl = localStorage.getItem('ecoTradeHelper_serverUrl');
        if (savedServerUrl) {
            baseApiUrl = savedServerUrl;
            serverUrlInput.value = savedServerUrl;
        } else {
            serverUrlInput.value = DEFAULT_BASE_URL;
        }
        updateApiUrls();

        // Load filter preferences
        const minProfit = localStorage.getItem('ecoTradeHelper_crossCurrency_minProfit');
        if (minProfit !== null) {
            minProfitInput.value = minProfit;
        }

        const sameStore = localStorage.getItem('ecoTradeHelper_crossCurrency_sameStore') === 'true';
        if (sameStore) {
            sameIntermediateStoreCheckbox.checked = true;
        }
    }

    // Save preferences to localStorage
    function savePreferences() {
        localStorage.setItem('ecoTradeHelper_darkMode', document.body.classList.contains('dark-mode'));
        localStorage.setItem('ecoTradeHelper_crossCurrency_minProfit', minProfitInput.value);
        localStorage.setItem('ecoTradeHelper_crossCurrency_sameStore', sameIntermediateStoreCheckbox.checked);
    }

    // Update API URLs when server URL changes
    function updateApiUrls() {
        const baseUrl = USE_CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(baseApiUrl)}` : baseApiUrl;
        apiUrl = `${baseUrl}/api/v1/plugins/EcoPriceCalculator/stores`;
        itemsApiUrl = `${baseUrl}/api/v1/plugins/EcoPriceCalculator/allItems`;
        infoApiUrl = `${baseUrl}/info`;
    }

    // Fetch server info and update display
    async function fetchServerInfo() {
        try {
            const url = USE_CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(baseApiUrl + '/info')}` : `${baseApiUrl}/info`;
            const response = await fetch(url);
            const data = await response.json();
            onlinePlayerNames = data.OnlinePlayersNames || [];
            
            const rawServerName = data.Description ? `${data.Description}` : 'Unknown Server';
            // Filter out color tags like <#59e817>
            const serverName = rawServerName.replace(/<#[0-9a-fA-F]{6}>/g, '').trim();
            const proxyIndicator = USE_CORS_PROXY ? ' (via proxy)' : '';
            serverNameSpan.textContent = `Server: ${serverName}${proxyIndicator}`;
            serverNameSpan.style.color = '#4CAF50';
        } catch (error) {
            console.error('Failed to fetch server info:', error);
            serverNameSpan.textContent = 'Server: Connection failed';
            serverNameSpan.style.color = '#f44336';
            onlinePlayerNames = [];
        }
    }

    // Handle server URL change
    function handleServerUrlChange() {
        const newUrl = serverUrlInput.value.trim();
        if (newUrl && newUrl !== baseApiUrl) {
            baseApiUrl = newUrl;
            localStorage.setItem('ecoTradeHelper_serverUrl', newUrl);
            updateApiUrls();
            fetchServerInfo();
        }
    }

    // Check if a player is online
    function isPlayerOnline(playerName) {
        return onlinePlayerNames.includes(playerName);
    }

    // Format store owner name with online status
    function formatStoreOwner(ownerName) {
        const onlineIndicator = isPlayerOnline(ownerName) ? 
            ' <span class="online-indicator">(online)</span>' : '';
        return `${ownerName}${onlineIndicator}`;
    }

    function getItemInfo(itemName) {
        const item = allItems[itemName];
        if (!item || !item.PropertyInfos) {
            return {
                stackSize: 'N/A',
                weight: 'N/A',
                isCarried: 'N/A',
                stacks: 'N/A'
            };
        }

        const props = item.PropertyInfos;
        const stackSize = props.MaxStackSize ? props.MaxStackSize.Int32 : 'N/A';
        const weight = props.Weight ? props.Weight.Int32 : 'N/A';
        const isCarried = props.IsCarried ? (props.IsCarried.Boolean === 'True' ? 'Yes' : 'No') : 'N/A';
        
        return {
            stackSize,
            weight,
            isCarried,
            stacks: stackSize !== 'N/A' ? (quantity) => `${Math.ceil(quantity / stackSize)} stacks` : () => 'N/A'
        };
    }

    function formatItemDisplay(itemName, quantity) {
        const itemInfo = getItemInfo(itemName);
        const stackInfo = typeof itemInfo.stacks === 'function' ? itemInfo.stacks(quantity) : 'N/A';
        const totalWeight = itemInfo.weight !== 'N/A' ? (itemInfo.weight * quantity) : 'N/A';
        const weightDisplay = totalWeight !== 'N/A' ? `${(totalWeight / 1000).toFixed(2)}kg` : 'N/A';
        
        return `${itemName}<br><small>Stack size: ${itemInfo.stackSize} | Carried: ${itemInfo.isCarried}<br>Total weight: ${weightDisplay}<br>Quantity: ${quantity} (${stackInfo})</small>`;
    }

    function fetchData() {
        console.log('Starting fetchData...');
        const startTime = performance.now();
        
        // Fetch server info, stores and items data
        const storesUrl = USE_CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(baseApiUrl + '/api/v1/plugins/EcoPriceCalculator/stores')}` : apiUrl;
        const itemsUrl = USE_CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(baseApiUrl + '/api/v1/plugins/EcoPriceCalculator/allItems')}` : itemsApiUrl;
        const infoUrl = USE_CORS_PROXY ? `${CORS_PROXY}${encodeURIComponent(baseApiUrl + '/info')}` : infoApiUrl;
        
        Promise.all([
            fetch(infoUrl).then(response => response.json()).catch(() => ({ OnlinePlayersNames: [] })),
            fetch(storesUrl).then(response => response.json()),
            fetch(itemsUrl).then(response => response.json())
        ])
            .then(([infoData, storesData, itemsData]) => {
                // Update server info
                onlinePlayerNames = infoData.OnlinePlayersNames || [];
                
                const rawServerName = infoData.Description ? `${infoData.Description}` : 'Unknown Server';
                // Filter out color tags like <#59e817>
                const serverName = rawServerName.replace(/<#[0-9a-fA-F]{6}>/g, '').trim();
                serverNameSpan.textContent = `Server: ${serverName}`;
                serverNameSpan.style.color = '#4CAF50';
                
                console.log('API responses received');
                console.log('Number of stores:', storesData.Stores ? storesData.Stores.length : 'No Stores property');
                console.log('Number of items:', itemsData.AllItems ? Object.keys(itemsData.AllItems).length : 'No AllItems property');

                allStores = storesData.Stores;
                allItems = itemsData.AllItems;
                console.log('Starting calculateCrossCurrencyTrades...');
                
                // Show progress to user
                const tradesContainer = document.getElementById('trades-container');
                tradesContainer.innerHTML = '<p>Calculating cross-currency trade opportunities...</p>';
                
                // Use setTimeout to allow UI to update before heavy computation
                setTimeout(() => {
                    const sameIntermediateStore = sameIntermediateStoreCheckbox.checked;
                    const crossCurrencyTrades = calculateCrossCurrencyTrades(allStores, sameIntermediateStore);
                    console.log('calculateCrossCurrencyTrades completed. Found', crossCurrencyTrades.length, 'trades');

                    allTrades = crossCurrencyTrades;
                    console.log('Applying filters...');
                    applyFilters();
                    
                    const endTime = performance.now();
                    console.log(`Total processing time: ${(endTime - startTime).toFixed(2)}ms`);
                    console.log('fetchData completed successfully');
                }, 10);
            })
            .catch(error => {
                console.error('Error in fetchData:', error);
                console.error('Error stack:', error.stack);
                serverNameSpan.textContent = 'Server: Connection failed';
                serverNameSpan.style.color = '#f44336';
                tradesContainer.innerHTML = '<p>Error loading trade data. Please try again later.</p>';
            });
    }

    function applyFilters() {
        console.log('Starting applyFilters...');
        const minProfit = parseFloat(minProfitInput.value) || 0;
        console.log('Filter criteria - minProfit:', minProfit);
        console.log('Total trades before filtering:', allTrades.length);

        const filteredTrades = allTrades.filter(trade =>
            trade.totalProfitInBase >= minProfit
        );

        console.log('Trades after filtering:', filteredTrades.length);
        displayCrossCurrencyTrades(filteredTrades);
        console.log('applyFilters completed');
    }

    function calculateExchangeRates(stores) {
        console.log('Starting calculateExchangeRates with', stores.length, 'stores');
        const rates = {}; // rates[fromCurrency][toCurrency] = rate (how much toCurrency per 1 fromCurrency)
        const itemPrices = {}; // itemPrices[itemName][currency] = { sell: [prices], buy: [prices] }

        // Initialize rates: 1 unit of a currency is 1 unit of itself
        const allCurrencies = [...new Set(stores.map(store => store.CurrencyName))];
        console.log('Found currencies:', allCurrencies);
        allCurrencies.forEach(c => {
            rates[c] = rates[c] || {};
            rates[c][c] = 1;
        });

        // Populate itemPrices map
        for (const store of stores) {
            if (!store.AllOffers || !Array.isArray(store.AllOffers)) {
                console.warn('Store missing AllOffers:', store.Name);
                continue;
            }
            for (const offer of store.AllOffers) {
                if (!itemPrices[offer.ItemName]) {
                    itemPrices[offer.ItemName] = {};
                }
                if (!itemPrices[offer.ItemName][store.CurrencyName]) {
                    itemPrices[offer.ItemName][store.CurrencyName] = { sell: [], buy: [] };
                }
                if (offer.Buying) {
                    itemPrices[offer.ItemName][store.CurrencyName].buy.push(offer.Price);
                } else {
                    itemPrices[offer.ItemName][store.CurrencyName].sell.push(offer.Price);
                }
            }
        }

        // Infer direct exchange rates from common items
        for (const itemName in itemPrices) {
            const currenciesForThisItem = Object.keys(itemPrices[itemName]);
            for (let i = 0; i < currenciesForThisItem.length; i++) {
                const currency1 = currenciesForThisItem[i];
                for (let j = i + 1; j < currenciesForThisItem.length; j++) {
                    const currency2 = currenciesForThisItem[j];

                    const sellPrices1 = itemPrices[itemName][currency1].sell;
                    const buyPrices2 = itemPrices[itemName][currency2].buy;
                    const sellPrices2 = itemPrices[itemName][currency2].sell;
                    const buyPrices1 = itemPrices[itemName][currency1].buy;

                    // Scenario: Sell item in currency1, buy in currency2
                    if (sellPrices1.length > 0 && buyPrices2.length > 0) {
                        const avgSell1 = sellPrices1.reduce((a, b) => a + b, 0) / sellPrices1.length;
                        const avgBuy2 = buyPrices2.reduce((a, b) => a + b, 0) / buyPrices2.length;
                        if (avgSell1 > 0) { // Avoid division by zero
                            const rate = avgBuy2 / avgSell1; // How many units of currency2 for 1 unit of currency1
                            if (!rates[currency1][currency2] || rate > rates[currency1][currency2]) {
                                rates[currency1][currency2] = rate;
                            }
                            if (!rates[currency2][currency1] || (1 / rate) > rates[currency2][currency1]) {
                                rates[currency2][currency1] = 1 / rate;
                            }
                        }
                    }

                    // Scenario: Sell item in currency2, buy in currency1
                    if (sellPrices2.length > 0 && buyPrices1.length > 0) {
                        const avgSell2 = sellPrices2.reduce((a, b) => a + b, 0) / sellPrices2.length;
                        const avgBuy1 = buyPrices1.reduce((a, b) => a + b, 0) / buyPrices1.length;
                        if (avgSell2 > 0) { // Avoid division by zero
                            const rate = avgBuy1 / avgSell2; // How many units of currency1 for 1 unit of currency2
                            if (!rates[currency2][currency1] || rate > rates[currency2][currency1]) {
                                rates[currency2][currency1] = rate;
                            }
                            if (!rates[currency1][currency2] || (1 / rate) > rates[currency1][currency2]) {
                                rates[currency1][currency2] = 1 / rate;
                            }
                        }
                    }
                }
            }
        }

        // Floyd-Warshall to find transitive rates (best paths)
        for (const k of allCurrencies) {
            for (const i of allCurrencies) {
                for (const j of allCurrencies) {
                    if (rates[i][k] && rates[k][j]) {
                        const newRate = rates[i][k] * rates[k][j];
                        if (!rates[i][j] || newRate > rates[i][j]) {
                            rates[i][j] = newRate;
                        }
                    }
                }
            }
        }
        console.log('Exchange rates calculation completed');
        return rates;
    }

    function convertToBaseCurrency(amount, fromCurrency, baseCurrency, exchangeRates) {
        if (fromCurrency === baseCurrency) {
            return amount;
        }
        if (exchangeRates[fromCurrency] && exchangeRates[fromCurrency][baseCurrency] !== undefined && exchangeRates[fromCurrency][baseCurrency] !== 0) {
            return amount * exchangeRates[fromCurrency][baseCurrency];
        }
        console.warn(`No exchange rate found for ${fromCurrency} to ${baseCurrency}`);
        return null; // Indicate failure to convert
    }

    function calculateCrossCurrencyTrades(stores, sameIntermediateStore = false) {
        console.log('Starting calculateCrossCurrencyTrades with', stores.length, 'stores');
        console.log('Same intermediate store constraint:', sameIntermediateStore);
        const trades = [];
        
        try {
            const exchangeRates = calculateExchangeRates(stores);
            const baseCurrency = 'Crabbies';
            
            let loopCount = 0;
            let validTradesFound = 0;

            // Simple optimization: only process stores with selling offers
            for (const store1 of stores) {
                if (!hasValidOffers(store1)) continue;

                for (const offer1 of getSellingOffers(store1)) {
                    const tradeResults = findCrossCurrencyTradesForItem(
                        store1, offer1, stores, baseCurrency, loopCount, validTradesFound, sameIntermediateStore
                    );
                    
                    trades.push(...tradeResults.trades);
                    loopCount = tradeResults.loopCount;
                    validTradesFound = tradeResults.validTradesFound;
                    
                    // Add reasonable limit to prevent timeout
                    if (loopCount > 100000) {
                        console.log('Reached loop limit, stopping search to prevent timeout');
                        break;
                    }
                }
                if (loopCount > 100000) break;
            }
        } catch (error) {
            console.error('Error in calculateCrossCurrencyTrades:', error);
            console.error('Error stack:', error.stack);
            console.error('Error at line:', error.lineNumber);
        }
        
        console.log('calculateCrossCurrencyTrades completed. Total trades found:', trades.length);
        return trades;
    }

    function findCrossCurrencyTradesForItem(store1, offer1, stores, baseCurrency, loopCount, validTradesFound, sameIntermediateStore = false) {
        const trades = [];
        const itemA = offer1.ItemName;

        for (const store2 of stores) {
            if (!hasValidOffers(store2)) continue;
            if (!isValidStore2(store1, store2)) continue;

            for (const offer2 of getBuyingOffers(store2)) {
                if (offer2.ItemName !== itemA) continue;

                loopCount++;
                if (loopCount % 1000 === 0) {
                    console.log('Processed', loopCount, 'potential trade combinations...');
                }

                const step3Results = findStep3And4Trades(
                    store1, offer1, store2, offer2, stores, baseCurrency, validTradesFound, sameIntermediateStore
                );
                
                trades.push(...step3Results.trades);
                validTradesFound = step3Results.validTradesFound;
            }
        }

        return { trades, loopCount, validTradesFound };
    }

    function findStep3And4Trades(store1, offer1, store2, offer2, stores, baseCurrency, validTradesFound, sameIntermediateStore = false) {
        const trades = [];

        for (const store3 of stores) {
            if (!hasValidOffers(store3)) continue;

            // If same intermediate store is required, store3 must be the same as store2
            if (sameIntermediateStore && store3.Name !== store2.Name) continue;

            for (const offer3 of getSellingOffers(store3)) {
                if (store3.CurrencyName !== store2.CurrencyName) continue; // Quick currency filter

                for (const store4 of stores) {
                    if (!hasValidOffers(store4)) continue;
                    if (store3.Name === store4.Name) continue;
                    if (store4.CurrencyName !== baseCurrency) continue; // Quick currency filter

                    for (const offer4 of getBuyingOffers(store4)) {
                        if (offer4.ItemName !== offer3.ItemName) continue;

                        const trade = evaluateTradeOpportunity(
                            store1, offer1, store2, offer2, 
                            store3, offer3, store4, offer4, 
                            baseCurrency
                        );

                        if (trade) {
                            validTradesFound++;
                            if (validTradesFound <= 5) {
                                console.log('Valid trade found:', {
                                    itemA: trade.itemA,
                                    itemB: trade.itemB,
                                    store1: store1.Name,
                                    store2: store2.Name,
                                    store3: store3.Name,
                                    store4: store4.Name,
                                    profit: trade.totalProfitInBase
                                });
                            }
                            trades.push(trade);
                        }
                    }
                }
            }
        }

        return { trades, validTradesFound };
    }

    function hasValidOffers(store) {
        if (!store.AllOffers || !Array.isArray(store.AllOffers)) {
            console.warn('Store missing AllOffers:', store.Name);
            return false;
        }
        return true;
    }

    function getSellingOffers(store) {
        return store.AllOffers.filter(o => !o.Buying && o.Quantity > 0);
    }

    function getBuyingOffers(store) {
        return store.AllOffers.filter(o => o.Buying && o.Quantity > 0);
    }

    function isValidStore2(store1, store2) {
        return store1.Name !== store2.Name && store1.CurrencyName !== store2.CurrencyName;
    }

    function evaluateTradeOpportunity(store1, offer1, store2, offer2, store3, offer3, store4, offer4, baseCurrency) {
        // Check if this follows the required 4-step pattern
        if (!isValidTradePattern(store1, store2, store3, store4, baseCurrency)) {
            return null;
        }

        const prices = {
            costA_Crabbies: offer1.Price,
            revenueA_Alt: offer2.Price,
            costB_Alt: offer3.Price,
            revenueB_Crabbies: offer4.Price
        };

        if (!areValidPrices(prices)) {
            return null;
        }

        // Quick profit check before expensive quantity calculations
        const profitPerUnit = calculateProfitPerUnit(prices);
        if (profitPerUnit <= 0.01) {
            return null;
        }

        // Additional quick check: if theoretical max profit is too low, skip
        const maxPossibleUnits = Math.min(offer1.Quantity, offer2.Quantity, offer3.Quantity, offer4.Quantity);
        if (profitPerUnit * maxPossibleUnits < 1.0) {
            return null; // Skip trades with very low total profit potential
        }

        const quantities = calculateOptimalQuantities(
            offer1, offer2, offer3, offer4,
            store2, store4, prices
        );

        if (!quantities || quantities.finalItemAQty <= 0 || quantities.finalItemBQty <= 0) {
            return null;
        }

        // Calculate actual profit based on real quantities, not theoretical per-unit profit
        const totalCostItemA = quantities.finalItemAQty * prices.costA_Crabbies;
        const totalRevenueItemB = quantities.finalItemBQty * prices.revenueB_Crabbies;
        const totalProfit = totalRevenueItemB - totalCostItemA;
        const actualProfitPerUnit = quantities.finalItemAQty > 0 ? totalProfit / quantities.finalItemAQty : 0;
        
        if (!isFinite(totalProfit) || totalProfit <= 0) {
            return null;
        }

        return createTradeObject(
            offer1, offer2, offer3, offer4,
            store1, store2, store3, store4,
            quantities, actualProfitPerUnit, totalProfit, prices
        );
    }

    function isValidTradePattern(store1, store2, store3, store4, baseCurrency) {
        return (
            store1.CurrencyName === baseCurrency &&
            store2.CurrencyName !== baseCurrency &&
            store3.CurrencyName === store2.CurrencyName &&
            store4.CurrencyName === baseCurrency
        );
    }

    function areValidPrices(prices) {
        return Object.values(prices).every(price => price > 0);
    }

    function calculateProfitPerUnit(prices) {
        const { costA_Crabbies, revenueA_Alt, costB_Alt, revenueB_Crabbies } = prices;
        
        // For 1 unit of Item A:
        // 1. Spend costA_Crabbies to buy 1 Item A
        // 2. Sell 1 Item A for revenueA_Alt (in alt currency)
        // 3. With revenueA_Alt, buy (revenueA_Alt / costB_Alt) units of Item B
        // 4. Sell those units of Item B for (revenueA_Alt / costB_Alt) * revenueB_Crabbies
        
        const unitsOfBCanBuy = revenueA_Alt / costB_Alt;
        const finalCrabbiesFromB = unitsOfBCanBuy * revenueB_Crabbies;
        
        return finalCrabbiesFromB - costA_Crabbies;
    }

    function calculateOptimalQuantities(offer1, offer2, offer3, offer4, store2, store4, prices) {
        // In a cross-currency trade, quantities are linked:
        // If we buy N units of Item A, we get N * revenueA_Alt in alt currency
        // With that alt currency, we can buy (N * revenueA_Alt / costB_Alt) units of Item B
        
        // Constraints on Item A quantity:
        const maxItemAAvailable = offer1.Quantity; // Step 1: How many Item A can we buy
        const maxItemAStoreDemands = offer2.Quantity; // Step 2: How many Item A store wants
        const store2Balance = store2.Balance || 0;
        const store2CanAfford = prices.revenueA_Alt > 0 ? 
            Math.floor(store2Balance / prices.revenueA_Alt) : 0; // Step 2: How many Item A store can afford
        
        // Find the maximum Item A we can process through steps 1 and 2
        const maxItemAFromSteps12 = Math.min(maxItemAAvailable, maxItemAStoreDemands, store2CanAfford);
        
        if (maxItemAFromSteps12 <= 0) return null;
        
        // Calculate what Item B quantity we'd get if we buy maxItemAFromSteps12 units of Item A
        const altCurrencyFromMaxA = maxItemAFromSteps12 * prices.revenueA_Alt;
        const itemBFromMaxA = Math.floor(altCurrencyFromMaxA / prices.costB_Alt);
        
        // Constraints on Item B quantity:
        const maxItemBAvailable = offer3.Quantity; // Step 3: How many Item B can we buy
        const maxItemBStoreDemands = offer4.Quantity; // Step 4: How many Item B store wants
        const store4Balance = store4.Balance || 0;
        const store4CanAfford = prices.revenueB_Crabbies > 0 ? 
            Math.floor(store4Balance / prices.revenueB_Crabbies) : 0; // Step 4: How many Item B store can afford
            
        const maxItemBFromSteps34 = Math.min(maxItemBAvailable, maxItemBStoreDemands, store4CanAfford);
        
        if (maxItemBFromSteps34 <= 0) return null;
        
        // Determine the bottleneck: either we're limited by Item A constraints or Item B constraints
        let finalItemAQty, finalItemBQty;
        
        if (itemBFromMaxA <= maxItemBFromSteps34) {
            // We're limited by Item A constraints - use max Item A
            finalItemAQty = maxItemAFromSteps12;
            finalItemBQty = itemBFromMaxA;
        } else {
            // We're limited by Item B constraints - work backwards
            finalItemBQty = maxItemBFromSteps34;
            // Calculate how much Item A we need to get exactly finalItemBQty units of Item B
            const itemANeeded = prices.revenueA_Alt > 0 ? 
                Math.ceil(finalItemBQty * prices.costB_Alt / prices.revenueA_Alt) : 0;
            finalItemAQty = Math.min(itemANeeded, maxItemAFromSteps12);
            
            // Important: Don't recalculate Item B quantity - we're constrained by Step 4
            // The finalItemBQty should remain as maxItemBFromSteps34
            // Any excess alt currency from Item A will be wasted
        }

        if (finalItemAQty <= 0 || finalItemBQty <= 0) return null;

        return {
            finalItemAQty,
            finalItemBQty,
            store2CanAfford,
            store4CanAfford,
            altCurrencyEarned: finalItemAQty * prices.revenueA_Alt,
            altCurrencyNeeded: finalItemBQty * prices.costB_Alt
        };
    }

    function createTradeObject(offer1, offer2, offer3, offer4, store1, store2, store3, store4, quantities, profitPerUnit, totalProfit, prices) {
        return {
            itemA: offer1.ItemName,
            buyAFrom: store1.Name,
            buyAFromOwner: store1.Owner || 'Unknown',
            buyAPrice: offer1.Price,
            buyACurrency: store1.CurrencyName,
            sellATo: store2.Name,
            sellAToOwner: store2.Owner || 'Unknown',
            sellAPrice: offer2.Price,
            sellACurrency: store2.CurrencyName,
            itemB: offer3.ItemName,
            buyBFrom: store3.Name,
            buyBFromOwner: store3.Owner || 'Unknown',
            buyBPrice: offer3.Price,
            buyBCurrency: store3.CurrencyName,
            sellBTo: store4.Name,
            sellBToOwner: store4.Owner || 'Unknown',
            sellBPrice: offer4.Price,
            sellBCurrency: store4.CurrencyName,
            totalProfitInBase: totalProfit,
            profitPerUnit: profitPerUnit,
            qtyToBuyStep1: quantities.finalItemAQty,
            qtyToBuyStep3: quantities.finalItemBQty,
            store1Balance: store1.Balance || 0,
            store2Balance: store2.Balance || 0,
            store3Balance: store3.Balance || 0,
            store4Balance: store4.Balance || 0,
            store2CanAfford: quantities.store2CanAfford,
            store4CanAfford: quantities.store4CanAfford,
            altCurrencyEarned: quantities.altCurrencyEarned,
            altCurrencyNeeded: quantities.altCurrencyNeeded,
            itemAAvailable: offer1.Quantity,
            itemAWanted: offer2.Quantity,
            itemBAvailable: offer3.Quantity,
            itemBWanted: offer4.Quantity
        };
    }

    function displayCrossCurrencyTrades(trades) {
        console.log('Starting displayCrossCurrencyTrades with', trades.length, 'trades');
        
        // First, ensure the table structure exists
        const tradesContainer = document.getElementById('trades-container');
        if (!tradesContainer) {
            console.error('Could not find trades-container element');
            return;
        }
        
        // Restore the table structure if it's missing
        if (!document.querySelector('#trades-table')) {
            tradesContainer.innerHTML = `
                <table id="trades-table">
                    <thead>
                        <tr>
                            <th>Step 1: Buy Item A</th>
                            <th>Step 2: Sell Item A</th>
                            <th>Step 3: Buy Item B</th>
                            <th>Step 4: Sell Item B</th>
                            <th>Qty to Buy (Step 1)</th>
                            <th>Qty to Buy (Step 3)</th>
                            <th>Total Profit (Crabbies)</th>
                            <th>Profit per Unit</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            `;
        }
        
        const tableBody = document.querySelector('#trades-table tbody');
        
        if (!tableBody) {
            console.error('Could not find #trades-table tbody element even after recreation');
            tradesContainer.innerHTML = `<p>Error: Could not create table structure. Found ${trades.length} trades but cannot display them.</p>`;
            return;
        }
        
        tableBody.innerHTML = '';

        if (trades.length === 0) {
            console.log('No trades to display');
            tableBody.innerHTML = '<tr><td colspan="8">No profitable cross-currency trades found with current filters.</td></tr>';
            return;
        }

        // Sort trades by profit (highest first)
        trades.sort((a, b) => b.totalProfitInBase - a.totalProfitInBase);
        console.log('Trades sorted by profit');

        trades.forEach((trade, index) => {
            if (index < 3) {
                console.log(`Displaying trade ${index + 1}:`, trade);
                console.log(`Store balances - 1: ${trade.store1Balance} (${typeof trade.store1Balance}), 2: ${trade.store2Balance} (${typeof trade.store2Balance}), 3: ${trade.store3Balance} (${typeof trade.store3Balance}), 4: ${trade.store4Balance} (${typeof trade.store4Balance})`);
            }

            const row = document.createElement('tr');

            // Determine if store balances are limiting factors
            const step2Warning = trade.store2CanAfford < trade.qtyToBuyStep1 ?
                `<br><span style="color: orange;">⚠️ Store can only afford ${trade.store2CanAfford} units</span>` : '';

            const step4Warning = trade.store4CanAfford < trade.qtyToBuyStep3 ?
                `<br><span style="color: orange;">⚠️ Store can only afford ${trade.store4CanAfford} units</span>` : '';

            // Check for alt currency balance
            const altCurrencyBalance = trade.altCurrencyEarned >= trade.altCurrencyNeeded ? '' :
                `<br><span style="color: red;">⚠️ Insufficient alt currency: need ${trade.altCurrencyNeeded.toFixed(1)}, have ${trade.altCurrencyEarned.toFixed(1)}</span>`;

            row.innerHTML = `
                <td>${formatItemDisplay(trade.itemA, trade.qtyToBuyStep1)}<br>From: ${trade.buyAFrom}<br>Owner: ${formatStoreOwner(trade.buyAFromOwner)}<br>Price: ${trade.buyAPrice.toFixed(2)} ${trade.buyACurrency}<br><small>Store Balance: ${Number(trade.store1Balance || 0).toFixed(0)} ${trade.buyACurrency}<br>Available: ${trade.itemAAvailable || 'N/A'}</small></td>
                <td>${formatItemDisplay(trade.itemA, trade.qtyToBuyStep1)}<br>To: ${trade.sellATo}<br>Owner: ${formatStoreOwner(trade.sellAToOwner)}<br>Price: ${trade.sellAPrice.toFixed(2)} ${trade.sellACurrency}<br><small>Store Balance: ${Number(trade.store2Balance || 0).toFixed(0)} ${trade.sellACurrency}<br>Wants: ${trade.itemAWanted || 'N/A'}</small>${step2Warning}</td>
                <td>${formatItemDisplay(trade.itemB, trade.qtyToBuyStep3)}<br>From: ${trade.buyBFrom}<br>Owner: ${formatStoreOwner(trade.buyBFromOwner)}<br>Price: ${trade.buyBPrice.toFixed(2)} ${trade.buyBCurrency}<br><small>Store Balance: ${Number(trade.store3Balance || 0).toFixed(0)} ${trade.buyBCurrency}<br>Available: ${trade.itemBAvailable || 'N/A'}</small>${altCurrencyBalance}</td>
                <td>${formatItemDisplay(trade.itemB, trade.qtyToBuyStep3)}<br>To: ${trade.sellBTo}<br>Owner: ${formatStoreOwner(trade.sellBToOwner)}<br>Price: ${trade.sellBPrice.toFixed(2)} ${trade.sellBCurrency}<br><small>Store Balance: ${Number(trade.store4Balance || 0).toFixed(0)} ${trade.sellBCurrency}<br>Wants: ${trade.itemBWanted || 'N/A'}</small>${step4Warning}</td>
                <td>${trade.qtyToBuyStep1}</td>
                <td>${trade.qtyToBuyStep3}</td>
                <td>${trade.totalProfitInBase.toFixed(2)}</td>
                <td>${trade.profitPerUnit.toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });
        console.log('displayCrossCurrencyTrades completed successfully');
    }

    refreshBtn.addEventListener('click', fetchData);
    applyFiltersBtn.addEventListener('click', () => {
        savePreferences();
        applyFilters();
    });
    sameIntermediateStoreCheckbox.addEventListener('change', () => {
        savePreferences();
        fetchData();
    });
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        savePreferences();
    });
    minProfitInput.addEventListener('input', savePreferences);
    
    // Server URL input event listeners
    serverUrlInput.addEventListener('change', handleServerUrlChange);
    serverUrlInput.addEventListener('blur', handleServerUrlChange);

    // Load preferences on page load
    loadPreferences();

    // Show proxy notice if using HTTPS
    if (USE_CORS_PROXY) {
        const proxyNotice = document.getElementById('proxy-notice');
        if (proxyNotice) {
            proxyNotice.style.display = 'block';
        }
    }

    // Initial server info fetch
    fetchServerInfo();

    // Initial data fetch
    fetchData();
});