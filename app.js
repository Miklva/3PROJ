/* ==========================================================================
   KazaERP v2.0 - Logique Frontend Connectée à l'API SQLite
   ========================================================================== */

// --- CONFIGURATION ET PARAMÈTRES DE BASE ---
// Icônes d'aliments par défaut pour la galerie rapide
const DEFAULT_FOOD_ICONS = [
    { emoji: '🍎', name: 'Pomme', cat: 'FruitsLegumes' },
    { emoji: '🍌', name: 'Banane', cat: 'FruitsLegumes' },
    { emoji: '🥕', name: 'Carotte', cat: 'FruitsLegumes' },
    { emoji: '🍅', name: 'Tomate', cat: 'FruitsLegumes' },
    { emoji: '🥚', name: 'Oeufs', cat: 'ProduitsLaitiers' },
    { emoji: '🥛', name: 'Lait', cat: 'ProduitsLaitiers' },
    { emoji: '🧀', name: 'Fromage', cat: 'ProduitsLaitiers' },
    { emoji: '🥩', name: 'Viande', cat: 'ViandesPoissons' },
    { emoji: '🍗', name: 'Poulet', cat: 'ViandesPoissons' },
    { emoji: '🐟', name: 'Poisson', cat: 'ViandesPoissons' },
    { emoji: '🍝', name: 'Pâtes', cat: 'Epicerie' },
    { emoji: '🍚', name: 'Riz', cat: 'Epicerie' },
    { emoji: '🍞', name: 'Pain', cat: 'Boulangerie' },
    { emoji: '🥐', name: 'Croissant', cat: 'Boulangerie' },
    { emoji: '🧃', name: 'Jus', cat: 'Boissons' },
    { emoji: '☕', name: 'Café', cat: 'Boissons' },
    { emoji: '🍕', name: 'Pizza', cat: 'Surgeles' },
    { emoji: '🍦', name: 'Glace', cat: 'Surgeles' }
];

// État de l'application en mémoire
const state = {
    activeTab: 'dashboard',
    products: [],
    familyMembers: [],
    history: [],
    shoppingList: [],
    suggestions: [],
    meals: [],
    sessionItems: [], // Articles de la session en cours de création
    settings: { familyName: 'Famille Souici' },
    selectedDefaultIcon: null,
    cameraStream: null,
    activeUserForAction: null,
    financePeriod: 'month' // Période active pour les stats finances
};

// Références globales pour les instances Chart.js afin de pouvoir les réinitialiser proprement
let monthlyChartInstance = null;
let categoryChartInstance = null;

// --- INITIALISATION DE L'APPLICATION ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    try {
        // 1. Initialisation PRIORITAIRE des composants UI
        // On rend l'interface interactive tout de suite
        setupNavigation();
        setupEventListeners();
        setupPhotoComponents();
        lucide.createIcons();

        showToast('Connexion au serveur KazaERP SQLite...', 'info');
        
        // 2. Chargement des données en arrière-plan
        await loadAllData();
        
        // 3. Rendu final avec les données
        renderAll();
        
        showToast('KazaERP SQLite Connecté !', 'success');
    } catch (error) {
        console.error('Erreur lors du démarrage du frontend :', error);
        showToast('Erreur : Serveur SQLite introuvable. Vérifiez que server.js tourne !', 'error');
        // On affiche quand même l'interface (vide) pour que l'utilisateur puisse naviguer
        renderAll();
    }
}

// ==========================================================================
// CONNECTEUR API REST (FETCH WRAPPER)
// ==========================================================================

async function apiFetch(endpoint, options = {}) {
    const url = `${window.location.origin}${endpoint}`;
    
    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json'
        };
    }
    
    const res = await fetch(url, options);
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error [${res.status}]: ${errorText || res.statusText}`);
    }
    return res.json();
}

// ==========================================================================
// CHARGEMENT DES DONNÉES DEPUIS LE BACKEND SQLITE
// ==========================================================================

async function loadAllData() {
    const settingsData = await apiFetch('/api/settings/family-name');
    state.settings.familyName = settingsData.familyName;
    state.familyMembers = await apiFetch('/api/family');
    state.products = await apiFetch('/api/products');
    state.history = await apiFetch('/api/history');
    state.shoppingList = await apiFetch('/api/shopping');
    state.meals = await apiFetch('/api/meals');
    // Charger les suggestions intelligentes
    try { state.suggestions = await apiFetch('/api/products/suggestions'); } catch(e) { state.suggestions = []; }
}

// ==========================================================================
// NAVIGATION SPA
// ==========================================================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            switchTab(target);
        });
    });
    
    // Gérer le hash URL initial
    const hash = window.location.hash.substring(1);
    if (hash && ['dashboard', 'stock', 'courses', 'meals', 'ia-menu', 'finances'].includes(hash)) {
        switchTab(hash);
    }
}

function switchTab(tabId) {
    state.activeTab = tabId;
    window.location.hash = tabId;
    
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        if (item.getAttribute('data-target') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`view-${tabId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    renderTab(tabId);
}

async function renderTab(tabId) {
    try {
        await loadAllData();
        switch (tabId) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'stock':
                renderStock();
                break;
            case 'courses':
                renderShoppingList();
                renderSuggestions();
                renderCoursesSessions();
                break;
            case 'meals':
                renderMeals();
                break;
            case 'finances':
                renderFinances();
                break;
        }
    } catch (err) {
        console.error('Erreur de rafraîchissement :', err);
    }
}

// ==========================================================================
// ÉCOUTEURS D'ÉVÉNEMENTS & INTERACTIONS API
// ==========================================================================

