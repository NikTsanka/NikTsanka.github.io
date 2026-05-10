// ===== PRODUCTS PAGE LOGIC =====
(function () {
    const CATEGORY_EMOJI = {
        'განათება': '💡',
        'სახანძრო': '🔥',
        'ვიდეო': '📹',
        'ელექტრო': '⚡',
        'სიგნალიზაცია': '🔒'
    };

    function emoji(cat) {
        return CATEGORY_EMOJI[cat] || '📦';
    }

    function cardHTML(p) {
        const hasImg = !!p.image;
        const wrapAttrs = hasImg
            ? `class="product-img-wrap product-img-clickable" data-image="${p.image}" data-name="${p.name}"`
            : `class="product-img-wrap"`;
        const img = hasImg
            ? `<img src="${p.image}" alt="${p.name}" loading="lazy"><div class="zoom-hint">🔍</div>`
            : `<div class="product-img-placeholder">${emoji(p.category)}</div>`;
        return `
            <div class="product-card fade-up" data-cat="${p.category}">
                <div ${wrapAttrs}>${img}</div>
                <div class="product-body">
                    <span class="product-category">${emoji(p.category)} ${p.category}</span>
                    <div class="product-name">${p.name}</div>
                    <p class="product-desc">${p.description}</p>
                    <div class="product-footer">
                        <span class="product-price">${p.price}</span>
                        <a href="contact.html" class="product-contact-btn">შეკვეთა →</a>
                    </div>
                </div>
            </div>`;
    }

    function render(filter) {
        const grid = document.getElementById('productsGrid');
        const empty = document.getElementById('noProducts');
        const list = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

        if (!list.length) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        grid.innerHTML = list.map(cardHTML).join('');

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
        grid.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
    }

    function buildFilters() {
        const cats = [...new Set(PRODUCTS.map(p => p.category))];
        const container = document.getElementById('categoryFilters');
        cats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.cat = cat;
            btn.textContent = `${emoji(cat)} ${cat}`;
            container.appendChild(btn);
        });

        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                render(btn.dataset.cat);
            });
        });
    }

    // ===== LIGHTBOX =====
    const lightbox   = document.getElementById('lightbox');
    const lbImg      = document.getElementById('lbImg');
    const lbCaption  = document.getElementById('lbCaption');

    function openLightbox(src, name) {
        lbImg.src = src;
        lbCaption.textContent = name;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => { lbImg.src = ''; }, 300);
    }

    document.addEventListener('click', (e) => {
        const wrap = e.target.closest('.product-img-clickable');
        if (wrap) { openLightbox(wrap.dataset.image, wrap.dataset.name); return; }
        if (e.target === lightbox || e.target.closest('#lbClose')) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    buildFilters();
    render('all');
})();
