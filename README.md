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
- Option to limit trades to same intermediate stores

### Additional Features
- **Dark Mode**: Toggle between light and dark themes
- **Server Configuration**: Connect to different Eco servers
- **Data Persistence**: Saves your preferences and filters
- **Online Status**: Shows which store owners are currently online
- **Item Information**: Displays stack sizes, weight, and carrying requirements
- **Store Balance Warnings**: Alerts when stores may not afford full trades

## Usage

1. **Configure Server**: Enter your Eco server URL in the server configuration field
2. **Choose Trade Type**: 
   - Use the main page for single currency trades
   - Switch to "Cross-Currency Arbitrage" for multi-currency opportunities
3. **Set Filters**: Adjust minimum profit, quantity ranges, and other preferences
4. **Analyze Results**: Review the trade opportunities sorted by profitability

## Requirements

- Modern web browser with JavaScript enabled
- Access to an Eco server with the EcoPriceCalculator plugin

## Getting Started

1. Open `index.html` in your web browser
2. Enter your Eco server URL (e.g., `http://your-server:3011`)
3. Click "Refresh Data" to load current market information
4. Use the filters to find trades that match your criteria

## Demo

Visit the live version at: [https://rejdukien.github.io/Eco-Trade-Helper/](https://rejdukien.github.io/Eco-Trade-Helper/)

## License

Open source project - feel free to contribute or modify for your own use.