function setupEventListeners() {
    // --- MODAL PRODUIT ---
    const btnAddDash = document.getElementById('btn-add-product-dash');
    const btnAddStock = document.getElementById('btn-add-product-stock');
    const modalProduct = document.getElementById('modal-product');
    const btnCloseProduct = document.getElementById('btn-close-product-modal');
    const btnCancelProduct = document.getElementById('btn-cancel-product-modal');
    
    const openProductModal = (productToEdit = null) => {
        const form = document.getElementById('form-product');
        form.reset();

        document.getElementById('form-product-id').value = '';
        state.selectedDefaultIcon = null;
        document.getElementById('photo-uploader-placeholder').style.display = 'flex';
        document.getElementById('product-photo-preview').src = '';
        document.getElementById('product-photo-preview').style.display = 'none';
        document.getElementById('btn-delete-photo-preview').style.display = 'none';
        document.getElementById('gallery-defaults-wrapper').style.display = 'none';
        stopCamera();

        // Reset score section
        document.getElementById('score-auto-toggle').checked = true;
        document.getElementById('manual-score-wrapper').style.display = 'none';
        document.getElementById('score-current-display').style.display = 'none';
        document.getElementById('product-manual-score').value = 5;
        updateManualScoreBadge(5);
        
        if (productToEdit) {
            document.getElementById('modal-product-title').innerText = "Modifier l'Aliment";
            document.getElementById('form-product-id').value = productToEdit.id;
            document.getElementById('product-name').value = productToEdit.name;
            document.getElementById('product-brand').value = productToEdit.brand || '';
            document.getElementById('product-category').value = productToEdit.category;
            document.getElementById('product-price').value = productToEdit.price || '';
            document.getElementById('product-qty').value = productToEdit.qty;
            document.getElementById('product-unit').value = productToEdit.unit;
            document.getElementById('product-alert').value = productToEdit.alert_qty;
            document.getElementById('product-expiry').value = productToEdit.expiry_date ? productToEdit.expiry_date.split('T')[0] : '';
            
            if (productToEdit.photo) {
                if (productToEdit.photo.startsWith('data:image')) {
                    const preview = document.getElementById('product-photo-preview');
                    preview.src = productToEdit.photo;
                    preview.style.display = 'block';
                    document.getElementById('photo-uploader-placeholder').style.display = 'none';
                    document.getElementById('btn-delete-photo-preview').style.display = 'block';
                } else {
                    state.selectedDefaultIcon = productToEdit.photo;
                    document.getElementById('photo-uploader-placeholder').style.display = 'none';
                    document.getElementById('gallery-defaults-wrapper').style.display = 'block';
                    renderDefaultIconsGallery(productToEdit.photo);
                }
            }

            // Charger les données de score
            const scoreAuto = productToEdit.score_auto !== 0;
            const scoreManual = parseFloat(productToEdit.score_manual) || 5;
            const effectiveScore = scoreAuto ? productToEdit.consumption_score : scoreManual;
            const scoreVisual = getScoreVisual(effectiveScore);

            document.getElementById('score-auto-toggle').checked = scoreAuto;
            document.getElementById('manual-score-wrapper').style.display = scoreAuto ? 'none' : 'block';
            document.getElementById('product-manual-score').value = scoreManual;
            updateManualScoreBadge(scoreManual);

            const scoreDisplay = document.getElementById('score-current-display');
            scoreDisplay.style.display = 'flex';
            const scoreBadge = document.getElementById('score-badge-display');
            scoreBadge.className = `score-badge score-${scoreVisual.tier}`;
            scoreBadge.textContent = `${scoreVisual.icon} ${scoreVisual.label}`;
            document.getElementById('score-mode-text').textContent = `Mode : ${scoreAuto ? 'Automatique' : 'Manuel'}`;

        } else {
            document.getElementById('modal-product-title').innerText = "Nouveau Produit Alimentaire";
        }
        
        modalProduct.classList.add('active');
    };
    
    btnAddDash.addEventListener('click', () => openProductModal());
    btnAddStock.addEventListener('click', () => openProductModal());
    
    const closeProductModal = () => {
        modalProduct.classList.remove('active');
        stopCamera();
    };
    
    btnCloseProduct.addEventListener('click', closeProductModal);
    btnCancelProduct.addEventListener('click', closeProductModal);
    
    // Soumission formulaire produit
    document.getElementById('form-product').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('form-product-id').value;
        const name = document.getElementById('product-name').value.trim();
        const brand = document.getElementById('product-brand').value.trim();
        const category = document.getElementById('product-category').value;
        const price = parseFloat(document.getElementById('product-price').value) || 0;
        const qty = parseFloat(document.getElementById('product-qty').value);
        const unit = document.getElementById('product-unit').value;
        const alertQty = parseFloat(document.getElementById('product-alert').value);
        const expiryDate = document.getElementById('product-expiry').value;
        
        let photo = '';
        const preview = document.getElementById('product-photo-preview');
        
        if (preview.src && preview.src.startsWith('data:image')) {
            photo = preview.src;
        } else if (state.selectedDefaultIcon) {
            photo = state.selectedDefaultIcon;
        } else {
            const catDefaults = DEFAULT_FOOD_ICONS.filter(i => i.cat === category);
            photo = catDefaults.length > 0 ? catDefaults[0].emoji : '📦';
        }
        
        const scoreAuto = document.getElementById('score-auto-toggle').checked;
        const scoreManual = parseFloat(document.getElementById('product-manual-score').value) || 5;

        const productData = {
            id: id ? parseInt(id) : undefined,
            name,
            brand,
            category,
            price,
            qty,
            unit,
            alertQty,
            expiryDate,
            photo,
            scoreAuto,
            scoreManual
        };
        
        try {
            await apiFetch('/api/products', {
                method: 'POST',
                body: productData
            });
            
            const activeMember = state.familyMembers[0] ? state.familyMembers[0].name : 'Rayan';
            if (id) {
                await logActivity('edit', `Le produit **${name}** a été mis à jour par **${activeMember}**.`);
                showToast('Produit mis à jour avec succès', 'success');
            } else {
                await logActivity('add', `Nouveau produit ajouté par **${activeMember}** : **${name}** (${qty} ${unit}).`);
                showToast('Produit ajouté au stock', 'success');
            }
            
            closeProductModal();
            await loadAllData();
            renderAll();
        } catch (err) {
            console.error(err);
            showToast('Erreur lors de la sauvegarde du produit', 'error');
        }
    });

    // --- RECHERCHE ET FILTRES ---
    document.getElementById('stock-search').addEventListener('input', () => renderStock());
    document.getElementById('stock-filter-category').addEventListener('change', () => renderStock());
    document.getElementById('stock-filter-status').addEventListener('change', () => renderStock());

    // --- GESTION DE LA FAMILLE ---
    const btnManageFamilySidebar = document.getElementById('btn-manage-family-sidebar');
    const btnManageFamilyDash = document.getElementById('btn-manage-family');
    const modalFamily = document.getElementById('modal-family');
    const btnCloseFamily = document.getElementById('btn-close-family-modal');
    const btnCloseFamilyOk = document.getElementById('btn-close-family-modal-ok');
    
    const openFamilyModal = () => {
        document.getElementById('family-name-input').value = state.settings.familyName;
        renderFamilyModalList();
        modalFamily.classList.add('active');
    };
    
    btnManageFamilySidebar.addEventListener('click', openFamilyModal);
    btnManageFamilyDash.addEventListener('click', openFamilyModal);
    
    const closeFamilyModal = () => {
        modalFamily.classList.remove('active');
    };
    
    btnCloseFamily.addEventListener('click', closeFamilyModal);
    btnCloseFamilyOk.addEventListener('click', closeFamilyModal);
    
    document.getElementById('btn-save-family-name').addEventListener('click', async () => {
        const inputName = document.getElementById('family-name-input').value.trim();
        if (inputName) {
            await apiFetch('/api/settings/family-name', {
                method: 'POST',
                body: { familyName: inputName }
            });
            showToast('Nom du foyer enregistré', 'success');
            await loadAllData();
            renderDashboard();
        }
    });
    
    document.getElementById('btn-add-member').addEventListener('click', async () => {
        const nameInput = document.getElementById('member-name-input');
        const roleSelect = document.getElementById('member-role-input');
        const name = nameInput.value.trim();
        const role = roleSelect.value;
        
        if (name) {
            const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#f43f5e'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            await apiFetch('/api/family', {
                method: 'POST',
                body: { name, role, avatarColor: randomColor }
            });
            
            nameInput.value = '';
            showToast(`${name} a rejoint le foyer !`, 'success');
            
            await loadAllData();
            renderDashboard();
            renderFamilyModalList();
        }
    });

    // --- HISTORIQUE ---
    document.getElementById('btn-clear-history').addEventListener('click', async () => {
        if (confirm("Voulez-vous vraiment effacer tout le journal d'activité ?")) {
            await apiFetch('/api/history', { method: 'DELETE' });
            showToast('Historique effacé', 'info');
            await loadAllData();
            renderDashboard();
        }
    });

    // --- COURSES : AJOUT MANUEL ---
    document.getElementById('btn-quick-shopping-add').addEventListener('click', () => {
        addManualShoppingItem();
    });
    document.getElementById('quick-shopping-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addManualShoppingItem();
        }
    });
    
    document.getElementById('btn-complete-shopping').addEventListener('click', async () => {
        await completeCheckedShoppingItems();
    });
    
    document.getElementById('btn-share-courses').addEventListener('click', () => {
        shareShoppingList();
    });

    // --- IA CHAT ---
    document.getElementById('btn-ia-suggest-recipes').addEventListener('click', () => {
        triggerIASuggestRecipes();
    });
    document.getElementById('btn-ia-predict-shopping').addEventListener('click', () => {
        triggerIAPredictShopping();
    });
    document.getElementById('ia-chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        sendIAChatMessage();
    });

    // Écouteur global d'édition
    document.addEventListener('open-edit', (e) => {
        openProductModal(e.detail);
    });

    // --- SCORE : Toggle auto/manuel ---
    document.getElementById('score-auto-toggle').addEventListener('change', (e) => {
        const manualWrapper = document.getElementById('manual-score-wrapper');
        const modeText = document.getElementById('score-mode-text');
        manualWrapper.style.display = e.target.checked ? 'none' : 'block';
        if (modeText) modeText.textContent = `Mode : ${e.target.checked ? 'Automatique' : 'Manuel'}`;
    });

    // --- SCORE : Range slider manuel ---
    document.getElementById('product-manual-score').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        updateManualScoreBadge(value);
    });

    // --- SCORE : Bouton recalculer ---
    document.getElementById('btn-recalculate-scores').addEventListener('click', async () => {
        showToast('Recalcul des scores en cours...', 'info');
        try {
            const result = await apiFetch('/api/products/recalculate-scores', { method: 'POST' });
            showToast(`Scores recalculés pour ${result.updated} produit(s) !`, 'success');
            await loadAllData();
            renderStock();
        } catch (err) {
            console.error(err);
            showToast('Erreur lors du recalcul des scores', 'error');
        }
    });

    // --- SCAN DE TICKET ---
    const btnScan = document.getElementById('btn-scan-receipt');
    const inputScan = document.getElementById('input-receipt-upload');
    
    btnScan.addEventListener('click', () => inputScan.click());
    
    inputScan.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const statusText = document.getElementById('scan-status');
        statusText.style.display = 'block';
        showToast('Envoi du ticket à l\'IA...', 'info');
        
        try {
            // Conversion en base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Image = reader.result;
                
                const data = await apiFetch('/api/ai/scan-receipt', {
                    method: 'POST',
                    body: { image: base64Image }
                });
                
                if (data.store) {
                    document.getElementById('modal-session-store').value = data.store;
                }
                
                if (data.items && data.items.length > 0) {
                    data.items.forEach(item => {
                        state.sessionItems.push({
                            product_id: null,
                            name: item.name,
                            brand: item.brand || '',
                            unit: item.unit || 'pièces',
                            qty: item.qty || 1,
                            price: item.price || 0,
                            photo: '📦',
                            category: item.category || 'Epicerie',
                            expiry_date: item.expiry_date || null
                        });
                    });
                    renderSessionItemsList();
                    showToast(`${data.items.length} produits extraits du ticket !`, 'success');
                }
                statusText.style.display = 'none';
            };
        } catch (err) {
            console.error(err);
            showToast('Erreur lors du scan du ticket', 'error');
            statusText.style.display = 'none';
        }
    });

    // --- SESSIONS DE COURSES : Modal ---
    document.getElementById('btn-open-session-modal').addEventListener('click', openSessionModal);
    document.getElementById('btn-close-session-modal').addEventListener('click', closeSessionModal);
    document.getElementById('btn-cancel-session-modal').addEventListener('click', closeSessionModal);
    document.getElementById('btn-save-session-modal').addEventListener('click', saveSessionModal);

    // Fermer modal session en cliquant sur l'overlay
    document.getElementById('modal-session').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal-session')) closeSessionModal();
    });

    // Recherche produit dans le modal session
    document.getElementById('session-product-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const dropdown = document.getElementById('session-search-dropdown');

        if (query.length < 1) { dropdown.style.display = 'none'; return; }

        const matches = state.products.filter(p => p.name.toLowerCase().includes(query)).slice(0, 8);
        if (matches.length === 0) { dropdown.style.display = 'none'; return; }

        dropdown.innerHTML = '';
        matches.forEach(product => {
            const icon = product.photo && !product.photo.startsWith('data:') ? product.photo : '📦';
            const div = document.createElement('div');
            div.className = 'session-search-result';
            div.innerHTML = `
                <span style="font-size:1.4rem;">${icon}</span>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:0.88rem;">${product.name} ${product.brand ? `<span style="font-weight:400;color:var(--text-muted);">(${product.brand})</span>` : ''}</div>
                    <div style="font-size:0.73rem;color:var(--text-muted);">
                        Stock : ${product.qty} ${product.unit}
                        ${product.price > 0 ? ' · ' + product.price.toFixed(2) + ' €/unité' : ''}
                    </div>
                </div>
                <span class="badge badge-info" style="font-size:0.7rem;">${getCategoryFriendlyName(product.category)}</span>
            `;
            div.addEventListener('mousedown', (ev) => { // mousedown pour éviter blur avant click
                ev.preventDefault();
                addProductToSession(product);
            });
            dropdown.appendChild(div);
        });
        dropdown.style.display = 'block';
    });

    // Fermer le dropdown si clic ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#session-product-search') && !e.target.closest('#session-search-dropdown')) {
            const dd = document.getElementById('session-search-dropdown');
            if (dd) dd.style.display = 'none';
        }
    });

    // Ajouter un article libre (hors stock)
    document.getElementById('btn-add-free-item').addEventListener('click', addFreeItemToSession);

    // Lien "Voir toutes les stats" → naviguer vers Finances
    document.getElementById('btn-see-all-sessions').addEventListener('click', (e) => {
        e.preventDefault();
        switchTab('finances');
    });

    // --- FINANCES : Filtres de période ---
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.financePeriod = e.target.getAttribute('data-period');
            await renderFinances();
        });
    });

    // --- GESTION DES TOOLTIPS (INFOS) ---
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-tooltip]');
        if (trigger) {
            const text = trigger.getAttribute('data-tooltip');
            openInfoModal(text);
        }
    });

    const modalInfo = document.getElementById('modal-info');
    const btnCloseInfo = document.getElementById('btn-close-info-modal');
    const btnCloseInfoOk = document.getElementById('btn-close-info-modal-ok');

    const closeInfoModal = () => modalInfo.classList.remove('active');
    if (btnCloseInfo) btnCloseInfo.addEventListener('click', closeInfoModal);
    if (btnCloseInfoOk) btnCloseInfoOk.addEventListener('click', closeInfoModal);
}

