# Georgian Lari Exchange Rates

A modern, responsive web application that displays official exchange rates from the National Bank of Georgia (NBG). Built with vanilla HTML, CSS, and JavaScript for optimal performance and compatibility.

## 🚀 Features

### 📱 Responsive Design
- **Mobile-First Approach**: Optimized for mobile devices with touch-friendly interactions
- **Responsive Breakpoints**: Adapts seamlessly to desktop, tablet, and mobile screens
- **Smart Table Layout**: Hides less important columns on mobile for better usability
- **Touch Optimizations**: Large buttons and touch targets for mobile users

### 🎨 Modern UI/UX
- **Professional Design**: Clean, modern interface with Georgian Lari (₾) branding
- **Dark Mode Support**: Automatic dark mode based on system preferences
- **Smooth Animations**: Subtle hover effects and loading animations
- **Glass Morphism**: Modern backdrop blur effects in header elements
- **Typography**: Inter font family for excellent readability

### ⚡ Advanced Functionality
- **Real-time Search**: Instant filtering by currency code or name
- **Column Sorting**: Click column headers to sort by any field
- **Auto-refresh**: Easy refresh with visual loading indicators
- **Error Handling**: Comprehensive error states with retry functionality
- **Keyboard Shortcuts**: 
  - `Ctrl + R`: Refresh data
  - `Ctrl + F`: Focus search field

### 🔧 Technical Features
- **Modern JavaScript**: ES6+ classes and async/await patterns
- **Performance Optimized**: Document fragments and debounced search
- **Accessibility**: ARIA labels, semantic HTML, and keyboard navigation
- **SEO Optimized**: Proper meta tags and structured content
- **Print Friendly**: Optimized print styles

## 📁 File Structure

```
├── index.html          # Main HTML structure
├── style.css           # Modern responsive CSS
├── script.js           # Enhanced JavaScript application
└── README.md           # This documentation
```

## 🎯 Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 60+, Safari 12+, Edge 79+
- **Mobile Browsers**: iOS Safari 12+, Android Chrome 60+
- **Features**: ES6+ support required for full functionality

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+ (Large screens)
- **Laptop**: 992px - 1199px (Medium screens)
- **Tablet**: 768px - 991px (Small screens)
- **Mobile**: 320px - 767px (Extra small screens)

## 🔄 API Integration

The application fetches data from the National Bank of Georgia's official API:
- **Endpoint**: `https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json/`
- **Format**: JSON
- **Update Frequency**: Daily
- **Timeout**: 10 seconds with automatic retry (up to 3 attempts)

## 🎨 Design System

### Color Palette
- **Primary**: `#2c5530` (Georgian Green)
- **Secondary**: `#e8f5e8` (Light Green)
- **Success**: `#28a745` (Positive changes)
- **Danger**: `#dc3545` (Negative changes)
- **Background**: `#f8faf9` (Soft background)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Monospace**: Monaco/Consolas (for rates and codes)
- **Sizes**: Responsive scaling from mobile to desktop

### Spacing System
- **Scale**: 0.25rem to 3rem using CSS custom properties
- **Consistent**: Maintains visual rhythm across all components

## 🛠️ Development

### Local Development
1. Clone or download the files
2. Open `index.html` in a modern web browser
3. For live development, use a local server (e.g., Live Server extension in VS Code)

### Customization
- **Colors**: Modify CSS custom properties in `:root` selector
- **API**: Update `apiBaseUrl` in JavaScript configuration
- **Features**: Extend the `ExchangeRatesApp` class

## 📊 Performance Optimizations

- **Lazy Loading**: Only renders visible table rows
- **Debounced Search**: Prevents excessive filtering during typing
- **Document Fragments**: Efficient DOM manipulation
- **CSS Animations**: Hardware-accelerated transforms
- **Fetch Optimization**: Request caching and timeout handling

## ♿ Accessibility Features

- **ARIA Labels**: Screen reader friendly
- **Semantic HTML**: Proper heading structure and landmarks
- **Keyboard Navigation**: Full keyboard support
- **Color Contrast**: WCAG 2.1 AA compliant
- **Focus Management**: Visible focus indicators

## 🎯 Usage Instructions

1. **Search**: Type in the search box to filter currencies
2. **Sort**: Click column headers to sort data
3. **Refresh**: Use the refresh button or Ctrl+R
4. **Mobile**: Swipe or tap for touch interactions

## 📄 License

This project is open source. Feel free to use and modify as needed.

## 🤝 Credits

- **Data Source**: National Bank of Georgia (NBG)
- **Icons**: Feather Icons (inline SVG)
- **Fonts**: Inter by Rasmus Andersson
- **Design**: Modern Material Design principles

---

*Built with ❤️ for the Georgian financial community*