// Mobile Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const headerMenu = document.querySelector('.header-menu');
    const header = document.querySelector('header');
    const menuLinks = document.querySelectorAll('.header-menu ul li a');

    // Toggle mobile menu
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            const isActive = this.classList.contains('active');
            
            if (isActive) {
                // Close menu
                this.classList.remove('active');
                headerMenu.classList.remove('active');
                this.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            } else {
                // Open menu
                this.classList.add('active');
                headerMenu.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
            }
        });
    }

    // Close menu when clicking on menu links
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileMenuToggle && mobileMenuToggle.classList.contains('active')) {
                mobileMenuToggle.classList.remove('active');
                headerMenu.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (mobileMenuToggle && 
            !mobileMenuToggle.contains(event.target) && 
            !headerMenu.contains(event.target) &&
            mobileMenuToggle.classList.contains('active')) {
            
            mobileMenuToggle.classList.remove('active');
            headerMenu.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    });

    // Header sticky functionality
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });

    // Smooth scroll for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // Reset mobile menu state on larger screens
            if (mobileMenuToggle && mobileMenuToggle.classList.contains('active')) {
                mobileMenuToggle.classList.remove('active');
                headerMenu.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        }
    });

    // Improve touch targets for mobile
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
    }

    // Scroll fade-in animations
    const fadeEls = document.querySelectorAll('.fade-in');
    if (fadeEls.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        fadeEls.forEach(el => observer.observe(el));
    }

    // Contact form AJAX submission
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: new FormData(contactForm)
                });
                const data = await response.json();
                if (data.success) {
                    formStatus.textContent = 'Message sent successfully!';
                    formStatus.style.color = '#4CAF50';
                    contactForm.reset();
                } else {
                    formStatus.textContent = 'Something went wrong. Please try again.';
                    formStatus.style.color = '#ff0157';
                }
            } catch {
                formStatus.textContent = 'Network error. Please try again.';
                formStatus.style.color = '#ff0157';
            }
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
});