function openInfoModal(text) {
    const modal = document.getElementById('modal-info');
    const body = document.getElementById('modal-info-text');
    if (modal && body) {
        body.textContent = text;
        modal.classList.add('active');
    }
}

// ==========================================================================
// COMPOSANTS APPAREIL PHOTO & GALERIE
// ==========================================================================

function setupPhotoComponents() {
    const btnCamera = document.getElementById('btn-camera-trigger');
    const btnGallery = document.getElementById('btn-gallery-trigger');
    const btnUpload = document.getElementById('btn-upload-trigger');
    const fileInput = document.getElementById('product-photo-file');
    
    btnUpload.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                resizeAndPreviewImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
    
    btnCamera.addEventListener('click', async () => {
        document.getElementById('gallery-defaults-wrapper').style.display = 'none';
        document.getElementById('photo-uploader-box').style.display = 'none';
        const wrapper = document.getElementById('camera-wrapper');
        wrapper.style.display = 'block';
        
        try {
            state.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 400, height: 400 }
            });
            const video = document.getElementById('camera-video');
            video.srcObject = state.cameraStream;
        } catch (err) {
            console.error('Erreur caméra :', err);
            showToast('Impossible d\'accéder à l\'appareil photo', 'error');
            wrapper.style.display = 'none';
            document.getElementById('photo-uploader-box').style.display = 'flex';
        }
    });
    
    document.getElementById('btn-camera-snap').addEventListener('click', () => {
        if (state.cameraStream) {
            const video = document.getElementById('camera-video');
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            
            const size = Math.min(video.videoWidth, video.videoHeight);
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;
            
            ctx.drawImage(video, x, y, size, size, 0, 0, 300, 300);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resizeAndPreviewImage(dataUrl);
            stopCamera();
        }
    });
    
    document.getElementById('btn-camera-cancel').addEventListener('click', () => {
        stopCamera();
    });
    
    btnGallery.addEventListener('click', () => {
        stopCamera();
        document.getElementById('photo-uploader-box').style.display = 'flex';
        const wrapper = document.getElementById('gallery-defaults-wrapper');
        if (wrapper.style.display === 'none') {
            wrapper.style.display = 'block';
            renderDefaultIconsGallery();
        } else {
            wrapper.style.display = 'none';
        }
    });
    
    document.getElementById('btn-delete-photo-preview').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('product-photo-preview').src = '';
        document.getElementById('product-photo-preview').style.display = 'none';
        document.getElementById('btn-delete-photo-preview').style.display = 'none';
        document.getElementById('photo-uploader-placeholder').style.display = 'flex';
        fileInput.value = '';
    });
}

function stopCamera() {
    if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop());
        state.cameraStream = null;
    }
    document.getElementById('camera-wrapper').style.display = 'none';
    document.getElementById('photo-uploader-box').style.display = 'flex';
}

function resizeAndPreviewImage(dataUrl) {
    state.selectedDefaultIcon = null;
    
    const preview = document.getElementById('product-photo-preview');
    preview.src = dataUrl;
    preview.style.display = 'block';
    
    document.getElementById('photo-uploader-placeholder').style.display = 'none';
    document.getElementById('btn-delete-photo-preview').style.display = 'block';
    document.getElementById('gallery-defaults-wrapper').style.display = 'none';
}

