/**
 * i18n.js — bilingual UI strings (Georgian / English) + language switching.
 *
 * Georgian is the default. The choice is persisted in localStorage and applied by
 * rewriting every [data-i18n] node, the <html lang> attribute, and the <title>/
 * meta description so the page stays correct for both users and crawlers.
 *
 * Exposes a single global: window.I18n
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'lk:lang';

  var STRINGS = {
    ka: {
      /* Document-level */
      docTitle: 'ლარის კურსი — ვალუტის კურსები და კონვერტორი | ეროვნული ბანკი',
      docDescription: 'ლარის კურსი დღეს: ეროვნული ბანკის ოფიციალური ვალუტის კურსები — USD, EUR, GBP და სხვა. უფასო ლარის კალკულატორი და კურსის ისტორიული გრაფიკები.',

      /* Chrome */
      skipLink: 'გადასვლა მთავარ შიგთავსზე',
      brandName: 'ლარის კურსი',
      navCalculator: 'კალკულატორი',
      navRates: 'კურსები',
      navCharts: 'გრაფიკები',
      navAlerts: 'შეტყობინებები',
      themeToDark: 'ჩართე ბნელი თემა',
      themeToLight: 'ჩართე ნათელი თემა',
      langToggle: 'Switch to English',

      /* Hero + calculator */
      heroEyebrow: 'საქართველოს ეროვნული ბანკის ოფიციალური კურსები',
      heroTitle: 'ლარის კურსი და ვალუტის კონვერტორი',
      heroSub: 'გადაიყვანეთ ნებისმიერი ვალუტა ლარში და პირიქით — ოფიციალური, ყოველდღიურად განახლებადი კურსით.',
      calcHeading: 'ვალუტის კალკულატორი',
      labelAmount: 'თანხა',
      labelFrom: 'საიდან',
      labelTo: 'სად',
      labelResult: 'შედეგი',
      swapLabel: 'ვალუტების გაცვლა',
      copy: 'კოპირება',
      share: 'გაზიარება',
      refresh: 'განახლება',
      gelName: 'ქართული ლარი',

      /* Rates */
      ratesHeading: 'დღევანდელი ოფიციალური კურსები',
      ratesSub: 'დააწკაპუნეთ ვალუტაზე, რომ ის კალკულატორში ჩაიტვირთოს.',
      labelSearch: 'ვალუტის ძებნა',
      searchPlaceholder: 'ძებნა: USD, ევრო…',
      tableCaption: 'საქართველოს ეროვნული ბანკის ოფიციალური ვალუტის კურსები ლართან მიმართებაში',
      thCurrency: 'ვალუტა',
      thCode: 'კოდი',
      thRate: 'კურსი (₾)',
      thChange: 'ცვლილება',
      noResults: 'ვალუტა ვერ მოიძებნა.',
      perUnits: '{n} ერთეულისთვის',

      /* Chart */
      chartsHeading: 'კურსის ისტორია',
      chartsSub: 'აირჩიეთ ვალუტა და პერიოდი — გრაფიკი აჩვენებს კურსს ლართან მიმართებაში.',
      labelChartCurrency: 'გრაფიკის ვალუტა',
      range7d: '7 დღე',
      range1m: '1 თვე',
      range6m: '6 თვე',
      range1y: '1 წელი',
      statMin: 'მინიმუმი',
      statMax: 'მაქსიმუმი',
      statChange: 'ცვლილება',
      chartLoading: 'მონაცემები იტვირთება…',
      chartError: 'გრაფიკის მონაცემები ვერ ჩაიტვირთა.',
      chartEmpty: 'ამ პერიოდისთვის საკმარისი მონაცემები არ მოიძებნა.',
      chartNote: 'გრძელი პერიოდებისთვის მონაცემები შერჩევითია (კვირეული წერტილები), რათა ეროვნული ბანკის სერვისი არ გადაიტვირთოს.',
      chartAria: '{code}-ის კურსის ისტორიული გრაფიკი ლარში',
      chartLabel: '1 {code} ლარში',
      retry: 'თავიდან ცდა',

      /* Alerts */
      alertsHeading: 'კურსის შეტყობინებები',
      alertsSub: 'დააყენეთ სამიზნე კურსი — გვერდი გამოგიჩენთ ნიშანს, როცა პირობა შესრულდება. მონაცემები ინახება მხოლოდ თქვენს ბრაუზერში.',
      labelAlertCurrency: 'ვალუტა',
      labelAlertDirection: 'პირობა',
      labelAlertValue: 'სამიზნე კურსი (₾)',
      alertAdd: 'დამატება',
      alertBelow: 'ნაკლებია ვიდრე',
      alertAbove: 'მეტია ვიდრე',
      alertEmpty: 'შეტყობინებები ჯერ არ გაქვთ.',
      alertRuleBelow: '1 {code} < {value} ₾',
      alertRuleAbove: '1 {code} > {value} ₾',
      alertNow: 'ახლა: {value} ₾',
      alertTriggered: '🔔 შესრულდა',
      alertWaiting: 'მოლოდინში',
      alertRemove: 'წაშლა',
      alertAdded: 'შეტყობინება დაემატა',
      alertInvalid: 'შეიყვანეთ სწორი სამიზნე კურსი.',

      /* Footer */
      footerAttribution: 'კურსებს აქვეყნებს საქართველოს ეროვნული ბანკი.',
      footerDisclaimer: 'ინფორმაცია საინფორმაციო ხასიათისაა და არ წარმოადგენს ფინანსურ რჩევას.',

      /* Status / feedback */
      updatedJustNow: 'განახლდა ახლახან',
      updatedMinutes: 'განახლდა {n} წუთის წინ',
      updatedHours: 'განახლდა {n} საათის წინ',
      updatedDays: 'განახლდა {n} დღის წინ',
      officialFor: 'ოფიციალური კურსი: {date}',
      loadError: 'კურსების ჩატვირთვა ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.',
      loadErrorCached: 'ახალი მონაცემები ვერ ჩაიტვირთა — ნაჩვენებია შენახული კურსები.',
      refreshed: 'კურსები განახლდა',
      copied: 'შედეგი დაკოპირდა',
      linkCopied: 'ბმული დაკოპირდა',
      copyFailed: 'კოპირება ვერ მოხერხდა',
      shareText: '{from} = {to} — ლარის კურსი'
    },

    en: {
      docTitle: 'LarisKursi — Live GEL Exchange Rates & Currency Converter | National Bank of Georgia',
      docDescription: 'Live GEL exchange rates from the National Bank of Georgia — USD, EUR, GBP and more. Free lari currency converter and historical rate charts.',

      skipLink: 'Skip to main content',
      brandName: 'Lari Rates',
      navCalculator: 'Converter',
      navRates: 'Rates',
      navCharts: 'Charts',
      navAlerts: 'Alerts',
      themeToDark: 'Switch to dark theme',
      themeToLight: 'Switch to light theme',
      langToggle: 'გადართე ქართულზე',

      heroEyebrow: 'Official rates from the National Bank of Georgia',
      heroTitle: 'GEL exchange rates & currency converter',
      heroSub: 'Convert any currency to Georgian lari and back — using the official, daily-updated rate.',
      calcHeading: 'Currency converter',
      labelAmount: 'Amount',
      labelFrom: 'From',
      labelTo: 'To',
      labelResult: 'Result',
      swapLabel: 'Swap currencies',
      copy: 'Copy',
      share: 'Share',
      refresh: 'Refresh',
      gelName: 'Georgian Lari',

      ratesHeading: 'Today’s official rates',
      ratesSub: 'Click any currency to load it into the converter above.',
      labelSearch: 'Search currencies',
      searchPlaceholder: 'Search: USD, Euro…',
      tableCaption: 'Official National Bank of Georgia exchange rates against the Georgian lari',
      thCurrency: 'Currency',
      thCode: 'Code',
      thRate: 'Rate (₾)',
      thChange: 'Change',
      noResults: 'No currency found.',
      perUnits: 'per {n} units',

      chartsHeading: 'Rate history',
      chartsSub: 'Pick a currency and a range — the chart shows its rate against the lari.',
      labelChartCurrency: 'Chart currency',
      range7d: '7 days',
      range1m: '1 month',
      range6m: '6 months',
      range1y: '1 year',
      statMin: 'Minimum',
      statMax: 'Maximum',
      statChange: 'Change',
      chartLoading: 'Loading data…',
      chartError: 'Could not load chart data.',
      chartEmpty: 'Not enough data for this range.',
      chartNote: 'Longer ranges are sampled (weekly points) so the National Bank service is not overloaded.',
      chartAria: 'Historical chart of {code} against the lari',
      chartLabel: '1 {code} in GEL',
      retry: 'Try again',

      alertsHeading: 'Rate alerts',
      alertsSub: 'Set a target rate — the page highlights it when the condition is met. Everything is stored only in your browser.',
      labelAlertCurrency: 'Currency',
      labelAlertDirection: 'Condition',
      labelAlertValue: 'Target rate (₾)',
      alertAdd: 'Add',
      alertBelow: 'is below',
      alertAbove: 'is above',
      alertEmpty: 'No alerts yet.',
      alertRuleBelow: '1 {code} < {value} ₾',
      alertRuleAbove: '1 {code} > {value} ₾',
      alertNow: 'now: {value} ₾',
      alertTriggered: '🔔 Triggered',
      alertWaiting: 'Waiting',
      alertRemove: 'Remove',
      alertAdded: 'Alert added',
      alertInvalid: 'Enter a valid target rate.',

      footerAttribution: 'Rates are published by the National Bank of Georgia.',
      footerDisclaimer: 'For information only — not financial advice.',

      updatedJustNow: 'updated just now',
      updatedMinutes: 'updated {n} min ago',
      updatedHours: 'updated {n} h ago',
      updatedDays: 'updated {n} d ago',
      officialFor: 'official rate for {date}',
      loadError: 'Could not load rates. Check your connection and try again.',
      loadErrorCached: 'Could not fetch fresh data — showing the last saved rates.',
      refreshed: 'Rates refreshed',
      copied: 'Result copied',
      linkCopied: 'Link copied',
      copyFailed: 'Could not copy',
      shareText: '{from} = {to} — LarisKursi'
    }
  };

  /* Georgian month names are spelled out here on purpose: not every browser build
     ships ICU data for `ka`, and those fall back to English inside an otherwise
     Georgian page. English dates go through Intl as usual. */
  var KA_MONTHS_LONG = [
    'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
    'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
  ];
  var KA_MONTHS_SHORT = [
    'იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ',
    'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'
  ];

  var current = 'ka';
  var listeners = [];

  /**
   * Read the saved language. The site targets the Georgian market, so Georgian
   * stays the default for first-time visitors regardless of browser locale —
   * switching to English is an explicit, remembered choice.
   */
  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && STRINGS[saved]) return saved;
    } catch (e) { /* storage may be blocked — ignore */ }
    return 'ka';
  }

  /** Translate a key, interpolating {placeholders}. Falls back to the key itself. */
  function t(key, vars) {
    var dict = STRINGS[current] || STRINGS.ka;
    var value = dict[key];
    if (value === undefined) value = STRINGS.ka[key];
    if (value === undefined) return key;
    if (!vars) return value;

    return value.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }

  /** Rewrite every static string in the DOM for the active language. */
  function applyToDom() {
    document.documentElement.setAttribute('lang', current);
    document.title = t('docTitle');

    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('docDescription'));

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }

    var search = document.getElementById('rates-search');
    if (search) search.setAttribute('placeholder', t('searchPlaceholder'));

    var swap = document.getElementById('swap-btn');
    if (swap) swap.setAttribute('aria-label', t('swapLabel'));

    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.setAttribute('aria-label', t('langToggle'));
      var label = document.getElementById('lang-label');
      if (label) label.textContent = current === 'ka' ? 'EN' : 'ქა';
    }
  }

  function setLang(lang, silent) {
    if (!STRINGS[lang] || lang === current) return;
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
    applyToDom();
    if (!silent) {
      for (var i = 0; i < listeners.length; i++) listeners[i](current);
    }
  }

  function toggle() {
    setLang(current === 'ka' ? 'en' : 'ka');
  }

  /** Subscribe to language changes (used by app.js to re-render dynamic content). */
  function onChange(fn) { listeners.push(fn); }

  function lang() { return current; }

  /** BCP-47 locale for Intl formatting. */
  function locale() { return current === 'ka' ? 'ka-GE' : 'en-US'; }

  /**
   * Format a YYYY-MM-DD string for display.
   * @param {string} iso
   * @param {'short'|'long'} [style] 'short' → "8 სექ" / "Sep 8", 'long' → full date
   */
  function formatDate(iso, style) {
    if (!iso) return '';
    var parts = String(iso).split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]) - 1;
    var day = Number(parts[2]);
    if (!(month >= 0 && month <= 11)) return iso;

    if (current === 'ka') {
      var names = style === 'long' ? KA_MONTHS_LONG : KA_MONTHS_SHORT;
      return style === 'long'
        ? day + ' ' + names[month] + ', ' + year
        : day + ' ' + names[month];
    }

    var date = new Date(year, month, day);
    var options = style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short' };
    try {
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (e) {
      return iso;
    }
  }

  global.I18n = {
    t: t,
    lang: lang,
    locale: locale,
    formatDate: formatDate,
    setLang: setLang,
    toggle: toggle,
    onChange: onChange,
    applyToDom: applyToDom,
    init: function () { current = detect(); applyToDom(); }
  };
})(window);
