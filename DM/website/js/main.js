// ===== STICKY HEADER =====
const header = document.querySelector('.header');
if (header) {
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        menuToggle.classList.toggle('active');
    });
}

// Mobile dropdown toggles
document.querySelectorAll('.nav-item.has-dropdown .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            link.closest('.nav-item').classList.toggle('open');
        }
    });
});

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (nav && menuToggle && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
        nav.classList.remove('open');
        menuToggle.classList.remove('active');
    }
});

// ===== GALLERY FILTER =====
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        galleryItems.forEach(item => {
            const show = filter === 'all' || item.dataset.category === filter;
            item.style.display = show ? 'block' : 'none';
            if (show) {
                item.style.animation = 'none';
                item.offsetHeight;
                item.style.animation = 'fadeIn 0.4s ease forwards';
            }
        });
    });
});

// ===== CONTACT FORM =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const res = document.getElementById('formResponse');
        const data = Object.fromEntries(new FormData(contactForm));

        if (!data.name.trim() || !data.phone.trim() || !data.message.trim()) {
            res.className = 'form-msg form-msg-error';
            res.textContent = window.i18nT ? window.i18nT('contact.form.val') : '✗ შეავსეთ სავალდებულო ველები (*)';
            res.style.display = 'block';
            return;
        }

        btn.textContent = window.i18nT ? window.i18nT('contact.form.sending') : 'იგზავნება...';
        btn.disabled = true;
        res.style.display = 'none';

        try {
            const r = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await r.json();
            if (json.success) {
                res.className = 'form-msg form-msg-success';
                res.textContent = window.i18nT ? window.i18nT('contact.form.ok') : '✓ შეტყობინება გაიგზავნა! 24 საათში დაგიკავშირდებით.';
                contactForm.reset();
            } else {
                throw new Error('failed');
            }
        } catch {
            res.className = 'form-msg form-msg-error';
            res.textContent = window.i18nT ? window.i18nT('contact.form.err') : '✗ გაგზავნა ვერ მოხდა. სცადეთ ხელახლა ან დაგვიძახეთ: +995 555 123 456';
        }

        res.style.display = 'block';
        btn.textContent = window.i18nT ? window.i18nT('contact.form.submit') : 'გაგზავნა →';
        btn.disabled = false;
    });
}

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ===== COUNTER ANIMATION =====
function animateCount(el) {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = Math.floor(start) + suffix;
        if (start >= target) clearInterval(timer);
    }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCount(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

// ===== WHATSAPP BUTTON =====
(function () {
    const wa = document.createElement('a');
    wa.href = 'https://wa.me/995555123456';
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    wa.className = 'wa-btn';
    wa.setAttribute('aria-label', 'WhatsApp-ზე დაგვიკავშირდით');
    wa.innerHTML = `<svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.833.738 5.488 2.027 7.797L0 32l8.454-2.007A15.944 15.944 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.266 13.266 0 01-6.773-1.852l-.486-.288-5.017 1.19 1.26-4.891-.317-.502A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.927c-.398-.199-2.358-1.163-2.723-1.296-.365-.133-.63-.199-.896.199-.265.398-1.03 1.296-1.262 1.562-.232.265-.465.298-.863.1-.398-.199-1.68-.619-3.2-1.977-1.183-1.056-1.981-2.36-2.213-2.758-.232-.398-.025-.614.174-.812.179-.178.398-.465.597-.698.199-.232.265-.398.398-.663.133-.265.066-.498-.033-.697-.1-.199-.896-2.16-1.228-2.957-.323-.776-.651-.671-.896-.683l-.763-.013c-.265 0-.697.1-1.062.498-.365.398-1.394 1.362-1.394 3.322s1.428 3.853 1.627 4.118c.199.265 2.81 4.29 6.808 6.019.952.411 1.694.657 2.273.84.955.304 1.824.261 2.512.158.766-.114 2.358-.964 2.69-1.895.332-.93.332-1.728.232-1.895-.1-.166-.365-.265-.763-.464z"/></svg><span class="wa-tooltip">WhatsApp-ზე დაგვიკავშირდით</span>`;
    document.body.appendChild(wa);
})();

// ===== HERO SLIDESHOW =====
(function () {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length < 2) return;
    let current = 0;
    setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 5000);
})();

// ===== FADE-IN KEYFRAME =====
const style = document.createElement('style');
style.textContent = '@keyframes fadeIn { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }';
document.head.appendChild(style);