function renderDefaultIconsGallery(selectedEmoji = null) {
    const container = document.getElementById('gallery-defaults-list');
    container.innerHTML = '';
    
    DEFAULT_FOOD_ICONS.forEach(item => {
        const div = document.createElement('div');
        div.className = `gallery-default-item ${selectedEmoji === item.emoji ? 'selected' : ''}`;
        div.innerText = item.emoji;
        div.title = item.name;
        
        div.addEventListener('click', () => {
            document.querySelectorAll('.gallery-default-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            
            state.selectedDefaultIcon = item.emoji;
            
            document.getElementById('product-photo-preview').src = '';
            document.getElementById('product-photo-preview').style.display = 'none';
            document.getElementById('btn-delete-photo-preview').style.display = 'none';
            document.getElementById('photo-uploader-placeholder').style.display = 'flex';
            document.getElementById('photo-uploader-placeholder').querySelector('span').innerText = `Icône sélectionnée : ${item.emoji}`;
        });
        
        container.appendChild(div);
    });
}

// ==========================================================================
// RENDUS DES VUES (RENDER ENGINE)
// ==========================================================================

function renderAll() {
    renderDashboard();
    renderStock();
    renderShoppingList();
    renderSuggestions();
    renderCoursesSessions();
}

// --- TABLEAU DE BORD ---
function renderDashboard() {
    const totalItems = state.products.length;
    const totalValue = state.products.reduce((acc, p) => acc + ((p.price || 0) * p.qty), 0);
    const lowStockItems = state.products.filter(p => p.qty <= p.alert_qty).length;
    const familyCount = state.familyMembers.length;
    
    document.getElementById('stat-total-items').innerText = totalItems;
    document.getElementById('stat-total-value').innerText = `${totalValue.toFixed(2)} €`;
    document.getElementById('stat-alert-items').innerText = lowStockItems;
    document.getElementById('stat-family-count').innerText = familyCount;
    
    document.getElementById('sidebar-family-title').innerText = state.settings.familyName;
    document.getElementById('sidebar-people-count').innerText = familyCount;
    
    const stack = document.getElementById('sidebar-avatar-stack');
    stack.innerHTML = '';
    state.familyMembers.slice(0, 3).forEach(member => {
        const mini = document.createElement('div');
        mini.className = 'mini-avatar';
        mini.style.background = member.avatar_color;
        mini.innerText = member.name.charAt(0).toUpperCase();
        mini.title = member.name;
        stack.appendChild(mini);
    });
    if (familyCount > 3) {
        const more = document.createElement('div');
        more.className = 'mini-avatar';
        more.style.background = '#475569';
        more.innerText = `+${familyCount - 3}`;
        stack.appendChild(more);
    }
    
    const familyList = document.getElementById('dashboard-family-list');
    familyList.innerHTML = '';
    state.familyMembers.forEach(member => {
        const item = document.createElement('div');
        item.className = 'family-member-card';
        item.innerHTML = `
            <div class="family-member-info">
                <div class="family-avatar" style="background: ${member.avatar_color}">
                    ${member.name.charAt(0).toUpperCase()}
                </div>
                <div class="family-member-details">
                    <h4>${member.name}</h4>
                    <p>${member.role}</p>
                </div>
            </div>
            <span class="badge badge-info"><i data-lucide="award"></i> Actif</span>
        `;
        familyList.appendChild(item);
    });
    
    const historyList = document.getElementById('dashboard-history-list');
    historyList.innerHTML = '';
    
    if (state.history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                <i data-lucide="history"></i>
                <p>Aucune activité enregistrée pour le moment.</p>
            </div>
        `;
    } else {
        state.history.slice(0, 15).forEach(act => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            let icon = 'plus';
            let classType = 'plus';
            if (act.type === 'minus') { icon = 'minus'; classType = 'minus'; }
            else if (act.type === 'delete') { icon = 'trash-2'; classType = 'minus'; }
            else if (act.type === 'edit') { icon = 'edit-2'; classType = 'plus'; }
            else if (act.type === 'add') { icon = 'plus-circle'; classType = 'plus'; }
            
            const dateObj = new Date(act.timestamp);
            const timeAgo = formatTimeAgo(dateObj.getTime());
            
            item.innerHTML = `
                <div class="history-icon-wrapper ${classType}">
                    <i data-lucide="${icon}"></i>
                </div>
                <div class="history-details">
                    <p>${act.message}</p>
                    <div class="time">${timeAgo}</div>
                </div>
            `;
            historyList.appendChild(item);
        });
    }
    
    lucide.createIcons();
}

// --- STOCK & RÉSERVE ---
function renderStock() {
    const grid = document.getElementById('stock-product-grid');
    grid.innerHTML = '';
    
    const searchVal = document.getElementById('stock-search').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('stock-filter-category').value;
    const statusFilter = document.getElementById('stock-filter-status').value;
    
    const filtered = state.products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchVal);
        const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
        
        let matchStatus = true;
        if (statusFilter === 'instock') {
            matchStatus = p.qty > p.alert_qty;
        } else if (statusFilter === 'low') {
            matchStatus = p.qty <= p.alert_qty && p.qty > 0;
        } else if (statusFilter === 'outofstock') {
            matchStatus = p.qty === 0;
        }
        
        return matchSearch && matchCategory && matchStatus;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="product-empty">
                <i data-lucide="package-search"></i>
                <p>Aucun produit ne correspond à vos critères.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glass-card product-card';
        
        let imageHtml = '';
        if (p.photo && p.photo.startsWith('data:image')) {
            imageHtml = `<img src="${p.photo}" class="product-img" alt="${p.name}">`;
        } else {
            imageHtml = `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:4rem; background:rgba(255,255,255,0.02)">
                    ${p.photo || '📦'}
                </div>
            `;
        }
        
        let badgeHtml = '';
        if (p.qty === 0) {
            badgeHtml = `<span class="badge badge-danger"><i data-lucide="x-circle"></i> Épuisé</span>`;
        } else if (p.qty <= p.alert_qty) {
            badgeHtml = `<span class="badge badge-warning"><i data-lucide="alert-triangle"></i> Stock Faible</span>`;
        } else {
            badgeHtml = `<span class="badge badge-success"><i data-lucide="check"></i> En Stock</span>`;
        }
        
        let expiryBadge = '';
        if (p.expiry_date) {
            const daysLeft = Math.ceil((new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft >= 0 && daysLeft <= 3) {
                expiryBadge = `<span class="badge badge-danger" style="margin-top:0.3rem;"><i data-lucide="clock"></i> Périme sous ${daysLeft}j</span>`;
            }
        }
        
        const friendlyCategory = getCategoryFriendlyName(p.category);
        const productPrice = p.price > 0 ? `${(p.price).toFixed(2)} €` : 'N/A';

        const effectiveScore = (p.score_auto !== 0) ? p.consumption_score : p.score_manual;
        const scoreVisual = getScoreVisual(effectiveScore);
        const manualTag = !p.score_auto ? `<span class="score-manual-tag" title="Note manuelle">✏️</span>` : '';

        card.innerHTML = `
            <div class="product-actions">
                <button class="btn-product-action btn-edit-product" title="Modifier">
                    <i data-lucide="pencil" style="width:14px; height:14px;"></i>
                </button>
                <button class="btn-product-action btn-delete-product" title="Supprimer" style="background: rgba(244,63,94,0.85)">
                    <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                </button>
            </div>
            
            <div class="product-image-container">
                ${imageHtml}
                <div class="product-category-tag">${friendlyCategory}</div>
            </div>
            
            <div class="product-card-body">
                <div class="product-name-row">
                    <span class="product-name" title="${p.name}">${p.name} ${p.brand ? `<small style="display:block;font-size:0.7rem;color:var(--text-muted);">${p.brand}</small>` : ''}</span>
                    <span class="product-price">${productPrice}</span>
                </div>
                
                <div class="product-stock-status">
                    ${badgeHtml}
                    ${expiryBadge}
                </div>

                <div class="product-score-row">
                    <span class="score-badge score-${scoreVisual.tier}" title="Score de valeur domestique">
                        ${scoreVisual.icon} ${scoreVisual.label}
                    </span>
                    ${manualTag}
                </div>

                <div class="stock-controller">
                    <button class="btn-stock-adjust btn-decrement">
                        <i data-lucide="minus" style="width:14px; height:14px;"></i>
                    </button>
                    <div class="stock-value-display">
                        <span class="stock-qty">${p.qty}</span>
                        <span class="stock-unit">${p.unit}</span>
                    </div>
                    <button class="btn-stock-adjust btn-increment">
                        <i data-lucide="plus" style="width:14px; height:14px;"></i>
                    </button>
                </div>
            </div>
        `;
        
        card.querySelector('.btn-increment').addEventListener('click', () => adjustStock(p.id, 1));
        card.querySelector('.btn-decrement').addEventListener('click', () => adjustStock(p.id, -1));
        card.querySelector('.btn-edit-product').addEventListener('click', () => {
            const event = new CustomEvent('open-edit', { detail: p });
            document.dispatchEvent(event);
        });
        card.querySelector('.btn-delete-product').addEventListener('click', () => deleteProduct(p.id, p.name));
        
        grid.appendChild(card);
    });
    
    lucide.createIcons();
}

// --- LISTE DE COURSES ---
function renderShoppingList() {
    const container = document.getElementById('shopping-list-container');
    container.innerHTML = '';
    
    document.getElementById('shopping-badge-count').innerText = `${state.shoppingList.length} article(s)`;
    document.getElementById('summary-shopping-total').innerText = state.shoppingList.length;
    
    const checkedCount = state.shoppingList.filter(i => i.checked).length;
    document.getElementById('summary-shopping-checked').innerText = checkedCount;
    
    const estimatedCost = state.shoppingList.reduce((acc, item) => acc + ((item.price || 0) * (item.qtyNeeded || 1)), 0);
    document.getElementById('summary-shopping-cost').innerText = `${estimatedCost.toFixed(2)} €`;
    
    if (state.shoppingList.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                <i data-lucide="check-circle" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3; color: var(--success);"></i>
                <p>Vos réserves sont pleines ! Aucun article à acheter.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    state.shoppingList.forEach(item => {
        const div = document.createElement('div');
        div.className = `shopping-item ${item.checked ? 'checked' : ''}`;
        div.style.cursor = 'pointer'; // Toute la ligne est cliquable

        const priceText = item.price > 0 ? `${(item.price * item.qtyNeeded).toFixed(2)} €` : 'N/A';
        const typeIcon = item.isAuto
            ? `<i data-lucide="alert-triangle" style="width:14px;height:14px;color:var(--warning);" title="Stock Faible"></i>`
            : `<i data-lucide="user" style="width:14px;height:14px;color:var(--primary);" title="Ajout manuel"></i>`;

        div.innerHTML = `
            <div class="shopping-item-left" style="flex:1; min-width:0;">
                <div class="shopping-checkbox">
                    <i data-lucide="check"></i>
                </div>
                <div class="shopping-item-details">
                    <span class="shopping-item-name">${item.name}</span>
                    <span class="shopping-item-meta">
                        ${typeIcon} ${item.isAuto ? 'Alerte stock' : 'Ajout manuel'}
                    </span>
                </div>
            </div>

            <div class="shopping-item-right">
                <span class="shopping-item-qty">${item.qtyNeeded} ${item.unit}</span>
                <span class="shopping-item-price">${priceText}</span>
                <button class="btn btn-secondary btn-circle btn-delete-shopping-item" style="width:28px;height:28px;border-radius:6px;" title="Retirer de la liste">
                    <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                </button>
            </div>
        `;

        // ✅ Clic sur TOUTE la ligne (sauf bouton supprimer)
        div.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-shopping-item')) return;
            toggleShoppingItemChecked(item);
        });

        div.querySelector('.btn-delete-shopping-item').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteShoppingItem(item);
        });

        container.appendChild(div);
    });
    
    lucide.createIcons();
}

// --- NOUVEAU RENDU COMPTABLE : ANALYSES & FINANCES ERP ---
async function renderFinances() {
    try {
        const data = await apiFetch(`/api/analytics?period=${state.financePeriod}`);
        
        // Meilleur magasin
        const bestStoreEl = document.getElementById('finance-best-store');
        if (data.storeComparison && data.storeComparison.length > 0) {
            bestStoreEl.innerText = data.storeComparison[0].store;
        } else {
            bestStoreEl.innerText = "---";
        }

        // Liste de comparaison
        const compList = document.getElementById('store-comparison-list');
        compList.innerHTML = '';
        data.storeComparison.forEach(s => {
            const pct = Math.max(20, Math.min(100, (1 / s.price_index) * 60));
            const color = s.price_index <= 1 ? 'var(--success)' : 'var(--warning)';
            const div = document.createElement('div');
            div.style.cssText = "display:flex; align-items:center; gap:1rem; margin-bottom:1rem;";
            div.innerHTML = `
                <div style="width:120px; font-weight:600;">${s.store}</div>
                <div style="flex:1; height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:${color};"></div>
                </div>
                <div style="width:100px; text-align:right; font-size:0.85rem;">
                    Indice: <strong>${s.price_index.toFixed(2)}</strong>
                </div>
            `;
            compList.appendChild(div);
        });

        const familyCount = state.familyMembers.length || 1;
        
        // 1. Injecter les KPIs financiers
        const thisMonthCost = data.thisMonth || 0;
        const lastMonthCost = data.lastMonth || 0;
        document.getElementById('finance-cost-current').innerText = `${thisMonthCost.toFixed(2)} €`;
        document.getElementById('finance-cost-last-month').innerText = `${lastMonthCost.toFixed(2)} €`;

        // Mise à jour dynamique des libellés sous les chiffres
        const periodLabels = { week: 'Cette semaine', month: 'Ce mois-ci', year: 'Cette année' };
        const prevLabels = { week: 'Semaine dernière', month: 'Mois dernier', year: 'Année dernière' };
        document.querySelector('#finance-cost-current + p').textContent = periodLabels[state.financePeriod];
        document.querySelector('#finance-cost-last-month + p').textContent = prevLabels[state.financePeriod];
        
        // Calcul d'évolution %
        let diffPct = 0;
        let diffText = '0.0 %';
        let trendIcon = 'minus';
        const trendIconElement = document.getElementById('finance-trend-icon');
        const trendParent = trendIconElement.parentElement;
        
        if (lastMonthCost > 0) {
            diffPct = ((thisMonthCost - lastMonthCost) / lastMonthCost) * 100;
            diffText = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)} %`;
            trendIcon = diffPct > 0 ? 'arrow-up-right' : 'arrow-down-right';
            
            // Si les dépenses montent (pas bien), on colore en rouge, si elles baissent (bien !) en vert
            if (diffPct > 0) {
                trendParent.className = 'stat-icon yellow';
            } else {
                trendParent.className = 'stat-icon green';
            }
        } else {
            trendParent.className = 'stat-icon blue';
        }
        document.getElementById('finance-cost-diff').innerText = diffText;
        
        // Mettre à jour l'icône de tendance
        trendIconElement.setAttribute('data-lucide', trendIcon);
        
        // Coût par personne
        const perPersonCost = thisMonthCost / familyCount;
        document.getElementById('finance-cost-per-person').innerText = `${perPersonCost.toFixed(2)} €`;
        
        // 2. Remplir le registre des factures / transactions
        const billsBody = document.getElementById('finance-bills-body');
        billsBody.innerHTML = '';
        document.getElementById('finance-bills-count').innerText = `${data.recentBills.length} achat(s)`;
        
        if (data.recentBills.length === 0) {
            billsBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        Aucun achat n'a été enregistré pour le moment.
                    </td>
                </tr>
            `;
        } else {
            data.recentBills.forEach(bill => {
                const tr = document.createElement('tr');
                const categoryName = getCategoryFriendlyName(bill.category);
                
                // Formater date
                const dateObj = new Date(bill.date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                
                tr.innerHTML = `
                    <td style="padding: 0.9rem 0.75rem; color: var(--text-muted);">${dateStr}</td>
                    <td style="padding: 0.9rem 0.75rem; font-weight:600;">${bill.name}</td>
                    <td style="padding: 0.9rem 0.75rem;"><span class="badge badge-info">${categoryName}</span></td>
                    <td style="padding: 0.9rem 0.75rem; text-align: center;">${bill.qty}</td>
                    <td style="padding: 0.9rem 0.75rem; text-align: center; color: var(--text-muted);">${bill.price.toFixed(2)} €</td>
                    <td style="padding: 0.9rem 0.75rem; text-align: right; font-weight:700; color:#38bdf8;">${bill.total.toFixed(2)} €</td>
                `;
                billsBody.appendChild(tr);
            });
        }
        
        // 3. Dessiner les graphiques Chart.js (Détruire l'instance précédente si présente)
        renderCharts(data.expensesByMonth, data.expensesByCategoryThisMonth, data.chartGrouping);

        // 4. Sessions de courses et classement produits
        await renderFinancesSessions();
        await renderTopProducts();

        lucide.createIcons();
    } catch (err) {
        console.error('Erreur analytique :', err);
    }
}

// Moteur d'initialisation de Chart.js avec des dégradés néons
function renderCharts(monthlyData, categoryData, chartGrouping = 'month') {
    // A. GRAPHIQUE ÉVOLUTION (BAR)
    const ctxMonthly = document.getElementById('chart-monthly-expenses').getContext('2d');
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    // Mettre à jour le titre du graphique selon la période
    const chartTitleEl = document.querySelector('#chart-monthly-expenses')?.closest('.glass-card')?.querySelector('h3');
    const chartTitles = { week: 'Évolution Journalière (7 derniers jours)', month: 'Évolution Journalière (Mois en cours)', year: 'Évolution Mensuelle (Année en cours)' };
    if (chartTitleEl) chartTitleEl.textContent = chartTitles[state.financePeriod] || 'Évolution des Dépenses';

    // Formater les labels selon le groupement
    const monthNames = {
        '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
        '07': 'Juil', '08': 'Août', '09': 'Sept', '10': 'Oct', '11': 'Nov', '12': 'Déc'
    };

    const monthlyLabels = monthlyData.map(d => {
        if (chartGrouping === 'day') {
            // Format YYYY-MM-DD → "JJ/MM"
            const parts = d.label.split('-');
            return `${parts[2]}/${parts[1]}`;
        } else {
            // Format YYYY-MM → "Fév 2025"
            const parts = d.label.split('-');
            return `${monthNames[parts[1]] || parts[1]} ${parts[0]}`;
        }
    });

    const monthlyValues = monthlyData.map(d => d.total);

    // Dégradé de barres (Indigo vers Violet)
    const barGradient = ctxMonthly.createLinearGradient(0, 0, 0, 300);
    barGradient.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
    barGradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');

    monthlyChartInstance = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
            labels: monthlyLabels,
            datasets: [{
                label: 'Dépenses (€)',
                data: monthlyValues,
                backgroundColor: barGradient,
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.55
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0d121f',
                    titleColor: '#fff',
                    bodyColor: '#38bdf8',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => ` ${ctx.raw.toFixed(2)} €`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12 }, maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12 }, callback: (v) => `${v} €` },
                    beginAtZero: true
                }
            }
        }
    });
    
    // B. GRAPHIQUE RÉPARTITION PAR CATÉGORIE (DOUGHNUT)
    const ctxCategory = document.getElementById('chart-category-expenses').getContext('2d');
    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }
    
    const categoryLabels = categoryData.map(d => getCategoryFriendlyName(d.category));
    const categoryValues = categoryData.map(d => d.total);
    
    const catColors = [
        '#6366f1', // Indigo
        '#a855f7', // Violet
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#38bdf8', // Light Blue
        '#f43f5e', // Rose Red
        '#64748b'  // Slate grey
    ];
    
    categoryChartInstance = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: categoryValues,
                backgroundColor: catColors.slice(0, categoryLabels.length),
                borderWidth: 2,
                borderColor: '#0d121f',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Outfit', size: 12 },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#0d121f',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ` ${ctx.label} : ${ctx.raw.toFixed(2)} €`
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// --- DANS MODAL FAMILLE ---
function renderFamilyModalList() {
    const container = document.getElementById('modal-family-list-container');
    container.innerHTML = '';
    
    state.familyMembers.forEach(member => {
        const div = document.createElement('div');
        div.className = 'family-member-card';
        div.innerHTML = `
            <div class="family-member-info">
                <div class="family-avatar" style="background: ${member.avatar_color}">
                    ${member.name.charAt(0).toUpperCase()}
                </div>
                <div class="family-member-details">
                    <h4>${member.name}</h4>
                    <p>${member.role}</p>
                </div>
            </div>
            <button class="btn btn-danger btn-circle btn-delete-member" data-id="${member.id}">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;
        
        div.querySelector('.btn-delete-member').addEventListener('click', async () => {
            if (state.familyMembers.length <= 1) {
                showToast('Le foyer doit contenir au moins un membre !', 'warning');
                return;
            }
            if (confirm(`Voulez-vous retirer ${member.name} du foyer ?`)) {
                await apiFetch(`/api/family/${member.id}`, { method: 'DELETE' });
                showToast(`${member.name} a quitté le foyer.`, 'info');
                await loadAllData();
                renderDashboard();
                renderFamilyModalList();
            }
        });
        
        container.appendChild(div);
    });
    
    lucide.createIcons();
}

