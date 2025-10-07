/**
 * Georgian Lari Exchange Rates Application
 * Fetches and displays exchange rates from the National Bank of Georgia
 */

class ExchangeRatesApp {
	constructor() {
		// DOM Elements
		this.elements = {
			currentDate: document.getElementById('current-date'),
			searchInput: document.getElementById('currency-search'),
			refreshBtn: document.getElementById('refresh-btn'),
			loadingState: document.getElementById('loading-state'),
			errorState: document.getElementById('error-state'),
			errorMessage: document.getElementById('error-message'),
			retryBtn: document.getElementById('retry-btn'),
			tableContainer: document.getElementById('table-container'),
			currencyTable: document.getElementById('currency-table'),
			currencyTableBody: document.getElementById('currency-table-body'),
			noResults: document.getElementById('no-results'),
			lastUpdated: document.getElementById('last-updated')
		};

		// Application state
		this.state = {
			currencies: [],
			filteredCurrencies: [],
			isLoading: false,
			lastUpdated: null,
			sortColumn: null,
			sortDirection: 'asc'
		};

		// Configuration
		this.config = {
			apiBaseUrl: 'https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/',
			retryDelay: 3000,
			maxRetries: 3,
			debounceDelay: 300
		};

		this.init();
	}

	/**
	 * Initialize the application
	 */
	init() {
		this.setupEventListeners();
		this.updateCurrentDate();
		this.loadExchangeRates();
	}

