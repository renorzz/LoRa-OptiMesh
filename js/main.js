/**
 * main.js
 * -------
 * Application Coordinator for LoRa-OptiMesh Hardware Showcase.
 * Light Mode, Clean & Elegant Academic/Industrial Engineering Interface.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Initialize Thermodynamic Digital Twin Engine
  const digitalTwin = new DigitalTwinEngine();

  // 3. Initialize Sub-GHz Network Mesh Simulator
  const networkSim = new NetworkMeshSimulator('mesh-canvas');

  // 4. Hardware Gallery Tabs
  const hwTabBtns = document.querySelectorAll('.hw-tab-btn');
  const hwTabPanes = document.querySelectorAll('.hw-tab-pane');

  hwTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      hwTabBtns.forEach(b => b.classList.remove('active'));
      hwTabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(targetTab);
      if (activePane) {
        activePane.classList.add('active');
      }

      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });

  // 5. Interactive Fullscreen Lightbox Modal
  const lightboxModal = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');
  const lightboxTriggers = document.querySelectorAll('.lightbox-trigger');

  function openLightbox(src, caption) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption || 'Tampilan Resolusi Penuh';
    lightboxModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  lightboxTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const src = trigger.getAttribute('data-src') || trigger.getAttribute('src');
      const caption = trigger.getAttribute('data-caption') || trigger.getAttribute('alt');
      if (src) {
        openLightbox(src, caption);
      }
    });
  });

  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', closeLightbox);
  }
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) closeLightbox();
    });
  }

  // Keyboard Escape Handler
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });

  // 6. Active Nav Link on Scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 100;
      const sectionId = current.getAttribute('id');

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  });
});