// ==========================================================================
// ACTIONS D'INVENTAIRE & COUPLAGE API
// ==========================================================================

async function adjustStock(productId, delta) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    
    let oldQty = product.qty;
    let newQty = Math.max(0, parseFloat((oldQty + delta).toFixed(1)));
    
    if (oldQty === newQty) return;
    
    try {
        // Enregistrer dans la base SQLite backend
        await apiFetch(`/api/products/${productId}`, {
            method: 'PUT',
            body: { qty: newQty }
        });
        
        const activeMember = state.familyMembers[0] ? state.familyMembers[0].name : 'Foyer';
        
        if (delta < 0) {
            await logActivity('minus', `**${activeMember}** a consommé **${Math.abs(delta)} ${product.unit}** de **${product.name}**.`);
            
            // Alerte seuil critique
            if (newQty <= product.alert_qty && oldQty > product.alert_qty) {
                showToast(`Alerte stock faible : ${product.name} ! Ajouté aux courses.`, 'warning');
            }
        } else {
            await logActivity('plus', `**${activeMember}** a rechargé **${delta} ${product.unit}** de **${product.name}**.`);
        }
        
        await loadAllData();
        renderAll();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la mise à jour du stock', 'error');
    }
}

async function deleteProduct(id, name) {
    if (confirm(`Voulez-vous vraiment supprimer définitivement ${name} de l'ERP ?`)) {
        try {
            await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
            await logActivity('delete', `Le produit **${name}** a été supprimé de la réserve.`);
            showToast('Produit supprimé', 'info');
            await loadAllData();
            renderAll();
        } catch (err) {
            console.error(err);
            showToast('Erreur lors de la suppression', 'error');
        }
    }
}

async function logActivity(type, message) {
    try {
        await apiFetch('/api/history', {
            method: 'POST',
            body: { type, message }
        });
    } catch (err) {
        console.error(err);
    }
}

// ==========================================================================
// ACTIONS DE LA LISTE DE COURSES
// ==========================================================================

async function addManualShoppingItem() {
    const input = document.getElementById('quick-shopping-input');
    const name = input.value.trim();
    
    if (name) {
        const newItem = {
            id: `manual-${Date.now()}`,
            productId: null,
            name,
            qtyNeeded: 1,
            unit: 'pièces',
            price: 0,
            isAuto: false,
            checked: false
        };
        
        try {
            await apiFetch('/api/shopping', {
                method: 'POST',
                body: newItem
            });
            input.value = '';
            showToast('Article ajouté à la liste', 'success');
            await loadAllData();
            renderShoppingList();
        } catch (err) {
            console.error(err);
            showToast('Erreur lors de l\'ajout', 'error');
        }
    }
}

async function toggleShoppingItemChecked(item) {
    // Feedback visuel IMMÉDIAT — on bascule dans le state local sans attendre le serveur
    item.checked = !item.checked;
    renderShoppingList(); // Re-rendu optimiste instantané

    try {
        await apiFetch('/api/shopping', {
            method: 'POST',
            body: {
                id: item.id,
                productId: item.productId || null,
                name: item.name,
                qtyNeeded: item.qtyNeeded,
                unit: item.unit,
                price: item.price || 0,
                isAuto: item.isAuto ? true : false,
                checked: item.checked
            }
        });
        // Sync silencieuse depuis le serveur (sans re-render visible)
        state.shoppingList = await apiFetch('/api/shopping');
        renderShoppingList();
    } catch (err) {
        // En cas d'erreur, on revert le state
        item.checked = !item.checked;
        renderShoppingList();
        showToast('Erreur lors du cochage', 'error');
        console.error(err);
    }
}