	/**
	 * Set up all event listeners
	 */
	setupEventListeners() {
		// Search functionality with debouncing
		this.elements.searchInput.addEventListener('input', 
			this.debounce(this.handleSearch.bind(this), this.config.debounceDelay)
		);

		// Refresh button
		this.elements.refreshBtn.addEventListener('click', () => {
			this.loadExchangeRates();
		});

		// Retry button
		this.elements.retryBtn.addEventListener('click', () => {
			this.loadExchangeRates();
		});

		// Table sorting
		this.elements.currencyTable.addEventListener('click', (e) => {
			if (e.target.closest('th.sortable')) {
				const th = e.target.closest('th.sortable');
				const column = th.dataset.sort;
				this.handleSort(column);
			}
		});

		// Keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			if (e.ctrlKey && e.key === 'r') {
				e.preventDefault();
				this.loadExchangeRates();
			} else if (e.ctrlKey && e.key === 'f') {
				e.preventDefault();
				this.elements.searchInput.focus();
			}
		});
	}

	/**
	 * Update the current date display
	 */
	updateCurrentDate() {
		const today = new Date();
		const options = { 
			weekday: 'long', 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric' 
		};
		this.elements.currentDate.textContent = today.toLocaleDateString('en-US', options);
	}

	/**
	 * Load exchange rates from the API
	 */
	async loadExchangeRates(retryCount = 0) {
		if (this.state.isLoading) return;

		this.state.isLoading = true;
		this.showLoadingState();

		try {
			const today = new Date();
			const formattedDate = today.toISOString().split('T')[0];
			const apiUrl = `${this.config.apiBaseUrl}?date=${formattedDate}`;

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

			const response = await fetch(apiUrl, {
				signal: controller.signal,
				headers: {
					'Accept': 'application/json',
					'Cache-Control': 'no-cache'
				}
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
			}

			const data = await response.json();
			this.processCurrencyData(data);
			this.state.lastUpdated = new Date();
			this.updateLastUpdatedDisplay();
			this.showSuccessState();

		} catch (error) {
			console.error('Error loading exchange rates:', error);

			if (retryCount < this.config.maxRetries) {
				setTimeout(() => {
					this.loadExchangeRates(retryCount + 1);
				}, this.config.retryDelay);
				return;
			}

			this.showErrorState(error.message);
		} finally {
			this.state.isLoading = false;
		}
	}

	/**
	 * Process and store currency data
	 */
	processCurrencyData(data) {
		if (!data || !Array.isArray(data) || data.length === 0) {
			throw new Error('Invalid data format received from API');
		}

		const currencies = data[0]?.currencies || [];
		if (currencies.length === 0) {
			throw new Error('No currency data available');
		}

		// Enhance currency data with additional properties
		this.state.currencies = currencies.map(currency => ({
			...currency,
			rateNumeric: parseFloat(currency.rate) || 0,
			diffNumeric: parseFloat(currency.diff) || 0,
			quantityNumeric: parseInt(currency.quantity) || 1,
			searchText: `${currency.code} ${currency.name}`.toLowerCase()
		}));

		this.state.filteredCurrencies = [...this.state.currencies];
		this.renderTable();
	}

	/**
	 * Handle search input
	 */
	handleSearch(event) {
		const searchTerm = event.target.value.toLowerCase().trim();

		if (!searchTerm) {
			this.state.filteredCurrencies = [...this.state.currencies];
		} else {
			this.state.filteredCurrencies = this.state.currencies.filter(currency =>
				currency.searchText.includes(searchTerm)
			);
		}

		this.renderTable();
	}

	/**
	 * Handle table sorting
	 */
	handleSort(column) {
		if (this.state.sortColumn === column) {
			this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			this.state.sortColumn = column;
			this.state.sortDirection = 'asc';
		}

		this.sortCurrencies();
		this.updateSortIndicators();
		this.renderTable();
	}

	/**
	 * Sort currencies based on current sort settings
	 */
	sortCurrencies() {
		const { sortColumn, sortDirection } = this.state;
		const multiplier = sortDirection === 'asc' ? 1 : -1;

		this.state.filteredCurrencies.sort((a, b) => {
			let valueA, valueB;

			switch (sortColumn) {
				case 'code':
					valueA = a.code;
					valueB = b.code;
					break;
				case 'quantity':
					valueA = a.quantityNumeric;
					valueB = b.quantityNumeric;
					break;
				case 'rate':
					valueA = a.rateNumeric;
					valueB = b.rateNumeric;
					break;
				case 'change':
					valueA = a.diffNumeric;
					valueB = b.diffNumeric;
					break;
				default:
					return 0;
			}

			if (typeof valueA === 'string') {
				return valueA.localeCompare(valueB) * multiplier;
			} else {
				return (valueA - valueB) * multiplier;
			}
		});
	}

	/**
	 * Update sort indicators in table headers
	 */
	updateSortIndicators() {
		// Reset all indicators
		this.elements.currencyTable.querySelectorAll('th[aria-sort]').forEach(th => {
			th.setAttribute('aria-sort', 'none');
		});

		// Set current sort indicator
		if (this.state.sortColumn) {
			const currentHeader = this.elements.currencyTable
				.querySelector(`th[data-sort="${this.state.sortColumn}"]`);
			if (currentHeader) {
				currentHeader.setAttribute('aria-sort', this.state.sortDirection === 'asc' ? 'ascending' : 'descending');
			}
		}
	}

	/**
	 * Render the currency table
	 */
	renderTable() {
		const currencies = this.state.filteredCurrencies;

		if (currencies.length === 0) {
			this.elements.noResults.style.display = 'block';
			this.elements.tableContainer.style.display = 'none';
			return;
		}

		this.elements.noResults.style.display = 'none';
		this.elements.tableContainer.style.display = 'block';

		// Clear existing rows
		this.elements.currencyTableBody.innerHTML = '';

		// Create document fragment for better performance
		const fragment = document.createDocumentFragment();

		currencies.forEach((currency, index) => {
			const row = this.createTableRow(currency, index);
			fragment.appendChild(row);
		});

		this.elements.currencyTableBody.appendChild(fragment);
	}

	/**
	 * Create a table row for a currency
	 */
	createTableRow(currency, index) {
		const row = document.createElement('tr');
		row.style.animationDelay = `${index * 50}ms`;

		// Determine change class
		let changeClass = 'change-neutral';
		if (currency.diffNumeric > 0) {
			changeClass = 'change-positive';
		} else if (currency.diffNumeric < 0) {
			changeClass = 'change-negative';
		}

		// Format change with appropriate symbol
		const changeFormatted = currency.diffFormated || currency.diff || '0.0000';
		const changeWithSymbol = currency.diffNumeric > 0 ? `+${changeFormatted}` : changeFormatted;

		row.innerHTML = `
			<td title="${currency.code}">${currency.code}</td>
			<td title="${currency.name}" class="currency-name">${currency.name}</td>
			<td title="Quantity: ${currency.quantity}">${currency.quantity}</td>
			<td title="Rate: ${currency.rateFormated || currency.rate}">${currency.rateFormated || currency.rate}</td>
			<td class="${changeClass}" title="Change: ${changeWithSymbol}">${changeWithSymbol}</td>
		`;

		return row;
	}

	/**
	 * Show loading state
	 */
	showLoadingState() {
		this.elements.loadingState.style.display = 'block';
		this.elements.errorState.style.display = 'none';
		this.elements.tableContainer.style.display = 'none';
		this.elements.noResults.style.display = 'none';
		this.elements.refreshBtn.classList.add('loading');
		this.elements.refreshBtn.disabled = true;
	}

	/**
	 * Show success state
	 */
	showSuccessState() {
		this.elements.loadingState.style.display = 'none';
		this.elements.errorState.style.display = 'none';
		this.elements.refreshBtn.classList.remove('loading');
		this.elements.refreshBtn.disabled = false;
	}

	/**
	 * Show error state
	 */
	showErrorState(message) {
		this.elements.loadingState.style.display = 'none';
		this.elements.tableContainer.style.display = 'none';
		this.elements.noResults.style.display = 'none';
		this.elements.errorState.style.display = 'block';
		this.elements.errorMessage.textContent = message || 'An unexpected error occurred';
		this.elements.refreshBtn.classList.remove('loading');
		this.elements.refreshBtn.disabled = false;
	}

	/**
	 * Update last updated display
	 */
	updateLastUpdatedDisplay() {
		if (this.state.lastUpdated) {
			const timeString = this.state.lastUpdated.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
			this.elements.lastUpdated.textContent = `Last updated: ${timeString}`;
		}
	}

	/**
	 * Debounce function to limit API calls
	 */
	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new ExchangeRatesApp();
});
