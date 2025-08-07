document.addEventListener('DOMContentLoaded', () => {
    const tradesContainer = document.getElementById('trades-container');
    const DEFAULT_BASE_URL = 'http://148.251.154.60:3011';
    const CORS_PROXY = 'https://proxy.cors.sh/';
    const USE_CORS_PROXY = window.location.protocol === 'https:';
    
    let baseApiUrl = DEFAULT_BASE_URL;
    let apiUrl = `${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/stores`;
    let itemsApiUrl = `${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/allItems`;
    let infoApiUrl = `${baseApiUrl}/info`;
    
    const filterInput = document.getElementById('filter');
    const sortSelect = document.getElementById('sort');
    const minProfitInput = document.getElementById('min-profit');
    const minQuantityInput = document.getElementById('min-quantity');
    const maxQuantityInput = document.getElementById('max-quantity');
    const hideWarningsCheckbox = document.getElementById('hide-warnings');
    const correctProfitCheckbox = document.getElementById('correct-profit');
    const currencyFilter = document.getElementById('currency-filter');
    const storeFilterInput = document.getElementById('store-filter');
    const refreshBtn = document.getElementById('refresh-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const serverUrlInput = document.getElementById('server-url');
    const serverNameSpan = document.getElementById('server-name');
    
    let allTrades = [];
    let allStores = [];
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
        const savedFilters = {
            filter: localStorage.getItem('ecoTradeHelper_singleCurrency_filter'),
            sort: localStorage.getItem('ecoTradeHelper_singleCurrency_sort'),
            minProfit: localStorage.getItem('ecoTradeHelper_singleCurrency_minProfit'),
            minQuantity: localStorage.getItem('ecoTradeHelper_singleCurrency_minQuantity'),
            maxQuantity: localStorage.getItem('ecoTradeHelper_singleCurrency_maxQuantity'),
            hideWarnings: localStorage.getItem('ecoTradeHelper_singleCurrency_hideWarnings') === 'true',
            correctProfit: localStorage.getItem('ecoTradeHelper_singleCurrency_correctProfit') === 'true',
            currency: localStorage.getItem('ecoTradeHelper_singleCurrency_currency'),
            storeFilter: localStorage.getItem('ecoTradeHelper_singleCurrency_storeFilter')
        };

        // Apply saved values
        if (savedFilters.filter !== null) filterInput.value = savedFilters.filter;
        if (savedFilters.sort !== null) sortSelect.value = savedFilters.sort;
        if (savedFilters.minProfit !== null) minProfitInput.value = savedFilters.minProfit;
        if (savedFilters.minQuantity !== null) minQuantityInput.value = savedFilters.minQuantity;
        if (savedFilters.maxQuantity !== null) maxQuantityInput.value = savedFilters.maxQuantity;
        if (savedFilters.hideWarnings) hideWarningsCheckbox.checked = true;
        if (savedFilters.correctProfit) correctProfitCheckbox.checked = true;
        if (savedFilters.storeFilter !== null) storeFilterInput.value = savedFilters.storeFilter;
        
        // Currency filter will be set after currencies are loaded
        if (savedFilters.currency !== null) {
            setTimeout(() => {
                currencyFilter.value = savedFilters.currency;
            }, 100);
        }
    }

    // Save preferences to localStorage
    function savePreferences() {
        localStorage.setItem('ecoTradeHelper_darkMode', document.body.classList.contains('dark-mode'));
        localStorage.setItem('ecoTradeHelper_singleCurrency_filter', filterInput.value);
        localStorage.setItem('ecoTradeHelper_singleCurrency_sort', sortSelect.value);
        localStorage.setItem('ecoTradeHelper_singleCurrency_minProfit', minProfitInput.value);
        localStorage.setItem('ecoTradeHelper_singleCurrency_minQuantity', minQuantityInput.value);
        localStorage.setItem('ecoTradeHelper_singleCurrency_maxQuantity', maxQuantityInput.value);
        localStorage.setItem('ecoTradeHelper_singleCurrency_hideWarnings', hideWarningsCheckbox.checked);
        localStorage.setItem('ecoTradeHelper_singleCurrency_correctProfit', correctProfitCheckbox.checked);
        localStorage.setItem('ecoTradeHelper_singleCurrency_currency', currencyFilter.value);
        localStorage.setItem('ecoTradeHelper_singleCurrency_storeFilter', storeFilterInput.value);
    }

    // Update API URLs when server URL changes
    function updateApiUrls() {
        if (USE_CORS_PROXY) {
            apiUrl = `${CORS_PROXY}${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/stores`;
            itemsApiUrl = `${CORS_PROXY}${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/allItems`;
            infoApiUrl = `${CORS_PROXY}${baseApiUrl}/info`;
        } else {
            apiUrl = `${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/stores`;
            itemsApiUrl = `${baseApiUrl}/api/v1/plugins/EcoPriceCalculator/allItems`;
            infoApiUrl = `${baseApiUrl}/info`;
        }
    }

    // Fetch server info and update display
    async function fetchServerInfo() {
        try {
            const url = USE_CORS_PROXY ? `${CORS_PROXY}${baseApiUrl}/info` : `${baseApiUrl}/info`;
            console.log('Fetching server info from:', url);
            
            const fetchOptions = {};
            if (USE_CORS_PROXY) {
                fetchOptions.headers = {
                    'Origin': 'https://rejdukien.github.io'
                };
            }
            
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('Raw response:', text.substring(0, 200));
            
            const data = JSON.parse(text);
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
        // Use the pre-constructed URLs from updateApiUrls()
        console.log('Fetching data from URLs:', { apiUrl, itemsApiUrl, infoApiUrl });
        
        const fetchOptions = {};
        if (USE_CORS_PROXY) {
            fetchOptions.headers = {
                'Origin': 'https://rejdukien.github.io'
            };
        }
        
        Promise.all([
            fetch(infoApiUrl, fetchOptions).then(response => response.json()).catch(() => ({ OnlinePlayersNames: [] })),
            fetch(apiUrl, fetchOptions).then(response => response.json()),
            fetch(itemsApiUrl, fetchOptions).then(response => response.json())
        ])
            .then(([infoData, storesData, itemsData]) => {
                // Update server info
                onlinePlayerNames = infoData.OnlinePlayersNames || [];
                
                const rawServerName = infoData.Description ? `${infoData.Description}` : 'Unknown Server';
                // Filter out color tags like <#59e817>
                const serverName = rawServerName.replace(/<#[0-9a-fA-F]{6}>/g, '').trim();
                serverNameSpan.textContent = `Server: ${serverName}`;
                serverNameSpan.style.color = '#4CAF50';
                
                // Process store and item data
                allStores = storesData.Stores;
                allItems = itemsData.AllItems;
                const currencies = [...new Set(allStores.map(store => store.CurrencyName))];
                populateCurrencyFilter(currencies);
                allTrades = calculateTrades(allStores);
                filterAndSortTrades();
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                serverNameSpan.textContent = 'Server: Connection failed';
                serverNameSpan.style.color = '#f44336';
                tradesContainer.innerHTML = '<p>Error loading trade data. Please try again later.</p>';
            });
    }

    function calculateTrades(stores) {
        const trades = [];
        for (let i = 0; i < stores.length; i++) {
            for (let j = 0; j < stores.length; j++) {
                if (i === j) continue;

                const storeA = stores[i];
                const storeB = stores[j];

                if (storeA.CurrencyName !== storeB.CurrencyName) continue;

                if (storeA.Balance === 0 || storeB.Balance === 0) continue;

                const storeASells = storeA.AllOffers.filter(o => !o.Buying && o.Quantity > 0);
                const storeBBuys = storeB.AllOffers.filter(o => o.Buying && o.Quantity > 0);

                for (const itemA of storeASells) {
                    for (const itemB of storeBBuys) {
                        if (itemA.ItemName === itemB.ItemName) {
                            const profit = itemB.Price - itemA.Price;
                            if (profit > 0) {
                                const maxTrade = Math.min(itemA.Quantity, itemB.Quantity);
                                if (maxTrade > 0) {
                                    const warnings = [];
                                    if (maxTrade < 10) {
                                        warnings.push('Low liquidity');
                                    }
                                    if (storeB.Balance < itemB.Price * maxTrade) {
                                        const affordableQty = Math.floor(storeB.Balance / itemB.Price);
                                        warnings.push(`Buyer may not have enough funds (Balance: ${storeB.Balance.toFixed(2)}, Can afford: ${affordableQty})`);
                                    }

                                    trades.push({
                                        item: itemA.ItemName,
                                        buyFrom: storeA.Name,
                                        sellTo: storeB.Name,
                                        buyPrice: itemA.Price,
                                        sellPrice: itemB.Price,
                                        profit: profit,
                                        sellerQuantity: itemA.Quantity,
                                        buyerQuantity: itemB.Quantity,
                                        sellableQuantity: maxTrade,
                                        totalProfit: profit * maxTrade,
                                        warnings: warnings,
                                        currency: storeA.CurrencyName,
                                        sellerBalance: storeA.Balance,
                                        buyerBalance: storeB.Balance,
                                        sellerOwner: storeA.Owner,
                                        buyerOwner: storeB.Owner
                                    });
                                }
                            }
                       }
                   }
               }
            }
        }
        return trades;
    }

    function displayTrades(trades) {
        const tableBody = document.querySelector('#trades-table tbody');
        const totalProfitContainer = document.getElementById('total-profit-container');
        tableBody.innerHTML = '';
        totalProfitContainer.innerHTML = '';

        if (trades.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9">No profitable trades found at the moment.</td></tr>';
            return;
        }

        let overallTotalProfit = 0;

        trades.forEach(trade => {
            const totalProfit = trade.profit * trade.sellableQuantity;
            overallTotalProfit += totalProfit;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatItemDisplay(trade.item, trade.sellableQuantity)}</td>
                <td>${trade.buyFrom}<br><small>Owner: ${formatStoreOwner(trade.sellerOwner || 'N/A')}<br>Balance: ${trade.sellerBalance.toFixed(2)} ${trade.currency}<br>Available: ${trade.sellerQuantity}</small></td>
                <td>${trade.sellTo}<br><small>Owner: ${formatStoreOwner(trade.buyerOwner || 'N/A')}<br>Balance: ${trade.buyerBalance.toFixed(2)} ${trade.currency}<br>Wants: ${trade.buyerQuantity}</small></td>
                <td>${trade.buyPrice.toFixed(2)}</td>
                <td>${trade.sellPrice.toFixed(2)}</td>
                <td>${trade.profit.toFixed(2)}</td>
                <td>${trade.sellableQuantity}</td>
                <td>${trade.totalProfit.toFixed(2)}</td>
                <td>${trade.warnings.join(', ')}</td>
            `;
            tableBody.appendChild(row);
        });

        totalProfitContainer.innerHTML = `<h3>Total Profit: ${overallTotalProfit.toFixed(2)}</h3>`;
    }

    function populateCurrencyFilter(currencies) {
        currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = currency;
            currencyFilter.appendChild(option);
        });
        
        // Apply saved currency preference or default to Crabbies
        const savedCurrency = localStorage.getItem('ecoTradeHelper_singleCurrency_currency');
        if (savedCurrency && currencies.includes(savedCurrency)) {
            currencyFilter.value = savedCurrency;
        } else if (currencies.includes('Crabbies')) {
            currencyFilter.value = 'Crabbies';
        }
    }

    function filterAndSortTrades() {
        let filteredTrades = allTrades;

        // Filter by currency
        const selectedCurrency = currencyFilter.value;
        if (selectedCurrency) {
            filteredTrades = filteredTrades.filter(trade => trade.currency === selectedCurrency);
        }

        // Filter by item name
        filteredTrades = filteredTrades.filter(trade => trade.item.toLowerCase().includes(filterInput.value.toLowerCase()));

        // Filter by store name
        const storeFilter = storeFilterInput.value.toLowerCase();
        if (storeFilter) {
            filteredTrades = filteredTrades.filter(trade =>
                trade.buyFrom.toLowerCase().includes(storeFilter) ||
                trade.sellTo.toLowerCase().includes(storeFilter)
            );
        }

        // Filter by min total profit
        const minProfit = parseFloat(minProfitInput.value);
        if (!isNaN(minProfit)) {
            filteredTrades = filteredTrades.filter(trade => trade.totalProfit >= minProfit);
        }

        // Filter by quantity range
        const minQty = parseInt(minQuantityInput.value);
        const maxQty = parseInt(maxQuantityInput.value);
        if (!isNaN(minQty)) {
            filteredTrades = filteredTrades.filter(trade => trade.sellableQuantity >= minQty);
        }
        if (!isNaN(maxQty)) {
            filteredTrades = filteredTrades.filter(trade => trade.sellableQuantity <= maxQty);
        }

        // Filter by warnings
        if (hideWarningsCheckbox.checked) {
            filteredTrades = filteredTrades.filter(trade => trade.warnings.length === 0);
        }

        // Correct for buyer funds
        if (correctProfitCheckbox.checked) {
            filteredTrades = filteredTrades.map(trade => {
                const affordableQty = Math.floor(trade.buyerBalance / trade.sellPrice);
                if (trade.sellableQuantity > affordableQty) {
                    const newSellable = affordableQty;
                    return {
                        ...trade,
                        sellableQuantity: newSellable,
                        totalProfit: trade.profit * newSellable,
                        warnings: [...trade.warnings, `Quantity adjusted to ${newSellable} due to funds`]
                    };
                }
                return trade;
            });
        }

        // Sort
        if (sortSelect.value === 'profit') {
            filteredTrades.sort((a, b) => b.profit - a.profit);
        } else if (sortSelect.value === 'totalProfit') {
            filteredTrades.sort((a, b) => b.totalProfit - a.totalProfit);
        } else if (sortSelect.value === 'quantity') {
            filteredTrades.sort((a, b) => b.sellableQuantity - a.sellableQuantity);
        }

        displayTrades(filteredTrades);
    }

    filterInput.addEventListener('input', () => {
        savePreferences();
        filterAndSortTrades();
    });
    sortSelect.addEventListener('change', () => {
        savePreferences();
        filterAndSortTrades();
    });
    minProfitInput.addEventListener('input', () => {
        savePreferences();
        filterAndSortTrades();
    });
    minQuantityInput.addEventListener('input', () => {
        savePreferences();
        filterAndSortTrades();
    });
    maxQuantityInput.addEventListener('input', () => {
        savePreferences();
        filterAndSortTrades();
    });
    hideWarningsCheckbox.addEventListener('change', () => {
        savePreferences();
        filterAndSortTrades();
    });
    correctProfitCheckbox.addEventListener('change', () => {
        savePreferences();
        filterAndSortTrades();
    });
    currencyFilter.addEventListener('change', () => {
        savePreferences();
        filterAndSortTrades();
    });
    storeFilterInput.addEventListener('input', () => {
        savePreferences();
        filterAndSortTrades();
    });
    refreshBtn.addEventListener('click', fetchData);
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        savePreferences();
    });
    
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