async function deleteShoppingItem(item) {
    if (item.isAuto) {
        showToast("L'article provient du stock faible. Ajustez plutôt sa quantité en stock pour le retirer !", "warning");
    } else {
        try {
            await apiFetch(`/api/shopping/${item.id}`, { method: 'DELETE' });
            showToast('Article retiré', 'info');
            await loadAllData();
            renderShoppingList();
        } catch (err) {
            console.error(err);
        }
    }
}

async function completeCheckedShoppingItems() {
    const checkedItems = state.shoppingList.filter(i => i.checked);
    
    if (checkedItems.length === 0) {
        showToast("Aucun article n'est coché comme acheté.", "warning");
        return;
    }
    
    try {
        showToast('Enregistrement des achats et réapprovisionnement...', 'info');
        
        // Résoudre les catégories correspondantes pour les injecter en base
        const checkedItemsWithCategories = checkedItems.map(item => {
            let category = 'Epicerie';
            if (item.isAuto) {
                const prod = state.products.find(p => p.id === item.productId);
                if (prod) category = prod.category;
            } else {
                // Essayer de deviner la catégorie d'après le nom
                const cleanName = item.name.toLowerCase();
                const matchedIcon = DEFAULT_FOOD_ICONS.find(i => cleanName.includes(i.name.toLowerCase()));
                if (matchedIcon) category = matchedIcon.cat;
            }
            return {
                ...item,
                category
            };
        });

        const result = await apiFetch('/api/shopping/complete', {
            method: 'POST',
            body: { checkedItems: checkedItemsWithCategories }
        });
        
        showToast(`Courses validées ! ${result.count} article(s) rechargés en base.`, 'success');
        
        await loadAllData();
        renderAll();
        
        // Si l'onglet actif est finances, rafraîchir les graphiques immédiatement
        if (state.activeTab === 'finances') {
            renderFinances();
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la validation des courses', 'error');
    }
}

function shareShoppingList() {
    let text = `🛒 *Ma Liste de Courses KazaERP - ${state.settings.familyName}*\n\n`;
    
    if (state.shoppingList.length === 0) {
        showToast('La liste est vide !', 'warning');
        return;
    }
    
    state.shoppingList.forEach(item => {
        const checkbox = item.checked ? '✅' : '⬜';
        text += `${checkbox} ${item.name} (${item.qtyNeeded} ${item.unit})\n`;
    });
    
    text += `\nGénéré par le KazaERP Full-Stack.`;
    
    if (navigator.share) {
        navigator.share({
            title: `Courses KazaERP - ${state.settings.familyName}`,
            text: text
        }).catch(err => console.log(err));
    } else {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Liste copiée dans le presse-papier !', 'success');
        }).catch(() => {
            showToast('Erreur de copie presse-papier', 'error');
        });
    }
}

// ==========================================================================
// MOTEUR IA INTERACTIF ET RECETTES (DÉDUIT DES PLACARDS SQLITE)
// ==========================================================================

