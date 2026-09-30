document.addEventListener('DOMContentLoaded', () => {
    const videoGrid = document.getElementById('video-grid');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const modal = document.getElementById('video-modal');
    const closeModal = document.querySelector('.close-modal');
    const iframeContainer = document.getElementById('iframe-container');
    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const searchInput = document.getElementById('video-search-input');
    const searchIcon = document.getElementById('search-submit-icon');
    const langToggleBtn = document.getElementById('lang-toggle-btn');

    let allVideos = [];
    let activeCategory = 'ALL';
    let searchQuery = '';
    let currentLang = localStorage.getItem('portfolio_lang_v2') || 'en';

    // ── Translation Dictionary
    const i18n = {
        ar: {
            toggleBtn: "العربية / EN",
            logoSub: "محرر فيديو احترافي وسينمائي",
            searchPlaceholder: "ابحث عن الفيديوهات والأعمال...",
            heroTitle: "عبد الملك<br>العواضي",
            heroSubtitle: "محرر ومخرج فيديو احترافي",
            heroBtn: '<i class="fas fa-play"></i> استعرض الأعمال السينمائية',
            allWorks: "جميع الأعمال السينمائية",
            loading: "جاري تحميل الأعمال السينمائية...",
            noResults: "لم يتم العثور على أي أعمال تطابق كلمة البحث.",
            resetSearchBtn: "إعادة ضبط البحث 🔄",
            subTitle: "ابقَ على اطلاع دائم",
            subSubtitle: "اشترك لتصلك أحدث الأعمال والمشاريع وكواليس الإنتاج السينمائي",
            subEmailPlaceholder: "أدخل بريدك الإلكتروني (your@email.com)",
            subBtn: "اشترك الآن",
            subscribing: "جاري الاشتراك...",
            subSuccess: "✓ تم الاشتراك بنجاح! شكراً لانضمامك",
            subError: "❌ حدث خطأ في عملية الاشتراك",
            footerDesc: "نصنع من المشاهد قصة سينمائية تلهم العالم.",
            footerCopy: "© 2026 عبد الملك العواضي. جميع الحقوق محفوظة.",
            adminBtn: '<i class="fas fa-lock"></i> لوحة التحكم',
            categories: {
                ALL: "الكل",
                Reels: "ريلز",
                Events: "فعاليات",
                "Short Films": "أفلام قصيرة",
                Ads: "إعلانات",
                Interviews: "مقابلات",
                BTS: "كواليس",
                Podcast: "بودكاست",
                "Brand Films": "أفلام براند",
                "Music Videos": "فيديو كليب",
                Documentaries: "وثائقيات",
                "Social Media": "سوشيال ميديا",
                Commercial: "تجاري",
                Promo: "برومو",
                Recap: "ملخص"
            }
        },
        en: {
            toggleBtn: "EN / العربية",
            logoSub: "PROFESSIONAL VIDEO EDITOR",
            searchPlaceholder: "Search videos...",
            heroTitle: "ABDULMALEK<br>ALAWADHI",
            heroSubtitle: "PROFESSIONAL VIDEO EDITOR",
            heroBtn: '<i class="fas fa-play"></i> VIEW PORTFOLIO',
            allWorks: "ALL WORKS",
            loading: "Loading cinematic works...",
            noResults: "No works found matching your search.",
            resetSearchBtn: "Reset Search 🔄",
            subTitle: "STAY UPDATED",
            subSubtitle: "Get notified about latest projects & behind-the-scenes content",
            subEmailPlaceholder: "your@email.com",
            subBtn: "SUBSCRIBE",
            subscribing: "SUBSCRIBING...",
            subSuccess: "✓ Thank you for subscribing!",
            subError: "❌ Failed to subscribe",
            footerDesc: "Bringing stories to life through the lens.",
            footerCopy: "© 2026 ABDULMALEK ALAWADHI. All Rights Reserved.",
            adminBtn: '<i class="fas fa-lock"></i> Admin Panel',
            categories: {
                ALL: "ALL",
                Reels: "Reels",
                Events: "Events",
                "Short Films": "Short Films",
                Ads: "Ads",
                Interviews: "Interviews",
                BTS: "BTS",
                Podcast: "Podcast",
                "Brand Films": "Brand Films",
                "Music Videos": "Music Videos",
                Documentaries: "Documentaries",
                "Social Media": "Social Media",
                Commercial: "Commercial",
                Promo: "Promo",
                Recap: "Recap"
            }
        }
    };

    // ── Apply Language Translation
    function applyLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('portfolio_lang_v2', lang);

        const t = i18n[lang] || i18n.en;

        // HTML attributes
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

        // Toggle Button Text
        if (langToggleBtn) langToggleBtn.textContent = t.toggleBtn;

        // Static Text Elements
        const elLogoSub    = document.getElementById('i18n-logo-sub');
        const elHeroTitle  = document.getElementById('i18n-hero-title');
        const elHeroSub    = document.getElementById('i18n-hero-subtitle');
        const elHeroBtn    = document.getElementById('i18n-hero-btn');
        const elAllWorks   = document.getElementById('i18n-all-works');
        const elSubTitle   = document.getElementById('i18n-sub-title');
        const elSubSub     = document.getElementById('i18n-sub-subtitle');
        const elSubEmail   = document.getElementById('subscribe-email');
        const elSubBtn     = document.getElementById('subscribe-btn');
        const elFooterDesc = document.getElementById('i18n-footer-desc');
        const elFooterCopy = document.getElementById('i18n-footer-copy');
        const elAdminBtn   = document.getElementById('i18n-admin-btn');

        if (elLogoSub)    elLogoSub.textContent = t.logoSub;
        if (elHeroTitle)  elHeroTitle.innerHTML = t.heroTitle;
        if (elHeroSub)    elHeroSub.textContent = t.heroSubtitle;
        if (elHeroBtn)    elHeroBtn.innerHTML = t.heroBtn;
        if (elAllWorks)   elAllWorks.textContent = t.allWorks;
        if (elSubTitle)   elSubTitle.textContent = t.subTitle;
        if (elSubSub)     elSubSub.textContent = t.subSubtitle;
        if (elSubEmail)   elSubEmail.setAttribute('placeholder', t.subEmailPlaceholder);
        if (elSubBtn)     elSubBtn.textContent = t.subBtn;
        if (elFooterDesc) elFooterDesc.textContent = t.footerDesc;
        if (elFooterCopy) elFooterCopy.textContent = t.footerCopy;
        if (elAdminBtn)   elAdminBtn.innerHTML = t.adminBtn;
        if (searchInput)  searchInput.setAttribute('placeholder', t.searchPlaceholder);
        const elDescSpan = document.querySelector('#i18n-desc-header span');
        if (elDescSpan)   elDescSpan.textContent = (lang === 'ar') ? 'تفاصيل الوصف' : 'Description';

        // Re-render categories & videos with translated category names
        buildCategoryButtons();
        renderVideos();
    }

    // Toggle Language Listener
    langToggleBtn?.addEventListener('click', () => {
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        applyLanguage(newLang);
    });

    // ── Fetch Settings & Update UI
    async function fetchSettings() {
        try {
            const res = await fetch('/api/settings');
            if (!res.ok) return;
            const json = await res.json();
            if (json.success && json.data) {
                const s = json.data;
                // Social Links
                const socialContainer = document.querySelector('.social-links');
                if (socialContainer && s.contact) {
                    const wa = s.contact.wa ? (s.contact.wa.startsWith('http') ? s.contact.wa : `https://wa.me/${s.contact.wa.replace(/[^\d]/g, '')}`) : '#';
                    const ig = s.contact.ig ? (s.contact.ig.startsWith('http') ? s.contact.ig : `https://instagram.com/${s.contact.ig.replace('@', '')}`) : '#';
                    const li = s.contact.li ? (s.contact.li.startsWith('http') ? s.contact.li : `https://${s.contact.li}`) : '#';

                    socialContainer.innerHTML = `
                        <a href="${wa}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a>
                        <a href="${ig}" target="_blank" rel="noopener"><i class="fab fa-instagram"></i></a>
                        <a href="${li}" target="_blank" rel="noopener"><i class="fab fa-linkedin"></i></a>
                    `;
                }

                // ── Hero Background (Video Loop or Static Image)
                const hero = document.querySelector('.hero');
                const bgType = s.heroBgType || (s.heroImageUrl ? 'image' : (s.videoLoopUrl || s.bgVideoUrl ? 'video' : 'none'));
                
                let bgVideo = document.getElementById('hero-bg-video');
                let bgImage = document.getElementById('hero-bg-image');

                if (hero) {
                    if (bgType === 'image' && s.heroImageUrl) {
                        if (bgVideo) bgVideo.remove();
                        if (!bgImage) {
                            bgImage = document.createElement('img');
                            bgImage.id = 'hero-bg-image';
                            bgImage.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; opacity:0.85; pointer-events:none;';
                            hero.insertBefore(bgImage, hero.firstChild);
                        }
                        bgImage.src = s.heroImageUrl;

                    } else if (bgType === 'video' && (s.videoLoopUrl || s.bgVideoUrl)) {
                        if (bgImage) bgImage.remove();
                        const videoSrc = s.videoLoopUrl || s.bgVideoUrl;
                        if (!bgVideo) {
                            bgVideo = document.createElement('video');
                            bgVideo.id = 'hero-bg-video';
                            bgVideo.autoplay = true;
                            bgVideo.muted = true;
                            bgVideo.loop = true;
                            bgVideo.playsInline = true;
                            bgVideo.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; opacity:0.85; pointer-events:none;';
                            hero.insertBefore(bgVideo, hero.firstChild);
                        }
                        bgVideo.src = videoSrc;

                    } else {
                        if (bgVideo) bgVideo.remove();
                        if (bgImage) bgImage.remove();
                    }
                }
            }
        } catch (e) {
            console.warn('Could not fetch settings:', e);
        }
    }

    // ── Fetch Videos from API
    async function fetchVideos() {
        try {
            const response = await fetch('/api/videos');
            if (!response.ok) throw new Error('Failed to fetch videos');
            
            const data = await response.json();
            allVideos = data.data || data || [];

            buildCategoryButtons();
            renderVideos();
        } catch (error) {
            console.error('Error fetching videos:', error);
            const t = i18n[currentLang] || i18n.en;
            videoGrid.innerHTML = `<div class="loading">${t.loading}</div>`;
        }
    }

    let serverCategories = null;

    async function fetchCategories() {
        try {
            const res = await fetch('/api/settings/categories');
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    serverCategories = json.data;
                }
            }
        } catch (e) {
            console.warn('Could not fetch categories from server:', e);
        }
    }

    // ── Build Category Buttons Dynamically
    async function buildCategoryButtons() {
        if (!categoryFiltersContainer) return;

        if (!serverCategories) {
            await fetchCategories();
        }
        
        const dbCategories = [...new Set(allVideos.map(v => v.category).filter(Boolean))];
        const defaultCategories = [
            'Reels',
            'Events',
            'Short Films',
            'Ads',
            'Interviews',
            'BTS',
            'Podcast',
            'Brand Films',
            'Music Videos',
            'Documentaries',
            'Social Media',
            'Commercial',
            'Promo',
            'Recap'
        ];

        const managedCategories = (serverCategories && serverCategories.length > 0)
            ? serverCategories
            : defaultCategories;

        const allCats = [...managedCategories];
        dbCategories.forEach(cat => {
            if (!allCats.some(d => d.toLowerCase() === cat.toLowerCase())) {
                allCats.push(cat);
            }
        });

        const dict = (i18n[currentLang] && i18n[currentLang].categories) ? i18n[currentLang].categories : {};

        let html = `<button class="filter-btn ${activeCategory === 'ALL' ? 'active' : ''}" data-category="ALL">${dict.ALL || 'الكل'}</button>`;
        allCats.forEach(cat => {
            const label = dict[cat] || cat;
            html += `<button class="filter-btn ${activeCategory.toUpperCase() === cat.toUpperCase() ? 'active' : ''}" data-category="${cat}">${label}</button>`;
        });

        categoryFiltersContainer.innerHTML = html;

        categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCategory = btn.getAttribute('data-category');
                renderVideos();
            });
        });
    }

    // Normalize text for search comparison (strips Arabic diacritics / hamza)
    function normalizeText(txt) {
        if (!txt) return '';
        return txt.toLowerCase()
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .trim();
    }

    // ── Render Videos Grid with Search & Filters
    function renderVideos() {
        if (!videoGrid) return;
        videoGrid.innerHTML = '';

        const normQuery = normalizeText(searchQuery);

        let filtered = allVideos.filter(v => {
            const matchesCat = (activeCategory === 'ALL') || (v.category && v.category.toUpperCase() === activeCategory.toUpperCase());
            
            let matchesSearch = true;
            if (normQuery) {
                const titleNorm = normalizeText(v.title);
                const catNorm   = normalizeText(v.category);
                const descNorm  = normalizeText(v.description);
                const chNorm    = normalizeText(v.channel);

                // Check Arabic translation of category as well
                const arCatNorm = i18n.ar.categories[v.category] ? normalizeText(i18n.ar.categories[v.category]) : '';
                const enCatNorm = i18n.en.categories[v.category] ? normalizeText(i18n.en.categories[v.category]) : '';

                matchesSearch = titleNorm.includes(normQuery) || 
                                catNorm.includes(normQuery)   || 
                                descNorm.includes(normQuery)  || 
                                chNorm.includes(normQuery)    ||
                                arCatNorm.includes(normQuery) ||
                                enCatNorm.includes(normQuery);
            }

            return matchesCat && matchesSearch;
        });

        const t = i18n[currentLang] || i18n.en;

        if (filtered.length === 0) {
            videoGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: #888;">
                    <i class="fas fa-search" style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color); opacity: 0.8;"></i>
                    <p style="font-size: 1.1rem; margin-bottom: 1.5rem;">${t.noResults}</p>
                    <button id="reset-search-btn" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid #333; padding: 0.6rem 1.5rem; border-radius: 20px; cursor: pointer; font-size: 0.9rem;">
                        ${t.resetSearchBtn}
                    </button>
                </div>
            `;
            document.getElementById('reset-search-btn')?.addEventListener('click', () => {
                searchQuery = '';
                if (searchInput) searchInput.value = '';
                activeCategory = 'ALL';
                buildCategoryButtons();
                renderVideos();
            });
            return;
        }

        const isReelsView = activeCategory.toUpperCase() === 'REELS';
        if (isReelsView) {
            videoGrid.classList.add('reels-grid');
        } else {
            videoGrid.classList.remove('reels-grid');
        }

        filtered.forEach(video => {
            const card = document.createElement('div');
            const isReel = (video.category && video.category.toUpperCase() === 'REELS') || isInstagramUrl(video.videoUrl) || /youtube\.com\/shorts|youtu\.be\/shorts|tiktok\.com/i.test(video.videoUrl || '');
            card.className = (isReelsView && isReel) ? 'video-card reel-card' : 'video-card';
            
            let thumbSrc = video.thumbnail;
            if (!thumbSrc && video.videoUrl) {
                if (video.videoUrl.includes('youtube') || video.videoUrl.includes('youtu.be')) {
                    const ytId = extractYouTubeID(video.videoUrl);
                    if (ytId) thumbSrc = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                }
            }
            if (!thumbSrc && isReel) {
                thumbSrc = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=600&auto=format&fit=crop';
            }
            if (!thumbSrc) {
                thumbSrc = 'https://via.placeholder.com/600x400/12121e/f5a623?text=Abdulmalek+Portfolio';
            }

            const playIcon = isReel 
                ? '<i class="fab fa-instagram play-icon-overlay reel-icon"></i>' 
                : '<i class="fas fa-play play-icon-overlay"></i>';

            const catDisplay = (i18n[currentLang] && i18n[currentLang].categories[video.category])
                ? i18n[currentLang].categories[video.category]
                : (video.category || 'WORK');

            card.innerHTML = `
                <img src="${thumbSrc}" alt="${video.title}" class="video-thumbnail" loading="lazy">
                ${playIcon}
                <div class="video-info">
                    <h4 class="video-title">${video.title}</h4>
                    <span class="video-category">${catDisplay}</span>
                </div>
            `;

            // Hover preview
            let hoverTimer = null;

            card.addEventListener('mouseenter', () => {
                card.classList.add('hover-previewing');
                clearTimeout(hoverTimer);

                hoverTimer = setTimeout(() => {
                    let previewEl = card.querySelector('.hover-preview-media');
                    if (!previewEl) {
                        previewEl = createHoverPreviewElement(video.videoUrl || video.filePath || '');
                        if (previewEl) {
                            card.insertBefore(previewEl, card.firstChild);
                            if (previewEl.tagName === 'VIDEO') {
                                previewEl.play().catch(() => {});
                            }
                        }
                    }
                }, 120);
            });

            card.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimer);
                card.classList.remove('hover-previewing');
                const previewEl = card.querySelector('.hover-preview-media');
                if (previewEl) {
                    if (previewEl.tagName === 'VIDEO') {
                        previewEl.pause();
                    }
                    previewEl.remove();
                }
            });

            card.addEventListener('click', () => openModal(video));
            videoGrid.appendChild(card);
        });
    }

    // ── Universal Hover Preview Element Generator
    function createHoverPreviewElement(videoUrl) {
        if (!videoUrl) return null;
        const url = videoUrl.trim();

        if (url.startsWith('/uploads/') || /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)) {
            const vid = document.createElement('video');
            vid.className = 'hover-preview-media';
            vid.src = url;
            vid.muted = true;
            vid.loop = true;
            vid.setAttribute('playsinline', '');
            vid.setAttribute('autoplay', '');
            return vid;
        }

        const ytId = extractYouTubeID(url);
        if (ytId) {
            const iframe = document.createElement('iframe');
            iframe.className = 'hover-preview-media';
            iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${ytId}&playsinline=1&enablejsapi=1`;
            iframe.setAttribute('allow', 'autoplay; encrypted-media');
            iframe.setAttribute('frameborder', '0');
            return iframe;
        }

        if (url.includes('vimeo.com')) {
            const vimeoId = url.split('/').pop();
            if (vimeoId) {
                const iframe = document.createElement('iframe');
                iframe.className = 'hover-preview-media';
                iframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&background=1&loop=1`;
                iframe.setAttribute('allow', 'autoplay; encrypted-media');
                iframe.setAttribute('frameborder', '0');
                return iframe;
            }
        }

        const instaShortcode = extractInstagramShortcode(url);
        if (instaShortcode) {
            const iframe = document.createElement('iframe');
            iframe.className = 'hover-preview-media hover-preview-insta';
            iframe.src = `https://www.instagram.com/reel/${instaShortcode}/embed/`;
            iframe.setAttribute('allow', 'autoplay; encrypted-media');
            iframe.setAttribute('frameborder', '0');
            return iframe;
        }

        return null;
    }

    // ── Helper Functions
    function extractYouTubeID(url) {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function extractInstagramShortcode(url) {
        if (!url) return null;
        const match = url.match(/(?:instagram\.com|instagr\.am)\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/i);
        return match ? match[1] : null;
    }

    function isInstagramUrl(url) {
        return !!extractInstagramShortcode(url);
    }

    // ── Open Modal Function
    function openModal(video) {
        if (!modal) return;
        const modalContent = document.querySelector('.modal-content');

        // ── Populate title
        const titleEl = modalTitle || document.getElementById('modal-title');
        const descEl  = modalDesc  || document.getElementById('modal-desc');
        if (titleEl) titleEl.textContent = video.title || '';
        if (descEl)  descEl.textContent  = video.description || '';

        // ── Populate Badges
        const catBadge     = document.getElementById('modal-cat-badge');
        const viewsBadge   = document.getElementById('modal-views-badge');
        const channelBadge = document.getElementById('modal-channel-badge');
        const channelName  = document.getElementById('modal-channel-name');

        if (catBadge) {
            const catLabel = (i18n[currentLang] && i18n[currentLang].categories[video.category])
                ? i18n[currentLang].categories[video.category]
                : (video.category || 'WORK');
            catBadge.textContent = catLabel;
        }

        if (viewsBadge) {
            const views = video.views || 0;
            const viewsFormatted = views >= 1000
                ? (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
                : String(views);
            viewsBadge.innerHTML = `<i class="fas fa-eye"></i> ${viewsFormatted}`;
        }

        if (channelBadge && channelName) {
            if (video.channel && video.channel.trim()) {
                channelName.textContent = video.channel.trim();
                channelBadge.classList.remove('hidden');
            } else {
                channelBadge.classList.add('hidden');
            }
        }

        // ── Build video embed
        const isDirectVideo = (video.videoUrl && (video.videoUrl.startsWith('/uploads/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(video.videoUrl)));
        let iframeSrc = video.videoUrl || video.filePath || '';

        const ytId = extractYouTubeID(iframeSrc);
        const instaShortcode = extractInstagramShortcode(iframeSrc);
        const tiktokMatch = (video.videoUrl || '').match(/(?:tiktok\.com)\/(?:@[\w.-]+\/video\/|v\/)?(\d+)/i);
        const tiktokId = tiktokMatch ? tiktokMatch[1] : null;

        if (ytId) {
            iframeSrc = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
        }

        // ── Detect if Reel / Vertical Video
        const isReel = (video.category && video.category.toLowerCase() === 'reels') ||
                       !!instaShortcode || !!tiktokId ||
                       /youtube\.com\/shorts|youtu\.be\/shorts/i.test(video.videoUrl || '');

        if (isReel) {
            modalContent.classList.add('reels-modal');
        } else {
            modalContent.classList.remove('reels-modal');
        }

        if (isDirectVideo) {
            iframeContainer.innerHTML = `
                <video src="${iframeSrc}" controls autoplay playsinline style="width:100%; height:100%; object-fit:contain; background:#000;"></video>
            `;
        } else if (ytId) {
            iframeContainer.innerHTML = `
                <iframe src="${iframeSrc}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>
            `;
        } else if (instaShortcode) {
            iframeContainer.innerHTML = `
                <div class="reel-embed-wrapper" style="display:flex; flex-direction:column; align-items:center; width:100%; height:100%;">
                    <iframe src="https://www.instagram.com/p/${instaShortcode}/embed/captioned/" 
                            allow="autoplay; encrypted-media" 
                            allowfullscreen 
                            frameborder="0"
                            scrolling="no"
                            style="width:100%; height:480px; border:none; border-radius:12px; background:#000;">
                    </iframe>
                    <a href="https://www.instagram.com/reel/${instaShortcode}/" target="_blank" rel="noopener" class="reel-external-btn" style="margin-top:10px; margin-bottom:10px; display:inline-flex; align-items:center; gap:8px; padding:8px 18px; background:linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color:#fff; border-radius:20px; font-size:0.82rem; font-weight:600; text-decoration:none;">
                        <i class="fab fa-instagram"></i> مشاهدة الفيديو مباشرة على انستغرام ↗
                    </a>
                </div>
            `;
        } else if (tiktokId) {
            iframeContainer.innerHTML = `
                <div class="reel-embed-wrapper" style="display:flex; flex-direction:column; align-items:center; width:100%; height:100%;">
                    <iframe src="https://www.tiktok.com/embed/v2/${tiktokId}" 
                            allow="autoplay; encrypted-media" 
                            allowfullscreen 
                            frameborder="0"
                            style="width:100%; height:500px; border:none; border-radius:12px; background:#000;">
                    </iframe>
                    <a href="${rawUrl}" target="_blank" rel="noopener" class="reel-external-btn" style="margin-top:10px; margin-bottom:10px; display:inline-flex; align-items:center; gap:8px; padding:8px 18px; background:#fe2c55; color:#fff; border-radius:20px; font-size:0.82rem; font-weight:600; text-decoration:none;">
                        <i class="fab fa-tiktok"></i> مشاهدة الفيديو مباشرة على تيك توك ↗
                    </a>
                </div>
            `;
        } else if (iframeSrc) {
            iframeContainer.innerHTML = `<iframe src="${iframeSrc}" allow="autoplay; encrypted-media" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>`;
        } else {
            iframeContainer.innerHTML = '<div style="color:#888; padding:40px; text-align:center; font-size:0.95rem;">عذراً، رابط الفيديو غير متاح حالياً.</div>';
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Increment view counter (fire-and-forget)
        if (video._id) {
            fetch(`/api/videos/${video._id}/view`, { method: 'PATCH' }).catch(() => {});
            // Update local count so badge reflects immediately
            video.views = (video.views || 0) + 1;
        }
    }

    // ── Close Modal
    function hideModal() {
        if (!modal) return;
        modal.style.display = 'none';
        iframeContainer.innerHTML = '';
        document.body.style.overflow = 'auto';
        document.querySelector('.modal-content')?.classList.remove('reels-modal');
    }

    closeModal?.addEventListener('click', hideModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // ── Live Search Dropdown Box Render
    const searchDropdown = document.getElementById('search-results-dropdown');

    function renderSearchResultsDropdown() {
        if (!searchDropdown) return;

        const normQuery = normalizeText(searchQuery);

        if (!normQuery) {
            searchDropdown.innerHTML = '';
            searchDropdown.classList.add('hidden');
            return;
        }

        const matches = allVideos.filter(v => {
            const titleNorm = normalizeText(v.title);
            const catNorm   = normalizeText(v.category);
            const descNorm  = normalizeText(v.description);
            const chNorm    = normalizeText(v.channel);
            const arCatNorm = i18n.ar.categories[v.category] ? normalizeText(i18n.ar.categories[v.category]) : '';
            const enCatNorm = i18n.en.categories[v.category] ? normalizeText(i18n.en.categories[v.category]) : '';

            return titleNorm.includes(normQuery) || 
                   catNorm.includes(normQuery)   || 
                   descNorm.includes(normQuery)  || 
                   chNorm.includes(normQuery)    ||
                   arCatNorm.includes(normQuery) ||
                   enCatNorm.includes(normQuery);
        });

        const t = i18n[currentLang] || i18n.en;

        if (matches.length === 0) {
            searchDropdown.innerHTML = `<div class="search-result-empty">${t.noResults}</div>`;
            searchDropdown.classList.remove('hidden');
            return;
        }

        searchDropdown.innerHTML = matches.map(v => {
            let thumbSrc = v.thumbnail;
            if (!thumbSrc && v.videoUrl) {
                const ytId = extractYouTubeID(v.videoUrl);
                if (ytId) thumbSrc = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }
            if (!thumbSrc) {
                thumbSrc = 'https://via.placeholder.com/600x400/12121e/f5a623?text=Video';
            }

            const catDisplay = (i18n[currentLang] && i18n[currentLang].categories[v.category])
                ? i18n[currentLang].categories[v.category]
                : (v.category || 'WORK');

            return `
                <div class="search-result-item" data-id="${v._id}">
                    <img src="${thumbSrc}" alt="${v.title}" class="search-result-thumb" />
                    <div class="search-result-info">
                        <span class="search-result-title">${v.title}</span>
                        <span class="search-result-cat">${catDisplay}</span>
                    </div>
                </div>
            `;
        }).join('');

        searchDropdown.classList.remove('hidden');
    }

    // ── Direct Click Delegation on Search Results Dropdown -> Open Playback Modal
    searchDropdown?.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (!item) return;

        e.preventDefault();
        e.stopPropagation();

        const videoId = item.getAttribute('data-id');
        const targetVideo = allVideos.find(v => String(v._id) === String(videoId));

        if (targetVideo) {
            searchDropdown.classList.add('hidden');
            openModal(targetVideo);
        }
    });

    // ── Live Search Input Events
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderVideos();
        renderSearchResultsDropdown();
    });

    searchInput?.addEventListener('focus', () => {
        if (searchQuery.trim()) {
            renderSearchResultsDropdown();
        }
    });

    searchIcon?.addEventListener('click', () => {
        if (searchInput) searchQuery = searchInput.value;
        renderVideos();
        renderSearchResultsDropdown();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar')) {
            searchDropdown?.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchDropdown?.classList.add('hidden');
        }
    });

    // ── Subscribe Form Handler
    const subscribeForm  = document.getElementById('subscribe-form');
    const subscribeEmail = document.getElementById('subscribe-email');
    const subscribeBtn   = document.getElementById('subscribe-btn');
    const subscribeMsg   = document.getElementById('subscribe-msg');

    subscribeForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = subscribeEmail.value.trim();
        if (!email) return;

        subscribeBtn.disabled = true;
        const originalText = subscribeBtn.textContent;
        const t = i18n[currentLang] || i18n.en;

        subscribeBtn.textContent = t.subscribing;
        subscribeMsg.className = 'subscribe-msg hidden';

        try {
            const res = await fetch('/api/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                subscribeMsg.textContent = t.subSuccess;
                subscribeMsg.className = 'subscribe-msg success';
                subscribeForm.reset();
            } else {
                subscribeMsg.textContent = '❌ ' + (data.error || t.subError);
                subscribeMsg.className = 'subscribe-msg error';
            }
        } catch (err) {
            subscribeMsg.textContent = '❌ ' + t.subError;
            subscribeMsg.className = 'subscribe-msg error';
        } finally {
            subscribeBtn.disabled = false;
            subscribeBtn.textContent = originalText;
        }
    });

    // ── Init App & Apply Saved Language
    applyLanguage(currentLang);
    fetchSettings();
    fetchVideos();
});
