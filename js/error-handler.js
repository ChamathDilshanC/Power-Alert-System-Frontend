// Enhanced Error Handler for 403 and 404 Errors
// This script detects errors, shows appropriate images, clears storage, and redirects to index

(function() {
    // Configuration
    const CONFIG = {
        // Error images - update with your actual paths
        errorImages: {
            '403': 'https://i.pinimg.com/736x/1c/14/74/1c14740312fc9e59d26699ef8affa0b5.jpg', // Path to 403 error image
            '404': 'https://i.pinimg.com/736x/ae/b4/98/aeb49825f5b80f11b2f222dd2365613f.jpg'  // Path to 404 error image
        },
        redirectDelay: 12000, // 12 seconds in milliseconds
        redirectUrl: '../index.html', // Where to redirect on error
        cssClass: 'error-overlay', // Main CSS class for styling
        preserveStorageKeys: ['theme', 'language'] // Storage keys to preserve (if any)
    };

    // Inject CSS styles
    function injectStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
      .error-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.5s ease forwards;
      }
      
      .error-image-container {
        width: 100%;
        height: 70%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin-bottom: 20px;
      }
      
      .error-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        animation: scaleIn 0.7s ease forwards;
      }
      
      .error-message {
        color: white;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        font-family: 'Inter', sans-serif;
        text-align: center;
        padding: 0 20px;
        animation: slideIn 0.5s ease forwards;
      }
      
      .error-countdown {
        color: #e0e7ff;
        font-size: 16px;
        font-family: 'Inter', sans-serif;
        animation: pulse 2s infinite;
      }
      
      .error-progress {
        width: 300px;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.2);
        margin-top: 20px;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .error-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4f46e5, #818cf8);
        width: 0%;
        animation: progress 12s linear forwards;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes progress {
        from { width: 0%; }
        to { width: 100%; }
      }
      
      /* Media queries for responsive design */
      @media (max-width: 768px) {
        .error-image-container {
          height: 50%;
        }
        
        .error-message {
          font-size: 20px;
        }
      }
      
      @media (max-width: 480px) {
        .error-image-container {
          height: 40%;
        }
        
        .error-message {
          font-size: 18px;
        }
        
        .error-progress {
          width: 80%;
          max-width: 300px;
        }
      }
    `;
        document.head.appendChild(styleEl);
    }

    // Function to clear localStorage and sessionStorage
    function clearStorages() {
        try {
            // Save any keys that should be preserved
            const preservedItems = {};

            if (CONFIG.preserveStorageKeys && CONFIG.preserveStorageKeys.length > 0) {
                // Save items from localStorage
                CONFIG.preserveStorageKeys.forEach(key => {
                    const localValue = localStorage.getItem(key);
                    if (localValue !== null) {
                        preservedItems['local_' + key] = localValue;
                    }

                    const sessionValue = sessionStorage.getItem(key);
                    if (sessionValue !== null) {
                        preservedItems['session_' + key] = sessionValue;
                    }
                });
            }

            // Clear both storages
            localStorage.clear();
            sessionStorage.clear();

            // Log the clearing action (can be removed in production)
            console.log('All local and session storage has been cleared due to an error');

            // Restore preserved items if any
            if (Object.keys(preservedItems).length > 0) {
                Object.keys(preservedItems).forEach(key => {
                    if (key.startsWith('local_')) {
                        localStorage.setItem(key.substring(6), preservedItems[key]);
                    } else if (key.startsWith('session_')) {
                        sessionStorage.setItem(key.substring(8), preservedItems[key]);
                    }
                });
            }

            return true;
        } catch (e) {
            // In case of any errors (like private browsing mode)
            console.error('Failed to clear storage:', e);
            return false;
        }
    }

    // Create and show error overlay
    function showErrorOverlay(errorCode) {
        // Validate error code
        if (!errorCode || !CONFIG.errorImages[errorCode]) {
            errorCode = '404'; // Default to 404 if invalid error code
        }

        // If overlay already exists, don't create another one
        if (document.querySelector('.' + CONFIG.cssClass)) {
            return;
        }

        // Inject CSS if not already done
        injectStyles();

        // Create the overlay container
        const overlay = document.createElement('div');
        overlay.className = CONFIG.cssClass;

        // Create error image container for full-width handling
        const imageContainer = document.createElement('div');
        imageContainer.className = 'error-image-container';

        // Create error image
        const errorImg = document.createElement('img');
        errorImg.src = CONFIG.errorImages[errorCode];
        errorImg.alt = errorCode + ' Error';
        errorImg.className = 'error-image';
        errorImg.onerror = function() {
            // If image fails to load, show only text with larger font
            this.style.display = 'none';
            errorMessage.style.fontSize = '32px';
            errorMessage.style.marginTop = '40px';
        };

        imageContainer.appendChild(errorImg);
        overlay.appendChild(imageContainer);

        // Create error message based on error code
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';

        if (errorCode === '403') {
            errorMessage.textContent = 'Access Denied - You do not have permission to access this resource';
        } else if (errorCode === '404') {
            errorMessage.textContent = 'Page Not Found - The requested resource could not be found';
        } else {
            errorMessage.textContent = 'An error occurred while accessing this resource';
        }

        overlay.appendChild(errorMessage);

        // Create countdown text
        const countdownMsg = document.createElement('div');
        countdownMsg.textContent = 'Redirecting to homepage in 12 seconds...';
        countdownMsg.className = 'error-countdown';
        overlay.appendChild(countdownMsg);

        // Create progress bar
        const progressContainer = document.createElement('div');
        progressContainer.className = 'error-progress';

        const progressBar = document.createElement('div');
        progressBar.className = 'error-progress-bar';

        progressContainer.appendChild(progressBar);
        overlay.appendChild(progressContainer);

        // Add overlay to body
        document.body.appendChild(overlay);

        // Update countdown timer
        let secondsLeft = 12;
        const countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(countdownInterval);
            } else {
                countdownMsg.textContent = `Redirecting to homepage in ${secondsLeft} seconds...`;
            }
        }, 1000);

        // Set timeout for redirect with storage clearing
        setTimeout(() => {
            // Clear storage before redirecting
            clearStorages();

            // Redirect to index
            window.location.href = CONFIG.redirectUrl;
        }, CONFIG.redirectDelay);
    }

    // Methods to detect errors

    // 1. Intercept XHR requests
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        this.addEventListener('load', function() {
            if (this.status === 403) {
                showErrorOverlay('403');
            } else if (this.status === 404) {
                showErrorOverlay('404');
            }
        });
        originalXhrOpen.apply(this, arguments);
    };

    // 2. Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = function() {
        return originalFetch.apply(this, arguments)
            .then(response => {
                if (response.status === 403) {
                    showErrorOverlay('403');
                } else if (response.status === 404) {
                    showErrorOverlay('404');
                }
                return response;
            });
    };

    // 3. Listen for resource load errors (images, scripts, etc.)
    function handleResourceError(event) {
        const target = event.target;
        const url = target.src || target.href || '';

        // Skip empty URLs or same-origin policy failures
        if (!url || url === '' || url.startsWith('data:')) return;

        // Check if this resource is returning an error
        fetch(url, { method: 'HEAD' })
            .then(response => {
                if (response.status === 403) {
                    showErrorOverlay('403');
                } else if (response.status === 404) {
                    showErrorOverlay('404');
                }
            })
            .catch(() => {
                // If fetch fails, try XHR as a fallback
                const xhr = new XMLHttpRequest();
                xhr.open('HEAD', url, true);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 403) {
                            showErrorOverlay('403');
                        } else if (xhr.status === 404) {
                            showErrorOverlay('404');
                        }
                    }
                };
                xhr.send();
            });
    }

    // 4. Handle direct page errors
    function checkCurrentPageStatus() {
        // Check if the current page has an error status
        if (window.serverResponseStatus === 403) {
            showErrorOverlay('403');
            return;
        } else if (window.serverResponseStatus === 404) {
            showErrorOverlay('404');
            return;
        }

        // Check performance navigation data if available
        if (window.performance && window.performance.getEntriesByType) {
            const navigation = window.performance.getEntriesByType('navigation');
            if (navigation.length > 0) {
                if (navigation[0].responseStatus === 403) {
                    showErrorOverlay('403');
                } else if (navigation[0].responseStatus === 404) {
                    showErrorOverlay('404');
                }
            }
        }

        // Check URL for 404-specific patterns
        const currentUrl = window.location.href.toLowerCase();
        if (currentUrl.includes('/404') || currentUrl.includes('not-found') || currentUrl.includes('error=404')) {
            showErrorOverlay('404');
        }
    }

    // Initialize error detection
    function init() {
        // Add event listener for resource errors
        window.addEventListener('error', handleResourceError, true);

        // Check current page status
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            checkCurrentPageStatus();
        } else {
            window.addEventListener('DOMContentLoaded', checkCurrentPageStatus);
        }
    }

    // Start the error handler
    init();
})();