function appendIAChatMessage(sender, text, hasRecipe = null) {
    const chatBox = document.getElementById('ia-chat-box');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = text;
    
    if (hasRecipe) {
        const recCard = document.createElement('div');
        recCard.className = 'recipe-card-suggestion';
        recCard.innerHTML = `
            <div class="recipe-card-header-img">
                ${hasRecipe.emoji}
            </div>
            <div class="recipe-card-body">
                <h5>${hasRecipe.title}</h5>
                <p><strong>Ingrédients requis :</strong> ${hasRecipe.ingredients.join(', ')}</p>
                <p style="margin-top: 0.5rem;">${hasRecipe.instructions}</p>
            </div>
        `;
        bubble.appendChild(recCard);
    }
    
    chatBox.appendChild(bubble);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function triggerIASuggestRecipes() {
    showToast('KazaChef analyse vos placards SQLite...', 'info');
    
    setTimeout(() => {
        const availableProducts = state.products.filter(p => p.qty > 0);
        
        if (availableProducts.length === 0) {
            appendIAChatMessage('bot', "⚠️ D'après les registres de l'ERP SQLite, vos placards sont **complètement vides** ! Impossible de cuisiner. Pensez à faire vos courses !");
            return;
        }
        
        const suggestions = findRecipesFromStock(availableProducts);
        let message = `### 🍳 Analyse culinaire du stock SQLite terminée !\n\nJ'ai trouvé **${availableProducts.length} ingrédients** en stock. Voici mes suggestions de repas :`;
        
        appendIAChatMessage('bot', message);
        
        suggestions.forEach(rec => {
            setTimeout(() => {
                appendIAChatMessage('bot', `💡 *Suggestion de plat réalisable :*`, rec);
            }, 500);
        });
        
    }, 1000);
}

function findRecipesFromStock(stocks) {
    const has = (keyword) => stocks.some(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    const recipesFound = [];
    
    if (has('pâte') && (has('tomate') || has('sauce'))) {
        recipesFound.push({
            title: "Pâtes Sauce Tomate Kaza",
            emoji: "🍝",
            ingredients: ["Pâtes en stock", "Sauce Tomate"],
            instructions: "Faire cuire les pâtes. Réchauffer la sauce tomate avec un filet d'huile d'olive et herbes, assembler le tout."
        });
    }
    
    if (has('oeuf') || has('œuf')) {
        const ing = ["Oeufs"];
        let inst = "Battre les oeufs, cuire à la poêle à feu doux.";
        if (has('fromage')) {
            ing.push("Fromage");
            inst += " Ajouter le fromage râpé en fin de cuisson et plier en deux.";
        }
        recipesFound.push({
            title: has('fromage') ? "Omelette Gourmande au Fromage" : "Omelette Nature",
            emoji: "🍳",
            ingredients: ing,
            instructions: inst
        });
    }
    
    if (has('poulet') && (has('riz') || has('légume'))) {
        recipesFound.push({
            title: "Poulet Sauté Doré & Riz",
            emoji: "🍗",
            ingredients: ["Blancs de Poulet", has('riz') ? "Riz" : "Légumes"],
            instructions: "Émincer le poulet. Le saisir à feu vif. Servir avec le riz cuit."
        });
    }
    
    if (recipesFound.length === 0) {
        const top3 = stocks.slice(0, 3).map(p => p.name);
        recipesFound.push({
            title: "Méli-Mélo Improvisé du Foyer",
            emoji: "🥣",
            ingredients: top3,
            instructions: `Faire sauter vos ingrédients disponibles (${top3.join(', ')}) avec du beurre dans une grande poêle. Simple et anti-gaspillage !`
        });
    }
    
    return recipesFound;
}

function triggerIAPredictShopping() {
    showToast('Prédiction de courses en cours...', 'info');
    
    setTimeout(() => {
        const lowStocks = state.products.filter(p => p.qty <= p.alert_qty);
        let report = `### 🧠 Analyse ERP & Prédictions Financières\n\n`;
        
        if (lowStocks.length > 0) {
            report += `⚠️ **Ruptures de stock imminentes détectées :**\n`;
            lowStocks.forEach(p => {
                report += `- **${p.name}** : quantité restante de ${p.qty} (Alerte réglée sous ${p.alert_qty} ${p.unit}).\n`;
            });
            report += `\n`;
        }
        
        const consumptionLog = state.history.filter(h => h.type === 'minus');
        if (consumptionLog.length > 0) {
            const counts = {};
            consumptionLog.forEach(log => {
                const match = log.message.match(/\*\*([^*]+)\*\*/g);
                if (match && match[1]) {
                    const prodName = match[1].replace(/\*\*/g, '');
                    counts[prodName] = (counts[prodName] || 0) + 1;
                }
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            if (sorted.length > 0) {
                const favorite = sorted[0][0];
                report += `📈 **Statistiques de consommation :**\n`;
                report += `- Le produit le plus consommé est **${favorite}**.\n`;
                report += `💡 *Conseil KazaChef* : Ajustez sa quantité d'alerte ou prévoyez un stock tampon plus important lors des prochaines courses.`;
            }
        } else {
            report += `💡 *Astuce* : Utilisez régulièrement le décompte \`-\` pour m'aider à analyser la vitesse d'épuisement de votre nourriture et calculer des prévisions ultra-précises !`;
        }
        
        appendIAChatMessage('bot', report);
    }, 1200);
}

async function sendIAChatMessage() {
    const input = document.getElementById('ia-chat-input');
    const query = input.value.trim();
    
    if (query) {
        appendIAChatMessage('user', query);
        input.value = '';
        
        // Afficher un petit indicateur de chargement
        const loadingId = "bot-loading-" + Date.now();
        appendIAChatMessage('bot', `<span id="${loadingId}">KazaChef réfléchit... 🧠</span>`);
        
        try {
            const data = await apiFetch('/api/ai/chat', {
                method: 'POST',
                body: { message: query }
            });
            
            // Supprimer le message de chargement et mettre la vraie réponse
            document.getElementById(loadingId).parentElement.remove();
            appendIAChatMessage('bot', data.text);
        } catch (err) {
            console.error("Erreur IA détaillée:", err);
            document.getElementById(loadingId).innerText = "Erreur de connexion à l'IA. Vérifiez la console (F12) ou les logs du serveur. 🔌";
            showToast(`Erreur IA: ${err.message}`, 'error');
        }
    }
}

// ==========================================================================
// MODAL NOUVELLE SESSION DE COURSES
// ==========================================================================

async function openSessionModal(existingSession = null) {
    state.sessionItems = [];

    // Reset champs
    document.getElementById('modal-session-id').value = '';
    document.getElementById('modal-session-title').textContent = "🛒 Nouvelle session de courses";
    document.getElementById('modal-session-store').value = '';
    document.getElementById('modal-session-notes').value = '';
    document.getElementById('session-product-search').value = '';
    document.getElementById('session-total-override').value = '';

    if (existingSession && existingSession.id) {
        document.getElementById('modal-session-id').value = existingSession.id;
        document.getElementById('modal-session-title').textContent = "✏️ Modifier la session";
        document.getElementById('modal-session-store').value = existingSession.store || '';
        document.getElementById('modal-session-notes').value = existingSession.notes || '';
        document.getElementById('modal-session-date').value = new Date(existingSession.session_date).toISOString().slice(0, 16);
        document.getElementById('session-total-override').value = existingSession.total_cost;

        try {
            const items = await apiFetch(`/api/shopping-sessions/${existingSession.id}/items`);
            state.sessionItems = items.map(i => ({
                product_id: null, // Le backend fera la ré-association par nom
                name: i.product_name,
                brand: i.brand,
                unit: 'pièces', // Par défaut
                qty: i.qty,
                price: i.price,
                photo: '📦',
                category: i.category,
                expiry_date: i.expiry_date || null
            }));
        } catch (e) { showToast('Erreur chargement articles', 'error'); }
    } else {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('modal-session-date').value = now.toISOString().slice(0, 16);
    }

    document.getElementById('free-item-name').value = '';
    document.getElementById('free-item-brand').value = '';
    document.getElementById('free-item-qty').value = '1';
    document.getElementById('free-item-price').value = '';
    document.getElementById('session-search-dropdown').style.display = 'none';

    renderSessionItemsList();
    document.getElementById('modal-session').classList.add('active');
    lucide.createIcons();
}

function closeSessionModal() {
    document.getElementById('modal-session').classList.remove('active');
}

function addProductToSession(product) {
    // Si déjà dans la liste, on incrémente la quantité
    const existing = state.sessionItems.find(i => i.product_id === product.id);
    if (existing) {
        existing.qty = parseFloat((existing.qty + 1).toFixed(1));
        showToast(`${product.name} : quantité augmentée à ${existing.qty}`, 'info');
    } else {
        state.sessionItems.push({
            product_id: product.id,
            name: product.name,
            brand: product.brand,
            unit: product.unit,
            qty: 1,
            price: product.price || 0,
            photo: product.photo,
            category: product.category,
            expiry_date: product.expiry_date || null // Pass the product's earliest expiry date
        });
        showToast(`${product.name} ajouté`, 'success');
    }

    document.getElementById('session-product-search').value = '';
    document.getElementById('session-search-dropdown').style.display = 'none';
    renderSessionItemsList();
}

function addFreeItemToSession() {
    const name = document.getElementById('free-item-name').value.trim();
    const brand = document.getElementById('free-item-brand').value.trim();
    const qty  = parseFloat(document.getElementById('free-item-qty').value) || 1;
    const unit = document.getElementById('free-item-unit').value;
    const price = parseFloat(document.getElementById('free-item-price').value) || 0;

    if (!name) { showToast('Saisissez le nom de l\'article', 'warning'); return; }

    state.sessionItems.push({ product_id: null, name, brand, unit, qty, price, photo: '📦', category: 'Epicerie', expiry_date: null }); // No expiry_date for free item, server will default

    document.getElementById('free-item-name').value = '';
    document.getElementById('free-item-brand').value = '';
    document.getElementById('free-item-qty').value = '1';
    document.getElementById('free-item-price').value = '';

    renderSessionItemsList();
    showToast(`${name} ajouté`, 'success');
}

function renderSessionItemsList() {
    const container = document.getElementById('session-items-list');
    const countBadge = document.getElementById('session-items-count');
    if (!container) return;

    if (countBadge) countBadge.textContent = `${state.sessionItems.length} article(s)`;

    if (state.sessionItems.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:1.5rem;border:1px dashed var(--border-color);border-radius:10px;color:var(--text-muted);font-size:0.85rem;">
                Aucun article — recherchez un produit ci-dessus ou ajoutez un article libre.
            </div>
        `;
        updateSessionTotal();
        return;
    }

    container.innerHTML = '';

    state.sessionItems.forEach((item, idx) => {
        const icon = item.photo && !item.photo.startsWith('data:') ? item.photo : '📦';
        const lineTotal = ((item.price || 0) * (item.qty || 1)).toFixed(2);
        const tag = item.product_id
            ? `<span class="badge badge-success" style="font-size:0.65rem;">📦 Stock</span>`
            : `<span class="badge badge-info" style="font-size:0.65rem;">✏️ Libre</span>`;

        const row = document.createElement('div');
        row.className = 'session-item-row';
        row.dataset.idx = idx;
        row.innerHTML = `
            <span class="session-item-icon">${icon}</span>
            <div class="session-item-name-col">
                <span class="session-item-name">${item.name} ${item.brand ? `<small>(${item.brand})</small>` : ''}</span>
                ${tag}
            </div>
            <div class="session-item-inputs">
                <input type="number" class="form-control session-qty-input" value="${item.qty}"
                       min="0.1" step="0.1" data-idx="${idx}" style="width:65px;" title="Quantité">
                <span class="session-unit-label">${item.unit}</span>
                <span style="color:var(--text-muted);font-size:0.8rem;">×</span>
                <input type="number" class="form-control session-price-input" value="${item.price}"
                       min="0" step="0.01" data-idx="${idx}" placeholder="Prix U." style="width:78px;" title="Prix unitaire (€)">
                <span style="color:var(--text-muted);font-size:0.8rem;">€</span>
                <span class="session-line-total">${lineTotal} €</span>
            </div>
            <button class="btn btn-danger session-remove-btn" data-idx="${idx}"
                    style="width:28px;height:28px;border-radius:7px;padding:0;flex-shrink:0;" title="Retirer">
                <i data-lucide="x" style="width:13px;height:13px;"></i>
            </button>
        `;

        container.appendChild(row);
    });

    // Listeners qty
    container.querySelectorAll('.session-qty-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            state.sessionItems[idx].qty = parseFloat(e.target.value) || 0;
            refreshSessionLineTotal(idx);
            updateSessionTotal();
        });
    });

    // Listeners price
    container.querySelectorAll('.session-price-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            state.sessionItems[idx].price = parseFloat(e.target.value) || 0;
            refreshSessionLineTotal(idx);
            updateSessionTotal();
        });
    });

    // Listeners remove
    container.querySelectorAll('.session-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            const removed = state.sessionItems.splice(idx, 1)[0];
            showToast(`${removed.name} retiré`, 'info');
            renderSessionItemsList();
        });
    });

    updateSessionTotal();
    lucide.createIcons();
}

function refreshSessionLineTotal(idx) {
    const item = state.sessionItems[idx];
    const total = ((item.price || 0) * (item.qty || 1)).toFixed(2);
    const rows = document.querySelectorAll('.session-item-row');
    const lineEl = rows[idx] ? rows[idx].querySelector('.session-line-total') : null;
    if (lineEl) lineEl.textContent = `${total} €`;
}

function updateSessionTotal() {
    const total = state.sessionItems.reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 1)), 0);
    const el = document.getElementById('session-calculated-total');
    if (el) el.textContent = `${total.toFixed(2)} €`;
}

async function saveSessionModal() {
    const id        = document.getElementById('modal-session-id').value;
    const dateVal   = document.getElementById('modal-session-date').value;
    const store     = document.getElementById('modal-session-store').value.trim();
    const notes     = document.getElementById('modal-session-notes').value.trim();
    const override  = document.getElementById('session-total-override').value;

    const totalOverride = override !== '' ? parseFloat(override) : null;
    const calculatedTotal = state.sessionItems.reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 1)), 0);

    // Validation
    if (state.sessionItems.length === 0 && (totalOverride === null || totalOverride <= 0)) {
        showToast('Ajoutez au moins un article ou saisissez le coût réel', 'warning');
        return;
    }

    const sessionDate = dateVal ? new Date(dateVal).toISOString() : new Date().toISOString();
    const finalTotal  = totalOverride !== null ? totalOverride : calculatedTotal;

    try {
        showToast('Enregistrement de la session...', 'info');

        await apiFetch('/api/shopping-sessions', {
            method: 'POST',
            body: {
                id: id ? parseInt(id) : null,
                session_date: sessionDate,
                store,
                notes,
                items: state.sessionItems,
                total_cost_override: totalOverride
            }
        });

        const hasStock = state.sessionItems.some(i => i.product_id);
        showToast(
            `Session enregistrée : ${finalTotal.toFixed(2)} €${hasStock ? ' · Stock mis à jour ✅' : ''}`,
            'success'
        );

        closeSessionModal();
        await loadAllData();
        renderAll();

    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement', 'error');
    }
}

// ==========================================================================
// HELPERS SCORE DE CONSOMMATION
// ==========================================================================

function getScoreVisual(score) {
    if (score === null || score === undefined) {
        return { tier: 'new', icon: '🆕', label: 'Nouveau' };
    }
    const s = parseFloat(score);
    if (s >= 7) return { tier: 'hot',  icon: '🔥', label: `${s.toFixed(1)}/10` };
    if (s >= 4) return { tier: 'warm', icon: '📦', label: `${s.toFixed(1)}/10` };
    return            { tier: 'cold', icon: '❄️', label: `${s.toFixed(1)}/10` };
}

function updateManualScoreBadge(value) {
    const display = document.getElementById('manual-score-display');
    if (!display) return;
    const visual = getScoreVisual(value);
    display.className = `score-badge score-${visual.tier}`;
    display.textContent = `${visual.icon} ${parseFloat(value).toFixed(1)}`;
}

// ==========================================================================
// RECOMMANDATIONS INTELLIGENTES D'ACHAT
// ==========================================================================

function renderSuggestions() {
    const container = document.getElementById('suggestions-list');
    const countBadge = document.getElementById('suggestions-count');
    if (!container) return;

    const suggestions = state.suggestions || [];
    if (countBadge) countBadge.textContent = suggestions.length;

    if (suggestions.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:1.5rem;color:var(--text-muted);">
                <i data-lucide="check-circle" style="width:32px;height:32px;opacity:0.3;color:var(--success);margin-bottom:0.5rem;"></i>
                <p style="font-size:0.85rem;">Vos stocks sont bien approvisionnés — aucune recommandation urgente.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = '';
    suggestions.forEach(item => {
        const effectiveScore = item.effectiveScore;
        const scoreVisual = getScoreVisual(effectiveScore);

        // Barre de priorité (0→100%)
        const priorityPct = Math.round(item.priority * 100);
        const priorColor = priorityPct >= 70 ? '#f43f5e' : priorityPct >= 45 ? '#f59e0b' : '#6366f1';

        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div class="suggestion-icon">${item.photo && !item.photo.startsWith('data:') ? item.photo : '📦'}</div>
            <div class="suggestion-body">
                <div class="suggestion-name">${item.name}</div>
                <div class="suggestion-meta">
                    <span class="score-badge score-${scoreVisual.tier}">${scoreVisual.icon} ${scoreVisual.label}</span>
                    <span class="suggestion-reason">${item.reason}</span>
                </div>
                <div class="suggestion-priority-bar">
                    <div class="suggestion-priority-fill" style="width:${priorityPct}%;background:${priorColor};"></div>
                </div>
                <div style="font-size:0.7rem;color:var(--text-muted);">Stock : <strong>${item.qty} ${item.unit}</strong> · Alerte : ${item.alert_qty}</div>
            </div>
            <button class="btn btn-secondary suggestion-add-btn" title="Ajouter à la liste de courses" data-product-id="${item.id}" data-name="${item.name}" data-unit="${item.unit}" data-price="${item.price || 0}">
                <i data-lucide="plus" style="width:14px;height:14px;"></i>
            </button>
        `;

        div.querySelector('.suggestion-add-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            const productName = btn.getAttribute('data-name');
            const productUnit = btn.getAttribute('data-unit');
            const productPrice = parseFloat(btn.getAttribute('data-price')) || 0;
            const productId = btn.getAttribute('data-product-id');

            const newItem = {
                id: `manual-${Date.now()}`,
                productId: parseInt(productId),
                name: productName,
                qtyNeeded: 1,
                unit: productUnit,
                price: productPrice,
                isAuto: false,
                checked: false
            };

            try {
                await apiFetch('/api/shopping', { method: 'POST', body: newItem });
                showToast(`${productName} ajouté aux courses`, 'success');
                await loadAllData();
                renderShoppingList();
                renderSuggestions();
            } catch (err) {
                console.error(err);
                showToast('Erreur lors de l\'ajout', 'error');
            }
        });

        container.appendChild(div);
    });

    lucide.createIcons();
}

// ==========================================================================
// SESSIONS DE COURSES & CLASSEMENT PRODUITS (FINANCES)
// ==========================================================================

// Affiche les sessions récentes dans l'onglet Courses
async function renderCoursesSessions() {
    const container = document.getElementById('courses-sessions-list');
    const countBadge = document.getElementById('courses-sessions-count');
    if (!container) return;

    try {
        const data = await apiFetch('/api/shopping-sessions?period=year'); // Tout afficher
        const sessions = (data.sessions || []).slice(0, 8); // Max 8 dernières

        if (countBadge) countBadge.textContent = `${data.sessions?.length || 0} session(s)`;

        if (sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
                    <i data-lucide="shopping-bag" style="width:32px;height:32px;opacity:0.25;margin-bottom:0.5rem;display:block;margin-inline:auto;"></i>
                    Aucune session enregistrée.<br>
                    <span style="font-size:0.75rem;">Remplissez le formulaire ci-dessus ou cliquez sur "Courses faites" après vos achats.</span>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        container.innerHTML = '';
        sessions.forEach(session => {
            const dateObj = new Date(session.session_date);
            const dateStr = dateObj.toLocaleDateString('fr-FR', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
            });
            const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'session-item';
            div.style.cssText = 'display:flex; align-items:center; gap:1rem;';
            div.innerHTML = `
                <div style="font-size:1.4rem;">🛒</div>
                <div style="flex:1;">
                    <div class="session-date" style="font-weight:600; font-size:0.88rem;">
                        ${session.store || 'Magasin inconnu'} <span style="font-weight:400; color:var(--text-muted); font-size:0.75rem;">· ${dateStr}</span>
                    </div>
                    <div class="session-meta" style="font-size:0.75rem; color:var(--text-muted); margin-top:0.1rem;">
                        ${session.items_count > 0 ? `${session.items_count} article(s)` : 'Articles non renseignés'}
                    </div>
                    ${session.notes ? `<div class="session-notes">${session.notes}</div>` : ''}
                </div>
                <div style="font-weight:700; color:#38bdf8; font-size:1rem; white-space:nowrap;">
                    ${(session.total_cost || 0).toFixed(2)} €
                </div>
                <div style="display:flex; gap:0.3rem;">
                    <button class="btn btn-secondary btn-edit-session" style="width:28px;height:28px;border-radius:6px;padding:0;" title="Modifier">
                        <i data-lucide="pencil" style="width:12px;height:12px;"></i>
                    </button>
                    <button class="btn btn-danger session-delete-btn" data-id="${session.id}" title="Supprimer">
                        <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                    </button>
                </div>
            `;

            div.querySelector('.btn-edit-session').addEventListener('click', () => openSessionModal(session));
            div.querySelector('.session-delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('Supprimer cette session de courses ?')) {
                    try {
                        await apiFetch(`/api/shopping-sessions/${id}`, { method: 'DELETE' });
                        showToast('Session supprimée', 'info');
                        await renderCoursesSessions();
                    } catch (err) {
                        showToast('Erreur lors de la suppression', 'error');
                    }
                }
            });

            container.appendChild(div);
        });

        lucide.createIcons();
    } catch (err) {
        console.error('Erreur sessions courses:', err);
    }
}

