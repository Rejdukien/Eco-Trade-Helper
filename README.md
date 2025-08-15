# Eco Trade Helper

A web-based tool for finding profitable trading opportunities in the Eco game. Helps players identify arbitrage opportunities within single currencies and across different currencies.

## Features

### Single Currency Trades
- Find profitable buy/sell opportunities within the same currency
- Filter by minimum profit, quantity ranges, and store names
- Hide trades with warnings or adjust for store balance limitations
- Sort by profit, total profit, or quantity

### Cross-Currency Arbitrage
- Discover multi-step trading opportunities across different currencies
- Configurable base currency for profit calculations
- Option to limit trades to same intermediate stores (3-step instead of 4-step trade)

### FX Rate Arbitrage (New)
- New page: `fx_arbitrage.html` for user-provided FX conversion checks
- Currency dropdowns populated from the server (select Currency A and Currency B)
- Specify a conversion ratio (Rate A : Rate B) via two inputs for easier entry
- Lists all one-hop trades that become profitable with the provided FX rate:
  - Buy with A and sell for B (A → B)
  - Buy with B and sell for A (B → A)
- Results include store info, balances and online indicators consistent with other pages

## Proxy & CORS
- Only required if you wish to publicly host this.
- When served from HTTPS (e.g. GitHub Pages) the app uses CORS proxies to access HTTP game servers.
- The repo includes a simple PHP proxy `proxy.php` you can host (recommended) to avoid public proxy reliability/CORS issues.
  - `proxy.php` sets CORS headers for `https://rejdukien.github.io` and forwards requests to allowed hosts.
  - Host it on any PHP-enabled server and add its URL as the primary proxy in `script.js`, `cross_currency.js`, and `fx_arbitrage.js`.
- The code also uses a fallback list of public proxies if a custom proxy isn't available.

## Usage
1. Open `index.html`, `cross_currency.html` or `fx_arbitrage.html`.
2. Enter your Eco server URL in the Server URL field (defaults to `http://148.251.154.60:3011`, GreenLeaf Main).
3. Click Refresh Data to fetch stores/items.
4. Use filters, set min profit, and toggle dark mode as needed.
5. For FX arbitrage: select currencies, set the rate, then view profitable one-hop conversions.

## Development & Contribution
- Static HTML/JS/CSS — open in a browser or host on GitHub Pages.
- To add a reliable proxy: upload `proxy.php` to a PHP host and update the `CORS_PROXIES` arrays.
- Contributions and issues are welcome — see the GitHub project:
  https://github.com/Rejdukien/Eco-Trade-Helper

## Notes
- "Liquidity constrained" indicates a trade limited by store balances (any step).  
- "Buyer limited by balance" specifically means the buyer in the trade lacks funds for

## Demo
Visit the live version at: https://rejdukien.github.io/Eco-Trade-Helper/