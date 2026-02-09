'use client';

import { useEffect } from 'react';

export default function PWAInit() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered successfully:', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New update available
                    if (confirm('تحديث جديد متوفر! هل تريد تحديث التطبيق الآن؟')) {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });

        // Handle service worker updates
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }

    // PWA install prompt
    let deferredPrompt: any;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button or notification
      console.log('💡 PWA can be installed!');
      
      // You can show a custom install button here
      showInstallPromotion();
    });

    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully!');
      deferredPrompt = null;
    });

    function showInstallPromotion() {
      // Create install notification
      const installBanner = document.createElement('div');
      installBanner.id = 'pwa-install-banner';
      installBanner.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        font-family: 'Cairo', sans-serif;
        animation: slideIn 0.3s ease-out;
      `;
      
      installBanner.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 5px;">📱 ثبّت التطبيق</div>
          <div style="font-size: 0.9em; opacity: 0.9;">يمكنك تثبيت Sanad POS على جهازك</div>
        </div>
        <button id="pwa-install-btn" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 8px 16px;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
        ">تثبيت</button>
        <button id="pwa-dismiss-btn" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 5px;
          cursor: pointer;
          font-family: 'Cairo', sans-serif;
        ">لاحقاً</button>
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
      
      document.body.appendChild(installBanner);
      
      // Install button click
      document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response to install prompt: ${outcome}`);
          deferredPrompt = null;
          installBanner.remove();
        }
      });
      
      // Dismiss button click
      document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
        installBanner.remove();
      });
    }
  }, []);

  return null;
}