async function renderFinancesSessions() {
    try {
        const data = await apiFetch(`/api/shopping-sessions?period=${state.financePeriod}`);
        const stats = data.stats || {};

        document.getElementById('sessions-count').textContent = stats.session_count || 0;
        document.getElementById('sessions-total-cost').textContent = `${(stats.total_spent || 0).toFixed(2)} €`;
        document.getElementById('sessions-avg-cost').textContent = `${(stats.avg_cost || 0).toFixed(2)} €`;
        document.getElementById('sessions-total-items').textContent = stats.total_items || 0;

        const listContainer = document.getElementById('sessions-list-container');
        const listCount = document.getElementById('sessions-list-count');
        if (listCount) listCount.textContent = `${(data.sessions || []).length} session(s)`;

        listContainer.innerHTML = '';
        if (!data.sessions || data.sessions.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.9rem;">
                    Aucune session de courses pour cette période.<br>
                    <span style="font-size:0.8rem;">Validez vos courses via "Courses faites" pour enregistrer une session.</span>
                </div>
            `;
            return;
        }

        data.sessions.forEach((session, idx) => {
            const dateObj = new Date(session.session_date);
            const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            const div = document.createElement('div');
            div.className = 'session-item';
            div.innerHTML = `
                <div class="session-rank">#${idx + 1}</div>
                <div class="session-info">
                    <div class="session-date">${dateStr} à ${timeStr}</div>
                    <div class="session-meta">${session.items_count} article(s) achetés</div>
                </div>
                <div class="session-cost">${(session.total_cost || 0).toFixed(2)} €</div>
            `;
            listContainer.appendChild(div);
        });
    } catch (err) {
        console.error('Erreur sessions:', err);
    }
}

async function renderTopProducts() {
    try {
        const topProducts = await apiFetch(`/api/analytics/top-products?period=${state.financePeriod}&limit=10`);
        const container = document.getElementById('top-products-list');
        const count = document.getElementById('top-products-period-label');

        if (count) {
            const labels = { week: 'Cette semaine', month: 'Ce mois', year: 'Cette année' };
            count.textContent = labels[state.financePeriod] || 'Ce mois';
        }

        container.innerHTML = '';
        if (!topProducts || topProducts.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.9rem;">Aucun achat enregistré pour cette période.</div>`;
            return;
        }

        const maxSpent = topProducts[0].total_spent || 1;

        topProducts.forEach((prod, idx) => {
            const pct = Math.round((prod.total_spent / maxSpent) * 100);
            const medals = ['🥇', '🥈', '🥉'];
            const rankDisplay = idx < 3 ? medals[idx] : `#${idx + 1}`;
            const categoryName = getCategoryFriendlyName(prod.category);

            const div = document.createElement('div');
            div.className = 'top-product-item';
            div.innerHTML = `
                <div class="top-product-rank">${rankDisplay}</div>
                <div class="top-product-body">
                    <div class="top-product-name">${prod.name}</div>
                    <div class="top-product-meta">
                        <span class="badge badge-info" style="font-size:0.7rem;">${categoryName}</span>
                        <span style="font-size:0.75rem;color:var(--text-muted);">${prod.purchase_count}x acheté · ${prod.total_qty} unités</span>
                    </div>
                    <div class="top-product-bar">
                        <div class="top-product-bar-fill" style="width:${pct}%;"></div>
                    </div>
                </div>
                <div class="top-product-cost">${(prod.total_spent || 0).toFixed(2)} €</div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Erreur top-produits:', err);
    }
}

// ==========================================================================
// UTILITAIRES
// ==========================================================================

function getCategoryFriendlyName(cat) {
    const cats = {
        'Epicerie': 'Épicerie & Pâtes',
        'FruitsLegumes': 'Fruits & Légumes',
        'ProduitsLaitiers': 'Produits Laitiers',
        'ViandesPoissons': 'Viandes & Poissons',
        'Boissons': 'Boissons',
        'Surgeles': 'Surgelés',
        'Boulangerie': 'Boulangerie',
        'Autre': 'Autres'
    };
    return cats[cat] || cat;
}

function formatTimeAgo(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 60) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHour < 24) return `Il y a ${diffHour} h`;
    
    const date = new Date(timestamp);
    return `Le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'warning') icon = 'alert-triangle';
    else if (type === 'error') icon = 'x-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}
