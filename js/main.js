

import logger from './logger.js';


function initApp() {
    logger.info('Sports Buddy application initialized');
    
    logger.info('Browser info', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
    });

    document.documentElement.style.scrollBehavior = 'smooth';

    initializeAnimations();
    initializeFeatures();
}


function initializeAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
        '.feature-card, .step-card, .stat-card'
    );

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    logger.info(`Initialized animations for ${animatedElements.length} elements`);
}


function initializeFeatures() {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
            }
            
            lastScroll = currentScroll;
        });
    }

    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.disabled) {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);
            }
        });
    });

    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            const inputs = form.querySelectorAll('input[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                } else {
                    input.style.borderColor = '';
                }
            });

            if (!isValid) {
                e.preventDefault();
                logger.warning('Form validation failed');
            }
        });

        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                this.style.borderColor = '';
            });
        });
    });

    logger.info('Additional features initialized');
}


window.addEventListener('error', (event) => {
    logger.error('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});


window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection', {
        reason: event.reason
    });
});


document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logger.info('Page hidden');
    } else {
        logger.info('Page visible');
    }
});


window.addEventListener('load', () => {
    setTimeout(() => {
        const perfData = performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        
        logger.info('Page performance', {
            loadTime: `${pageLoadTime}ms`,
            domReady: `${perfData.domContentLoadedEventEnd - perfData.navigationStart}ms`
        });
    }, 0);
});


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}


export default {
    initApp,
    initializeAnimations,
    initializeFeatures
};