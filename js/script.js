// ===== SVG Avatar Generator =====
function generateProductSVG(product) {
    const category = product.category;
    const gender = product.gender || 'male';
    const sleeve = product.sleeve || 'full';
    const bgGradients = {
        'doctor-coats': ['#e8f4fd', '#d4e8f7'],
        'scrub-suits': ['#e8f8f0', '#d0f0e0'],
        'hospital-uniforms': ['#eae4f7', '#ddd4f0'],
        'hospital-linen': ['#f0f8ff', '#e0f0ff'],
        'bedsheets': ['#fff0f0', '#ffe8e8'],
        'hotel-linen': ['#fff8e8', '#fff0d0']
    };
    const bg = bgGradients[category] || bgGradients['doctor-coats'];
    const skinTones = ['#f5cba7', '#d4a574', '#8d5524', '#f8d9b0'];
    const skinTone = skinTones[product.id % skinTones.length];
    const skinShadow = skinTone === '#f5cba7' ? '#e8b98a' : skinTone === '#d4a574' ? '#b8885c' : skinTone === '#8d5524' ? '#6b3a12' : '#e0c090';
    const hairColors = ['#4a3728', '#1a1a2e', '#8b4513', '#2c1810'];
    const hairColor = hairColors[product.id % hairColors.length];
    let hairSVG = '', faceSVG = '', eyesSVG = '', noseMouthSVG = '', neckSVG = '', bodySVG = '';

    if (category === 'bedsheets' || category === 'hospital-linen' || category === 'hotel-linen') {
        // Non-person products
        if (category === 'bedsheets') {
            bodySVG = `<rect x="95" y="100" width="110" height="80" rx="8" fill="#f8e8e8" stroke="#e0c8c8" stroke-width="1"/><rect x="100" y="105" width="100" height="70" rx="6" fill="#fff5f5"/><rect x="110" y="108" width="4" height="64" fill="#ffb3b3" opacity="0.4"/><rect x="130" y="108" width="4" height="64" fill="#ffb3b3" opacity="0.4"/><rect x="150" y="108" width="4" height="64" fill="#ffb3b3" opacity="0.4"/><rect x="170" y="108" width="4" height="64" fill="#ffb3b3" opacity="0.4"/><ellipse cx="150" cy="210" rx="40" ry="20" fill="#e8f4ff" stroke="#c8dced" stroke-width="1"/>`;
        } else if (category === 'hospital-linen') {
            bodySVG = `<rect x="100" y="80" width="100" height="130" rx="5" fill="#e8f8f0" stroke="#b8e0d0" stroke-width="1.5"/><rect x="108" y="88" width="84" height="114" rx="3" fill="#f0fff8"/><rect x="140" y="110" width="20" height="60" rx="3" fill="#48cae4" opacity="0.3"/><rect x="125" y="130" width="50" height="20" rx="3" fill="#48cae4" opacity="0.3"/><rect x="125" y="195" width="50" height="12" rx="3" fill="#fff" stroke="#48cae4" stroke-width="0.5"/><text x="150" y="204" font-family="Arial" font-size="7" fill="#48cae4" text-anchor="middle">STERILE</text>`;
        } else {
            bodySVG = `<rect x="95" y="85" width="110" height="75" rx="6" fill="#fffff0" stroke="#e8dcc0" stroke-width="1.5"/><rect x="100" y="90" width="100" height="65" rx="4" fill="#fffdf5"/><rect x="105" y="95" width="90" height="55" rx="2" fill="none" stroke="#f0e0a0" stroke-width="0.8"/><ellipse cx="150" cy="200" rx="30" ry="18" fill="#fffcf0" stroke="#e8dcc0" stroke-width="1"/><text x="150" y="125" font-family="Arial" font-size="10" fill="#c89f30" text-anchor="middle">★★★★★</text>`;
        }
    } else {
        // Person-based products
        if (gender === 'female') {
            hairSVG = `<ellipse cx="150" cy="72" rx="32" ry="35" fill="${hairColor}"/><path d="M120 72 Q120 45 150 40 Q180 45 180 72 Q180 55 170 50 Q150 42 130 50 Q120 55 120 72" fill="${hairColor}"/><path d="M122 80 Q118 100 120 115 Q122 120 125 115 Q127 100 126 85 Z" fill="${hairColor}"/><path d="M178 80 Q182 100 180 115 Q178 120 175 115 Q173 100 174 85 Z" fill="${hairColor}"/>`;
        } else {
            hairSVG = `<ellipse cx="150" cy="68" rx="28" ry="28" fill="${hairColor}"/><path d="M124 70 Q124 48 150 42 Q176 48 176 70 Q176 55 165 48 Q150 40 135 48 Q124 55 124 70" fill="${hairColor}"/>`;
        }
        faceSVG = `<ellipse cx="150" cy="82" rx="24" ry="28" fill="${skinTone}"/><ellipse cx="127" cy="82" rx="5" ry="7" fill="${skinTone}"/><ellipse cx="173" cy="82" rx="5" ry="7" fill="${skinTone}"/>`;
        eyesSVG = `<ellipse cx="141" cy="80" rx="5" ry="5.5" fill="#fff"/><ellipse cx="159" cy="80" rx="5" ry="5.5" fill="#fff"/><circle cx="141" cy="81" r="3" fill="#3d2314"/><circle cx="159" cy="81" r="3" fill="#3d2314"/><circle cx="140" cy="79.5" r="1.2" fill="#fff"/><circle cx="158" cy="79.5" r="1.2" fill="#fff"/><path d="M136 74 Q141 72 146 74" fill="none" stroke="${hairColor}" stroke-width="1.8" stroke-linecap="round"/><path d="M154 74 Q159 72 164 74" fill="none" stroke="${hairColor}" stroke-width="1.8" stroke-linecap="round"/>`;
        noseMouthSVG = `<path d="M148 87 Q150 90 152 87" fill="none" stroke="${skinShadow}" stroke-width="1" stroke-linecap="round"/><path d="M143 96 Q150 101 157 96" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round"/>`;
        neckSVG = `<rect x="143" y="105" width="14" height="12" rx="2" fill="${skinTone}"/>`;

        if (category === 'doctor-coats') {
            const sl = sleeve === 'half' ? 155 : 185;
            bodySVG = `<path d="M125 117 Q125 115 130 113 L170 113 Q175 115 175 117 L180 210 Q180 215 170 215 L130 215 Q120 215 120 210 Z" fill="#fff" stroke="#e0e7ed" stroke-width="0.5"/><path d="M140 113 L145 125 L150 118 L155 125 L160 113" fill="#fff" stroke="#e0e7ed" stroke-width="1"/><circle cx="150" cy="140" r="2.5" fill="#e0e7ed"/><circle cx="150" cy="155" r="2.5" fill="#e0e7ed"/><circle cx="150" cy="170" r="2.5" fill="#e0e7ed"/><path d="M125 117 L108 127 Q104 130 107 ${sl} L115 ${sl+2}" fill="#fff" stroke="#e0e7ed" stroke-width="0.5"/><path d="M175 117 L192 127 Q196 130 193 ${sl} L185 ${sl+2}" fill="#fff" stroke="#e0e7ed" stroke-width="0.5"/><ellipse cx="111" cy="${sl+5}" rx="6" ry="7" fill="${skinTone}"/><ellipse cx="189" cy="${sl+5}" rx="6" ry="7" fill="${skinTone}"/><path d="M145 120 Q140 130 138 150 Q136 165 140 170" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round"/><circle cx="140" cy="172" r="4" fill="#666" stroke="#444" stroke-width="1"/>`;
        } else if (category === 'scrub-suits') {
            const colors = ['#1a5276', '#1e8449', '#6c3483', '#922b21'];
            const c = colors[product.id % colors.length];
            bodySVG = `<path d="M127 117 Q127 115 132 113 L168 113 Q173 115 173 117 L175 178 L125 178 Z" fill="${c}"/><path d="M142 113 L150 130 L158 113" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/><path d="M127 117 L108 127 Q104 130 106 155 L114 157" fill="${c}"/><path d="M173 117 L192 127 Q196 130 194 155 L186 157" fill="${c}"/><ellipse cx="110" cy="160" rx="6" ry="7" fill="${skinTone}"/><ellipse cx="190" cy="160" rx="6" ry="7" fill="${skinTone}"/><path d="M128 178 L126 220 L142 220 L148 185 L152 185 L158 220 L174 220 L172 178 Z" fill="${c}" opacity="0.85"/>`;
        } else {
            const colors = ['#2980b9', '#8e44ad', '#27ae60', '#16a085'];
            const c = colors[product.id % colors.length];
            bodySVG = `<path d="M128 117 Q128 115 133 113 L167 113 Q172 115 172 117 L174 180 L126 180 Z" fill="${c}"/><path d="M128 117 L110 127 Q106 130 108 155 L116 157" fill="${c}"/><path d="M172 117 L190 127 Q194 130 192 155 L184 157" fill="${c}"/><ellipse cx="112" cy="160" rx="6" ry="7" fill="${skinTone}"/><ellipse cx="188" cy="160" rx="6" ry="7" fill="${skinTone}"/>${gender === 'female' ? `<path d="M126 180 L122 240 L178 240 L174 180 Z" fill="${c}" opacity="0.85"/>` : `<path d="M126 180 L124 240 L142 240 L148 185 L152 185 L158 240 L176 240 L174 180 Z" fill="#2c3e50"/>`}`;
        }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260"><defs><linearGradient id="bg${product.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${bg[0]}"/><stop offset="100%" style="stop-color:${bg[1]}"/></linearGradient></defs><rect width="300" height="260" fill="url(#bg${product.id})" rx="12"/><g>${bodySVG}${neckSVG}${faceSVG}${eyesSVG}${noseMouthSVG}${hairSVG}</g></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ===== Product Data =====
// ===== Color Options Config =====
// Color options for order customization (no image change)
const colorOptions = {
    'doctor-uniform': [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Light Blue', hex: '#B3D9FF' },
        { name: 'Mint Green', hex: '#A8E6CF' },
        { name: 'Navy', hex: '#1A237E' },
        { name: 'Gray', hex: '#9E9E9E' },
    ],
    'staff-uniform': [
        { name: 'Blue', hex: '#2196F3' },
        { name: 'Green', hex: '#4CAF50' },
        { name: 'Pink', hex: '#E91E63' },
        { name: 'Maroon', hex: '#880E4F' },
        { name: 'Gray', hex: '#607D8B' },
        { name: 'Brown', hex: '#795548' },
    ],
    'bedsheets': [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Sky Blue', hex: '#4FC3F7' },
        { name: 'Forest Green', hex: '#388E3C' },
        { name: 'Navy Blue', hex: '#1A237E' },
        { name: 'Maroon', hex: '#880E4F' },
    ],
    'hospital-linen': [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Teal', hex: '#00897B' },
        { name: 'Royal Blue', hex: '#1565C0' },
        { name: 'Forest Green', hex: '#2E7D32' },
        { name: 'Charcoal', hex: '#424242' },
    ],
    'hotel-linen': [
        { name: 'White', hex: '#FFFFFF' },
        { name: 'Ivory', hex: '#F5E6CA' },
        { name: 'Sky Blue', hex: '#4FC3F7' },
        { name: 'Peach', hex: '#FFAB91' },
        { name: 'Sage Green', hex: '#81C784' },
    ],
};

function getProductColors(product) {
    return colorOptions[product.category] || colorOptions['hospital-linen'];
}

const productsData = [
    // ── Doctor Uniform > Male Doctor Uniform ──
    { id: 1, name: "Male Doctor Uniform - Full Sleeve", category: "doctor-uniform", gender: "male", sleeve: "full", price: 850, oldPrice: 1100, rating: 4.8, reviews: 124, badge: "Bestseller", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Premium full-sleeve doctor uniform for men. High-quality wrinkle-resistant cotton blend for all-day comfort.", image: "images/Images/Male Full Sleeve.jpg" },
    { id: 2, name: "Male Doctor Uniform - Half Sleeve", category: "doctor-uniform", gender: "male", sleeve: "half", price: 750, oldPrice: 950, rating: 4.7, reviews: 89, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable half-sleeve doctor uniform for men, ideal for warm climates and long shifts.", image: "images/Images/Male Half Sleeve.jpg" },
    // ── Doctor Uniform > Female Doctor Uniform ──
    { id: 3, name: "Female Doctor Uniform - Full Sleeve", category: "doctor-uniform", gender: "female", sleeve: "full", price: 900, oldPrice: 1200, rating: 4.9, reviews: 67, badge: "New", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Elegant full-sleeve doctor uniform for women with feminine tailoring and professional finish.", image: "images/Images/Female Full Sleeve.jpg" },
    { id: 4, name: "Female Doctor Uniform - Half Sleeve", category: "doctor-uniform", gender: "female", sleeve: "half", price: 800, oldPrice: 1050, rating: 4.8, reviews: 56, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Ladies half-sleeve doctor uniform with modern fit and breathable fabric.", image: "images/Images/Female Half Sleeve.jpg" },
    // ── Staff Uniform > Male Staff Uniform ──
    { id: 5, name: "Male Staff Uniform - Beige Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 550, oldPrice: 720, rating: 4.6, reviews: 145, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Professional beige style staff uniform for men. Durable and comfortable for daily use.", image: "images/Images/Male Uniform (Beige Style).jpg" },
    { id: 6, name: "Male Staff Uniform - Blue Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 550, oldPrice: 720, rating: 4.5, reviews: 132, badge: "Popular", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Smart blue style staff uniform for men. Ideal for hospital and institutional use.", image: "images/Images/Male Uniform (Blue Style).jpg" },
    { id: 7, name: "Male Staff Uniform - Brown Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 560, oldPrice: 730, rating: 4.5, reviews: 98, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Durable brown style staff uniform for men with reinforced stitching.", image: "images/Images/Male Uniform (Brown Style).jpg" },
    { id: 8, name: "Male Staff Uniform - Gray Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 540, oldPrice: 710, rating: 4.6, reviews: 87, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable gray style staff uniform for men. Wrinkle-resistant fabric.", image: "images/Images/Male Uniform (Gray Style).jpg" },
    { id: 9, name: "Male Ward Boy Uniform - Blue", category: "staff-uniform", gender: "male", sleeve: "half", price: 500, oldPrice: 650, rating: 4.4, reviews: 87, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Blue ward boy uniform designed for daily hospital duties.", image: "images/Images/Male Uniform (Blue Ward Boy).jpg" },
    { id: 10, name: "Male Ward Boy Uniform - Gray", category: "staff-uniform", gender: "male", sleeve: "half", price: 500, oldPrice: 650, rating: 4.3, reviews: 76, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Gray ward boy uniform for comfort during demanding shifts.", image: "images/Images/Male Uniform (Gray Ward Boy).jpg" },
    { id: 11, name: "Male Ward Boy Uniform - Green", category: "staff-uniform", gender: "male", sleeve: "half", price: 500, oldPrice: 650, rating: 4.4, reviews: 82, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Green ward boy uniform. Durable and easy to maintain.", image: "images/Images/Male Uniform (Green Ward Boy).jpg" },
    // ── Staff Uniform > Female Staff Uniform ──
    { id: 12, name: "Female Staff Uniform - Blue Style", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, rating: 4.7, reviews: 178, badge: "Bestseller", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Professional blue style staff uniform for women. Elegant and comfortable.", image: "images/Images/Female Uniform (Blue Style).jpg" },
    { id: 13, name: "Female Staff Uniform - Blue Style 02", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, rating: 4.6, reviews: 112, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Elegant blue style staff uniform variant for women with modern cut.", image: "images/Images/Female Uniform (Blue Style 02).jpg" },
    { id: 14, name: "Female Staff Uniform - Dark Pink", category: "staff-uniform", gender: "female", sleeve: "half", price: 590, oldPrice: 760, rating: 4.8, reviews: 156, badge: "New", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Stylish dark pink staff uniform for women. Vibrant and professional.", image: "images/Images/Female Uniform (Dark Pink).jpg" },
    { id: 15, name: "Female Staff Uniform - Green Color", category: "staff-uniform", gender: "female", sleeve: "half", price: 570, oldPrice: 740, rating: 4.5, reviews: 98, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Fresh green color staff uniform for women. Comfortable for all-day wear.", image: "images/Images/Female Uniform (Green Color).jpg" },
    { id: 16, name: "Female Staff Uniform - Pink Style", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, rating: 4.7, reviews: 134, badge: "Popular", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Classic pink style staff uniform for women with flattering fit.", image: "images/Images/Female Uniform (Pink Style).jpg" },
    { id: 17, name: "Female Staff Uniform - Pink Style 02", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, rating: 4.6, reviews: 89, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Pink style staff uniform variant for women. Soft and durable fabric.", image: "images/Images/Female Uniform (Pink Style) (2).jpg" },
    { id: 18, name: "Female Staff Uniform - Red Style", category: "staff-uniform", gender: "female", sleeve: "half", price: 590, oldPrice: 760, rating: 4.8, reviews: 143, badge: "Premium", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Elegant red style staff uniform for women. Premium quality fabric.", image: "images/Images/Female Uniform (Red Style).jpg" },
    // ── Bedsheets ──
    { id: 19, name: "Bedsheet - Striped Blue & White", category: "bedsheets", price: 350, oldPrice: 450, rating: 4.3, reviews: 234, badge: "", sizes: ["60x90","60x100","90x100"], description: "Hospital-grade striped bedsheet in blue and white.", image: "images/Images/Striped Sheet.jpg" },
    { id: 20, name: "Bedsheet - Checked Blue", category: "bedsheets", price: 320, oldPrice: 420, rating: 4.5, reviews: 189, badge: "", sizes: ["60x90","60x100","90x100"], description: "Blue checked pattern hospital bedsheet." },
    { id: 21, name: "Pillow Cover - Light Blue Set", category: "bedsheets", price: 150, oldPrice: 200, rating: 4.2, reviews: 76, badge: "", sizes: ["Standard","Large"], description: "Set of 2 light blue pillow covers with zipper closure." },
    // ── Hospital Linen ──
    { id: 22, name: "Hospital Towel - OT Grade", category: "hospital-linen", price: 220, oldPrice: 300, rating: 4.4, reviews: 112, badge: "", sizes: ["36x1m","36x1.25m","60x2m"], description: "High-absorbency OT towel ideal for surgical procedures.", image: "images/Images/Hospital Towel.jpg" },
    { id: 23, name: "Surgical Cap & Mask Set", category: "hospital-linen", price: 120, oldPrice: 160, rating: 4.6, reviews: 267, badge: "Popular", sizes: ["Standard","Large"], description: "Reusable surgical cap and mask set.", image: "images/Images/Head cap and Mask.jpg" },
    { id: 24, name: "Surgeon Apron - Ladies", category: "hospital-linen", gender: "female", sleeve: "half", price: 450, oldPrice: 580, rating: 4.8, reviews: 43, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Ladies surgeon apron with side-tie wrap-around design.", image: "images/Images/Surgeon Apron.jpg" },
    { id: 25, name: "Patient Gown - Cotton", category: "hospital-linen", price: 380, oldPrice: 480, rating: 4.3, reviews: 98, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable cotton patient gown." },
    { id: 26, name: "Surgeon Apron - Gents", category: "hospital-linen", gender: "male", sleeve: "full", price: 520, oldPrice: 680, rating: 4.9, reviews: 34, badge: "Premium", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Heavy-duty surgeon apron for men with full-sleeve design.", image: "images/Images/Male Surgeon Apron.jpg" },
    // ── Hotel Linen ──
    { id: 27, name: "Hotel Bedsheet - Premium White", category: "hotel-linen", price: 480, oldPrice: 620, rating: 4.9, reviews: 78, badge: "Premium", sizes: ["Single","Double","King"], description: "Premium white hotel bedsheet with 300 thread count." },
    { id: 28, name: "Hotel Towel - Big 60x2m", category: "hotel-linen", price: 350, oldPrice: 450, rating: 4.5, reviews: 134, badge: "", sizes: ["Standard","Large","Bath Sheet"], description: "Large hotel bath towel with excellent absorbency." },
    // ── New Hospital Linen ──
    { id: 29, name: "Abdominal Sheet 9x9", category: "hospital-linen", price: 280, oldPrice: 380, rating: 4.5, reviews: 89, badge: "New", sizes: ["9x9","Standard"], description: "Surgical abdominal sheet with center hole for OT procedures. High-grade sterile fabric.", image: "images/Images/abdominal Sheet 9x9.jpg" },
    { id: 30, name: "Surgical Eye Pad", category: "hospital-linen", price: 95, oldPrice: 130, rating: 4.4, reviews: 156, badge: "", sizes: ["Standard"], description: "Reusable surgical eye pad with secure tie straps for post-operative care.", image: "images/Images/Eye Pad.jpg" },
    { id: 31, name: "Female Surgeon Apron - Green", category: "hospital-linen", gender: "female", sleeve: "full", price: 480, oldPrice: 620, rating: 4.7, reviews: 52, badge: "New", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Full green surgeon apron for women, includes matching cap and mask.", image: "images/Images/Female Surgoen Apron.jpg" },
    { id: 32, name: "OT Nighty - Patient Wear", category: "hospital-linen", gender: "female", price: 340, oldPrice: 450, rating: 4.6, reviews: 78, badge: "", sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable OT nighty for patients with front button closure.", image: "images/Images/OT Nighty.jpg" },
    // ── New Bedsheets ──
    { id: 33, name: "Bedspread & Pillow Cover Set - Striped", category: "bedsheets", price: 420, oldPrice: 550, rating: 4.5, reviews: 67, badge: "New", sizes: ["Single","Double","King"], description: "Premium striped bedspread with matching pillow cover set. Durable hospital-grade fabric.", image: "images/Images/Stripped Bedspread and Pillow Cover.jpg" },
];
productsData.forEach(p => { if (!p.image) p.image = generateProductSVG(p); });

// ===== State =====
let cart = JSON.parse(localStorage.getItem('ssa_cart') || '[]');
cart.forEach(item => { const p = productsData.find(x => x.id === item.id); if (p) item.image = p.image; });
let wishlist = JSON.parse(localStorage.getItem('ssa_wishlist') || '[]');
let displayedProducts = 12;
let currentFilter = 'all';

// ===== Wishlist =====
function isWishlisted(id) { return wishlist.includes(id); }
function requireAuth(action) {
    if (currentUser) { action(); return; }
    showToast('Please login or create an account to continue');
    openLoginModal();
}
function toggleWishlist(id) {
    requireAuth(() => {
        const idx = wishlist.indexOf(id);
        if (idx > -1) { wishlist.splice(idx, 1); } else { wishlist.push(id); }
        localStorage.setItem('ssa_wishlist', JSON.stringify(wishlist));
        updateWishlistCount();
        // Re-render so heart icon updates
        renderProducts(currentFilter, displayedProducts, window._currentGender, window._currentSleeve);
    });
}
function updateWishlistCount() {
    const el = document.getElementById('wishlistCount');
    if (el) { el.textContent = wishlist.length; el.style.display = wishlist.length > 0 ? 'flex' : 'none'; }
}

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
    initCommon();
    const page = document.body.dataset.page;
    if (page === 'home') initHomePage();
    if (page === 'categories') initCategoriesPage();
    if (page === 'contact') initContactPage();
    // Auto-sync any localStorage orders that failed to save during a previous session
    if (currentUser) {
        console.log('[app] User logged in as:', currentUser.email);
        setTimeout(() => {
            if (typeof syncPendingOrders === 'function') {
                console.log('[app] Starting auto-sync...');
                syncPendingOrders(currentUser.email, currentUser.name, currentUser.phone);
            } else {
                console.warn('[app] syncPendingOrders not available');
            }
        }, 500); // reduced from 2000ms to let firebase-db.js module load
    }
});

// ===== Common Init (all pages) =====
function initCommon() {
    // Preloader — hide on DOMContentLoaded+300ms (don't wait for Firebase SDKs)
    const hidePreloader = () => { setTimeout(() => { const p = document.getElementById('preloader'); if (p) p.classList.add('hidden'); }, 300); };
    hidePreloader(); // DOMContentLoaded has already fired since we're inside this listener
    // Absolute hard cap at 1.2s just in case
    setTimeout(() => { const p = document.getElementById('preloader'); if (p) p.classList.add('hidden'); }, 1200);

    // Header scroll
    const header = document.getElementById('header');
    const backToTop = document.getElementById('backToTop');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) header.classList.add('scrolled'); else header.classList.remove('scrolled');
        if (backToTop) { if (window.scrollY > 500) backToTop.classList.add('visible'); else backToTop.classList.remove('visible'); }
        revealElements();
    });
    if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Mobile nav
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (hamburger) {
        hamburger.addEventListener('click', () => { hamburger.classList.toggle('active'); navLinks.classList.toggle('active'); });
        navLinks.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { hamburger.classList.remove('active'); navLinks.classList.remove('active'); }); });
    }

    // Search
    const searchToggle = document.getElementById('searchToggle');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    if (searchToggle) searchToggle.addEventListener('click', () => searchOverlay.classList.add('active'));
    if (searchClose) searchClose.addEventListener('click', () => searchOverlay.classList.remove('active'));
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const results = document.getElementById('searchResults');
            if (q.length < 2) { results.innerHTML = ''; return; }
            const matches = productsData.filter(p => p.name.toLowerCase().includes(q) || p.category.includes(q));
            results.innerHTML = matches.slice(0, 6).map(p => `<div class="search-result-item" onclick="addToCart(${p.id}); document.getElementById('searchOverlay').classList.remove('active');"><img src="${p.image}" alt="${p.name}"><div><strong>${p.name}</strong><div style="color:var(--primary);font-weight:600;">₹${p.price}</div></div></div>`).join('');
        });
    }

    // Cart
    document.getElementById('cartToggle').addEventListener('click', () => requireAuth(openCart));
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);
    updateCartUI();

    // Checkout modal
    const modalClose = document.getElementById('modalClose');
    if (modalClose) modalClose.addEventListener('click', () => document.getElementById('checkoutModal').classList.remove('active'));
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) checkoutForm.addEventListener('submit', (e) => { e.preventDefault(); if (!validateShippingForm()) { nextStep(1); return; } placeOrder(); });

    // Auth
    updateAuthUI();
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeAuthModal(); });
    const pdModal = document.getElementById('productDetailModal');
    if (pdModal) pdModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeProductDetail(); });

    // Mobile bottom nav auth button
    const mbnAuthBtn = document.getElementById('mbnAuthBtn');
    if (mbnAuthBtn) mbnAuthBtn.addEventListener('click', () => {
        if (currentUser) openAccountPanel(); else openLoginModal();
    });
    // Mobile bottom nav cart badge sync
    const mbnCartCount = document.getElementById('mbnCartCount');
    if (mbnCartCount) {
        const syncMbnCart = () => {
            const total = cart.reduce((s,i) => s + i.qty, 0);
            mbnCartCount.textContent = total;
            mbnCartCount.style.display = total > 0 ? 'flex' : 'none';
        };
        document.addEventListener('cartUpdated', syncMbnCart);
        syncMbnCart();
    }

    // Gate wishlist & mobile cart behind auth
    document.querySelectorAll('.wishlist-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!currentUser) { e.preventDefault(); openLoginModal(); showToast('Please sign in to view your wishlist'); }
        });
    });
    const mbnCartBtn2 = document.getElementById('mbnCartBtn');
    if (mbnCartBtn2) mbnCartBtn2.addEventListener('click', () => requireAuth(openCart));

    // Chatbot
    initChatbot();

    // Reveal
    revealElements();

    // Stats counter
    initStatsCounter();

    // Scroll Progress Bar
    initScrollProgress();

    // Hero Particles
    initHeroParticles();

    // Add stagger class to shop grids and category grids
    document.querySelectorAll('.shop-grid, .categories-grid, .testimonial-grid, .mv-grid, .team-grid').forEach(g => {
        g.classList.add('reveal-stagger');
    });

    // Mark cards with badges for animated border
    document.querySelectorAll('.shop-card').forEach(card => {
        if (card.querySelector('.shop-card-badge')) card.classList.add('has-badge');
    });

    // 3D Tilt Effect on product cards (desktop only)
    if (window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            document.querySelectorAll('.shop-card').forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    const rotateX = ((y - rect.height / 2) / rect.height) * -6;
                    const rotateY = ((x - rect.width / 2) / rect.width) * 6;
                    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
                } else {
                    card.style.transform = '';
                }
            });
        });
    }

    // Wishlist heart toggle (persistent)
    document.addEventListener('click', (e) => {
        const wishBtn = e.target.closest('.shop-card-wishlist');
        if (wishBtn) {
            e.stopPropagation();
            const pid = parseInt(wishBtn.dataset.productId);
            if (!pid) return;
            toggleWishlist(pid);
            const icon = wishBtn.querySelector('i');
            if (isWishlisted(pid)) {
                wishBtn.classList.add('liked');
                icon.classList.replace('far', 'fas');
                showToast('Added to wishlist!');
            } else {
                wishBtn.classList.remove('liked');
                icon.classList.replace('fas', 'far');
                showToast('Removed from wishlist');
            }
        }
    });

    updateWishlistCount();

    // Init wishlist page if on it
    if (document.body.dataset.page === 'wishlist') initWishlistPage();
}

// ===== Home Page =====
function initHomePage() {
    initHeroSlider();
    // Render featured products (those with badges)
    const grid = document.getElementById('shopGrid');
    if (grid) {
        const featured = productsData.filter(p => p.badge);
        grid.innerHTML = featured.slice(0, 8).map(p => buildProductCard(p)).join('');
    }
}

// ===== Categories Page =====
function initCategoriesPage() {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    const gender = params.get('gender');
    const sleeve = params.get('sleeve');

    if (cat) {
        currentFilter = cat;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.filter === cat) b.classList.add('active');
        });
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayedProducts = 12;
            renderProducts(currentFilter, displayedProducts, gender, sleeve);
        });
    });

    // Sort
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'price-low') productsData.sort((a, b) => a.price - b.price);
            else if (val === 'price-high') productsData.sort((a, b) => b.price - a.price);
            else if (val === 'newest') productsData.sort((a, b) => b.id - a.id);
            else productsData.sort((a, b) => b.reviews - a.reviews);
            renderProducts(currentFilter, displayedProducts, gender, sleeve);
        });
    }

    // Load more
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => { displayedProducts += 12; renderProducts(currentFilter, displayedProducts, gender, sleeve); });
    }

    renderProducts(currentFilter, displayedProducts, gender, sleeve);
}

// ===== Contact Page =====
function initContactPage() {
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Sent Successfully!';
            btn.style.background = '#2ecc71';
            btn.disabled = true;
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.disabled = false; form.reset(); }, 3000);
        });
    }
}

// ===== Render Products =====
function buildProductCard(p) {
    const colors = getProductColors(p);
    const colorSwatchesHtml = colors ? `<div class="color-swatches" onclick="event.stopPropagation()">
        ${colors.map((c, i) => `<button class="color-swatch${i === 0 ? ' active' : ''}" data-hex="${c.hex}" data-color-name="${c.name}" title="${c.name}" style="background:${c.hex}${c.hex === '#FFFFFF' ? ';border-color:#ccc' : ''}" onclick="selectCardColor(this)"></button>`).join('')}
        <span class="color-name">${colors[0].name}</span>
    </div>` : '';
    const isOut = p.outOfStock === true;
    const isLow = !isOut && p.lowStock === true;
    const outBadge = isOut
        ? `<span class="shop-card-badge" style="background:#ef4444;color:#fff">Out of Stock</span>`
        : isLow
            ? `<span class="shop-card-badge" style="background:#f59e0b;color:#fff">Low Stock</span>`
            : (p.badge ? `<span class="shop-card-badge">${p.badge}</span>` : '');
    const addBtn = isOut
        ? `<button class="btn btn-primary" disabled style="opacity:0.4;cursor:not-allowed"><i class="fas fa-ban"></i> Out of Stock</button>`
        : `<button class="btn btn-primary" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Add</button>`;
    const buyBtn = isOut ? '' : `<button class="btn btn-outline-dark" onclick="buyNow(${p.id})"><i class="fas fa-bolt"></i> Buy</button>`;
    const quickBtn = isOut
        ? `<div class="shop-card-quick"><button class="btn btn-primary btn-sm" disabled style="opacity:0.5"><i class="fas fa-ban"></i> Out of Stock</button></div>`
        : `<div class="shop-card-quick"><button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Add</button></div>`;
    return `<div class="shop-card${p.badge || isOut || isLow ? ' has-badge' : ''} reveal active${isOut ? ' out-of-stock-card' : isLow ? ' low-stock-card' : ''}" data-category="${p.category}" data-id="${p.id}">
        ${outBadge}
        <button class="shop-card-wishlist" data-product-id="${p.id}" aria-label="Wishlist"><i class="${isWishlisted(p.id) ? 'fas' : 'far'} fa-heart"></i></button>
        <div class="shop-card-image" onclick="openProductDetail(${p.id})">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            ${quickBtn}
        </div>
        <div class="shop-card-body" onclick="openProductDetail(${p.id})">
            <span class="shop-card-category">${p.category.replace(/-/g, ' ')}</span>
            ${p.gender ? `<span class="shop-card-tag ${p.gender}">${p.gender === 'male' ? '<i class="fas fa-mars"></i> Gents' : '<i class="fas fa-venus"></i> Ladies'}${p.sleeve ? ' • ' + p.sleeve.charAt(0).toUpperCase() + p.sleeve.slice(1) + ' Sleeve' : ''}</span>` : ''}
            <h4>${p.name}</h4>
            ${colorSwatchesHtml}
            <div class="shop-card-rating">${'<i class="fas fa-star"></i>'.repeat(Math.floor(p.rating))}${p.rating % 1 ? '<i class="fas fa-star-half-alt"></i>' : ''}<span>(${p.reviews})</span></div>
            <div class="shop-card-price"><span class="price">₹${p.price}</span><span class="old-price">₹${p.oldPrice}</span></div>
            <div class="shop-card-footer" onclick="event.stopPropagation()">
                ${addBtn}
                ${buyBtn}
            </div>
        </div>
    </div>`;
}

function renderProducts(filter = 'all', count = 12, gender = null, sleeve = null) {
    let filtered = filter === 'all' ? [...productsData] : productsData.filter(p => p.category === filter);
    if (gender) filtered = filtered.filter(p => p.gender === gender);
    if (sleeve) filtered = filtered.filter(p => p.sleeve === sleeve);
    const toShow = filtered.slice(0, count);
    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    grid.innerHTML = toShow.map(p => buildProductCard(p)).join('');

    const info = document.getElementById('shopResultsInfo');
    if (info) info.textContent = `Showing ${toShow.length} of ${filtered.length} products`;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = count >= filtered.length ? 'none' : '';
}

// ===== Cart Functions =====
function addToCart(id) {
    requireAuth(() => {
        const product = productsData.find(p => p.id === id);
        if (!product) return;
        if (product.outOfStock) { showToast('Sorry, this product is currently out of stock!'); return; }
        const colors = getProductColors(product);
        const defaultColor = colors ? colors[0].name : null;
        const existing = cart.find(item => item.id === id);
        if (existing) existing.qty++;
        else cart.push({ ...product, qty: 1, selectedSize: product.sizes[0], selectedColor: defaultColor });
        saveCart(); updateCartUI(); openCart();
        showToast(`${product.name} added to cart!`);
    });
}
function buyNow(id) { requireAuth(() => { addToCart(id); openCheckout(); }); }
function removeFromCart(id) { cart = cart.filter(item => item.id !== id); saveCart(); updateCartUI(); }
function updateQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) { item.qty += delta; if (item.qty <= 0) removeFromCart(id); else { saveCart(); updateCartUI(); } }
}
function saveCart() { localStorage.setItem('ssa_cart', JSON.stringify(cart)); }

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotal = document.getElementById('cartTotal');
    if (!cartCount) return;
    const totalItems = cart.reduce((s, i) => s + i.qty, 0);
    const totalPrice = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    cartCount.textContent = totalItems;
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>Your cart is empty</p><a href="categories.html" class="btn btn-gradient btn-sm">Start Shopping</a></div>';
        cartFooter.style.display = 'none';
    } else {
        cartItems.innerHTML = cart.map(item => `<div class="cart-item"><div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div><div class="cart-item-info"><h4>${item.name}</h4><span class="item-meta">Size: ${item.selectedSize}${item.selectedColor ? ' | Color: ' + item.selectedColor : ''}</span><div class="item-price">₹${item.price * item.qty}</div><div class="cart-item-qty"><button onclick="updateQty(${item.id},-1)"><i class="fas fa-minus"></i></button><span>${item.qty}</span><button onclick="updateQty(${item.id},1)"><i class="fas fa-plus"></i></button></div></div><button class="cart-item-remove" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button></div>`).join('');
        cartFooter.style.display = 'block';
        cartTotal.textContent = `₹${totalPrice.toLocaleString()}`;
    }
}

function openCart() { document.getElementById('cartDrawer').classList.add('open'); document.getElementById('cartOverlay').classList.add('open'); }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('open'); }

// ===== Checkout =====
function openCheckout() {
    closeCart();
    document.getElementById('checkoutModal').classList.add('active');
    nextStep(1);
    // Pre-fill contact fields from logged-in user (readonly)
    if (currentUser) {
        const phoneEl = document.querySelector('[name="cphone"]');
        const emailEl = document.querySelector('[name="cemail"]');
        const fnEl   = document.querySelector('[name="firstname"]');
        const lnEl   = document.querySelector('[name="lastname"]');
        if (phoneEl && currentUser.phone) { phoneEl.value = currentUser.phone; phoneEl.readOnly = true; phoneEl.style.background = '#f1f5f9'; phoneEl.style.color = '#64748b'; }
        if (emailEl && currentUser.email) { emailEl.value = currentUser.email; emailEl.readOnly = true; emailEl.style.background = '#f1f5f9'; emailEl.style.color = '#64748b'; }
        // Pre-fill name if available
        const nameParts = (currentUser.name || '').split(' ');
        if (fnEl && !fnEl.value) fnEl.value = nameParts[0] || '';
        if (lnEl && !lnEl.value) lnEl.value = nameParts.slice(1).join(' ') || '';
        // Pre-fill saved address if available
        const addrs = JSON.parse(localStorage.getItem('ssa_addresses_' + currentUser.email) || '[]');
        if (addrs.length > 0) {
            const a = addrs[0];
            const addrEl = document.querySelector('[name="address"]');
            const cityEl = document.querySelector('[name="city"]');
            const pinEl  = document.querySelector('[name="pincode"]');
            if (addrEl && !addrEl.value) addrEl.value = a.street || '';
            if (cityEl && !cityEl.value) cityEl.value = a.city || '';
            if (pinEl  && !pinEl.value)  pinEl.value  = a.pincode || '';
        }
    }
}
function nextStep(step) {
    if (step === 2 && !validateShippingForm()) return;
    document.querySelectorAll('.checkout-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.checkout-steps .step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    document.querySelectorAll('.checkout-steps .step').forEach(s => { if (parseInt(s.dataset.step) <= step) s.classList.add('active'); });
    if (step === 3) renderOrderSummary();
}
function validateShippingForm() {
    const fields = [{name:'firstname',label:'First Name'},{name:'lastname',label:'Last Name'},{name:'cphone',label:'Phone'},{name:'cemail',label:'Email'},{name:'address',label:'Address'},{name:'city',label:'City'},{name:'pincode',label:'PIN Code'}];
    let valid = true;
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.form-group.has-error').forEach(el => el.classList.remove('has-error'));
    fields.forEach(f => {
        const input = document.querySelector(`[name="${f.name}"]`); if (!input) return;
        if (!input.value.trim()) { valid = false; const g = input.closest('.form-group'); g.classList.add('has-error'); const e = document.createElement('span'); e.className = 'field-error'; e.textContent = `Please fill ${f.label}`; g.appendChild(e); }
    });
    const email = document.querySelector('[name="cemail"]');
    if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { valid = false; const g = email.closest('.form-group'); if (!g.classList.contains('has-error')) { g.classList.add('has-error'); const e = document.createElement('span'); e.className = 'field-error'; e.textContent = 'Invalid email'; g.appendChild(e); } }
    if (!valid) showToast('Please fill all required fields');
    return valid;
}
function renderOrderSummary() {
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    document.getElementById('orderSummary').innerHTML = `${cart.map(i => `<div class="os-item"><span>${i.name} x${i.qty}</span><span>₹${i.price*i.qty}</span></div>`).join('')}<div class="os-item"><span>Shipping</span><span>${total > 2000 ? 'FREE' : '₹150'}</span></div><div class="os-total"><span>Total</span><span>₹${(total > 2000 ? total : total + 150).toLocaleString()}</span></div>`;
}
function closeSuccessModal() { document.getElementById('successModal').classList.remove('active'); }

// ===== Product Detail =====
let pdQuantity = 1;
function openProductDetail(id) {
    const p = productsData.find(x => x.id === id); if (!p) return;
    const discount = Math.round((1 - p.price / p.oldPrice) * 100);
    const colors = getProductColors(p);
    const colorSection = colors ? `<div class="pd-color-section"><h4>Select Color</h4><div class="pd-color-swatches">${colors.map((c, i) => `<button class="pd-color-swatch${i === 0 ? ' active' : ''}" data-hex="${c.hex}" data-color-name="${c.name}" title="${c.name}" style="background:${c.hex}${c.hex === '#FFFFFF' ? ';border-color:#ccc' : ''}" onclick="selectDetailColor(this)"></button>`).join('')}</div><span class="pd-color-name">${colors[0].name}</span></div>` : '';
    const modal = document.getElementById('productDetailModal');
    modal.innerHTML = `<div class="modal product-detail-modal"><button class="modal-close pd-close" onclick="closeProductDetail()"><i class="fas fa-times"></i></button><div class="pd-grid"><div class="pd-image"><img src="${p.image}" alt="${p.name}">${p.badge ? `<span class="pd-badge">${p.badge}</span>` : ''}</div><div class="pd-info"><span class="pd-category">${p.category.replace(/-/g,' ')}</span><h2 class="pd-title">${p.name}</h2><div class="pd-rating">${'<i class="fas fa-star"></i>'.repeat(Math.floor(p.rating))}<span>(${p.reviews} reviews)</span></div><div class="pd-price"><span class="pd-current-price">₹${p.price}</span><span class="pd-old-price">₹${p.oldPrice}</span><span class="pd-discount">${discount}% OFF</span></div><p class="pd-description">${p.description}</p>${colorSection}<div class="pd-size-section"><h4>Select Size</h4><div class="pd-sizes" id="pdSizes-${p.id}">${p.sizes.map((s,i) => `<button class="pd-size-btn ${i===0?'active':''}" data-size="${s}" onclick="selectSize(this,${p.id})">${s}</button>`).join('')}</div></div><div class="pd-qty-section"><h4>Quantity</h4><div class="pd-qty"><button onclick="changePdQty(-1)"><i class="fas fa-minus"></i></button><span id="pdQty">1</span><button onclick="changePdQty(1)"><i class="fas fa-plus"></i></button></div></div><div class="pd-actions"><button class="btn btn-primary btn-lg" onclick="addToCartFromDetail(${p.id})"><i class="fas fa-cart-plus"></i> Add to Cart</button><button class="btn btn-outline-dark btn-lg" onclick="buyNowFromDetail(${p.id})"><i class="fas fa-bolt"></i> Buy Now</button></div><div class="pd-features"><div class="pd-feature"><i class="fas fa-truck"></i> Free delivery above ₹2000</div><div class="pd-feature"><i class="fas fa-undo"></i> 7-day returns</div><div class="pd-feature"><i class="fas fa-shield-alt"></i> Quality guaranteed</div></div></div></div></div>`;
    modal.classList.add('active'); pdQuantity = 1;
}
function changePdQty(d) { pdQuantity = Math.max(1, pdQuantity + d); const el = document.getElementById('pdQty'); if (el) el.textContent = pdQuantity; }
function selectSize(btn, pid) { btn.parentElement.querySelectorAll('.pd-size-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
function getSelectedSize(pid) { const c = document.getElementById(`pdSizes-${pid}`); if (!c) return null; const a = c.querySelector('.pd-size-btn.active'); return a ? a.dataset.size : null; }
function getSelectedColor(pid) { const c = document.querySelector('.pd-color-swatch.active'); return c ? c.dataset.colorName : null; }
function addToCartFromDetail(id) {
    requireAuth(() => {
        const size = getSelectedSize(id); const color = getSelectedColor(id); const p = productsData.find(x => x.id === id);
        if (!p) return;
        if (size && window.outOfStockMap?.[p.name]?.has(size)) { showToast(`Size ${size} is out of stock!`); return; }
        if (p.outOfStock) { showToast('This product is currently out of stock!'); return; }
        const existing = cart.find(i => i.id === id && i.selectedSize === size && i.selectedColor === color);
        if (existing) existing.qty += pdQuantity; else cart.push({ ...p, qty: pdQuantity, selectedSize: size, selectedColor: color || getProductColors(p)?.[0]?.name || null });
        saveCart(); updateCartUI(); showToast(`${p.name} (${size}${color ? ', ' + color : ''}) added!`); closeProductDetail(); pdQuantity = 1;
    });
}
function buyNowFromDetail(id) { requireAuth(() => { addToCartFromDetail(id); openCheckout(); }); }
function closeProductDetail() { document.getElementById('productDetailModal').classList.remove('active'); pdQuantity = 1; }

// ===== Auth System =====
let currentUser = JSON.parse(localStorage.getItem('ssa_user') || 'null');
function updateAuthUI() {
    const btn = document.getElementById('authBtn'); if (!btn) return;
    if (currentUser) { btn.innerHTML = '<i class="fas fa-user-circle"></i>'; btn.title = currentUser.name; btn.onclick = openAccountPanel; }
    else { btn.innerHTML = '<i class="fas fa-user"></i>'; btn.title = 'Login'; btn.onclick = openLoginModal; }
}
function openLoginModal() {
    const modal = document.getElementById('authModal');
    modal.innerHTML = `
<div class="modal auth-modal auth-split">
  <div class="auth-panel-left">
    <div class="auth-logo">
      <img src="images/Images/SSA Logo.png" alt="SSA Logo" width="44">
      <div class="auth-logo-text">
        <span class="auth-logo-name">Siva Suresh</span>
        <span class="auth-logo-sub">Agency</span>
      </div>
    </div>
    <p class="auth-left-tagline">Premium hospital linen &amp; medical uniforms trusted by 500+ healthcare institutions.</p>
    <div class="auth-left-trust">
      <div class="auth-trust-row"><i class="fas fa-hospital"></i> 500+ Hospitals Trust Us</div>
      <div class="auth-trust-row"><i class="fas fa-award"></i> 15+ Years Experience</div>
      <div class="auth-trust-row"><i class="fas fa-truck"></i> Free Delivery on Bulk</div>
      <div class="auth-trust-row"><i class="fas fa-palette"></i> Custom Colors &amp; Sizes</div>
    </div>
    <div class="auth-left-img">
      <img src="images/Images/Male Full Sleeve.jpg" alt="Products">
    </div>
  </div>
  <div class="auth-panel-right">
    <button class="modal-close" onclick="closeAuthModal()" style="position:absolute;top:12px;right:12px;"><i class="fas fa-times"></i></button>
    <div class="auth-tabs" style="margin-bottom:18px;">
      <button class="auth-tab active" onclick="switchAuthTab('login')">Sign In</button>
      <button class="auth-tab" onclick="switchAuthTab('register')">Create Account</button>
    </div>
    <div class="auth-form" id="loginForm">
      <h3 style="margin-bottom:4px;">Welcome Back</h3>
      <p class="auth-subtitle" style="margin-bottom:16px;">Sign in to manage orders &amp; account</p>
      <div class="form-group">
        <label>Email or Phone</label>
        <input type="text" id="loginEmail" placeholder="Enter your email or phone">
        <span class="field-error" id="loginEmailError" style="display:none;"></span>
      </div>
      <div class="form-group">
        <label>Password</label>
        <div style="position:relative;">
          <input type="password" id="loginPassword" placeholder="Enter your password" style="padding-right:38px;">
          <button type="button" onclick="togglePwdVis('loginPassword',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.85rem;"><i class="fas fa-eye"></i></button>
        </div>
        <span class="field-error" id="loginPasswordError" style="display:none;"></span>
      </div>
      <button class="btn btn-gradient btn-full" style="margin-top:4px;" onclick="handleLogin()"><i class="fas fa-sign-in-alt"></i> Sign In</button>
      <p class="auth-switch">New here? <a onclick="switchAuthTab('register')">Create account</a></p>
    </div>
    <div class="auth-form" id="registerForm" style="display:none;">
      <h3 style="margin-bottom:4px;">Create Account</h3>
      <p class="auth-subtitle" style="margin-bottom:16px;">Register to start ordering online</p>
      <div class="form-row">
        <div class="form-group"><label>First Name *</label><input type="text" id="regFirstName" placeholder="First name"><span class="field-error" id="regFirstNameError" style="display:none;"></span></div>
        <div class="form-group"><label>Last Name *</label><input type="text" id="regLastName" placeholder="Last name"><span class="field-error" id="regLastNameError" style="display:none;"></span></div>
      </div>
      <div class="form-group"><label>Email *</label><input type="email" id="regEmail" placeholder="Email address"><span class="field-error" id="regEmailError" style="display:none;"></span></div>
      <div class="form-group"><label>Phone *</label><input type="tel" id="regPhone" placeholder="Mobile number"><span class="field-error" id="regPhoneError" style="display:none;"></span></div>
      <div class="form-row">
        <div class="form-group"><label>Password *</label><input type="password" id="regPassword" placeholder="Min 6 characters"><span class="field-error" id="regPasswordError" style="display:none;"></span></div>
        <div class="form-group"><label>Confirm *</label><input type="password" id="regConfirmPassword" placeholder="Confirm password"><span class="field-error" id="regConfirmPasswordError" style="display:none;"></span></div>
      </div>
      <button class="btn btn-gradient btn-full" style="margin-top:4px;" onclick="handleRegister()"><i class="fas fa-user-plus"></i> Create Account</button>
      <p class="auth-switch">Already have an account? <a onclick="switchAuthTab('login')">Sign in</a></p>
    </div>
  </div>
</div>`;
    modal.classList.add('active');
    setTimeout(() => { const el = document.getElementById('loginEmail'); if (el) el.focus(); }, 100);
}
function togglePwdVis(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') { input.type = 'text'; btn.innerHTML = '<i class="fas fa-eye-slash"></i>'; }
    else { input.type = 'password'; btn.innerHTML = '<i class="fas fa-eye"></i>'; }
}
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    if (tab === 'login') { document.getElementById('loginForm').style.display = 'block'; document.getElementById('registerForm').style.display = 'none'; document.querySelectorAll('.auth-tab')[0].classList.add('active'); }
    else { document.getElementById('loginForm').style.display = 'none'; document.getElementById('registerForm').style.display = 'block'; document.querySelectorAll('.auth-tab')[1].classList.add('active'); }
}
function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    document.getElementById('loginEmailError').style.display = 'none';
    document.getElementById('loginPasswordError').style.display = 'none';
    if (!email) { document.getElementById('loginEmailError').textContent = 'Required'; document.getElementById('loginEmailError').style.display = 'block'; return; }
    if (!password) { document.getElementById('loginPasswordError').textContent = 'Required'; document.getElementById('loginPasswordError').style.display = 'block'; return; }
    const users = JSON.parse(localStorage.getItem('ssa_users') || '[]');
    const user = users.find(u => (u.email === email || u.phone === email) && u.password === password);
    if (user) { currentUser = { name: user.firstName + ' ' + user.lastName, email: user.email, phone: user.phone }; localStorage.setItem('ssa_user', JSON.stringify(currentUser)); closeAuthModal(); updateAuthUI(); showToast(`Welcome back, ${user.firstName}!`); if (typeof syncPendingOrders === 'function') syncPendingOrders(currentUser.email, currentUser.name, currentUser.phone); }
    else { document.getElementById('loginPasswordError').textContent = 'Invalid credentials'; document.getElementById('loginPasswordError').style.display = 'block'; }
}
function handleRegister() {
    const fields = ['regFirstName','regLastName','regEmail','regPhone','regPassword','regConfirmPassword'];
    let valid = true;
    fields.forEach(id => { document.getElementById(id+'Error').style.display = 'none'; if (!document.getElementById(id).value.trim()) { document.getElementById(id+'Error').textContent = 'Required'; document.getElementById(id+'Error').style.display = 'block'; valid = false; } });
    if (!valid) return;
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { document.getElementById('regEmailError').textContent = 'Invalid email'; document.getElementById('regEmailError').style.display = 'block'; return; }
    if (password.length < 6) { document.getElementById('regPasswordError').textContent = 'Min 6 chars'; document.getElementById('regPasswordError').style.display = 'block'; return; }
    if (password !== confirm) { document.getElementById('regConfirmPasswordError').textContent = 'Mismatch'; document.getElementById('regConfirmPasswordError').style.display = 'block'; return; }
    const users = JSON.parse(localStorage.getItem('ssa_users') || '[]');
    if (users.find(u => u.email === email)) { document.getElementById('regEmailError').textContent = 'Already exists'; document.getElementById('regEmailError').style.display = 'block'; return; }
    users.push({ firstName, lastName, email, phone, password, createdAt: new Date().toISOString() });
    localStorage.setItem('ssa_users', JSON.stringify(users));
    currentUser = { name: firstName + ' ' + lastName, email, phone };
    localStorage.setItem('ssa_user', JSON.stringify(currentUser));
    // Save customer to Firebase (async but we continue immediately)
    console.log('[register] Saving customer to Firestore...');
    if (typeof saveCustomerToFirebase === 'function') {
        saveCustomerToFirebase({ firstName, lastName, email, phone })
            .catch(err => console.error('[register] Async save failed:', err));
    }
    closeAuthModal(); updateAuthUI(); showToast(`Welcome, ${firstName}!`);
}
function closeAuthModal() { document.getElementById('authModal').classList.remove('active'); }
async function openAccountPanel() {
    const modal = document.getElementById('authModal');
    modal.innerHTML = `<div class="modal account-modal-v2"><button class="acct-close" onclick="closeAuthModal()"><i class="fas fa-times"></i></button><div style="text-align:center;padding:50px 30px;"><div class="loader"><div class="loader-ring"></div><span class="loader-text">SSA</span></div><p style="margin-top:14px;color:var(--text-muted);font-size:0.88rem;">Loading your account...</p></div></div>`;
    modal.classList.add('active');
    let firestoreOrders = [];
    if (window.fireDb) {
        try {
            if (window.auth) { try { await window.auth.signInAnonymously(); } catch(e) {} }
            const snap = await fireDb.collection('orders').where('customerEmail', '==', currentUser.email).get();
            firestoreOrders = snap.docs.map(d => ({ id: d.data().orderId, date: d.data().createdAt?.seconds ? new Date(d.data().createdAt.seconds*1000).toISOString() : new Date().toISOString(), items: d.data().items||[], total: d.data().total||0, payment: d.data().payment||'COD', status: d.data().status||'Processing' }));
        } catch(e) { console.warn('[account]', e.message); }
    }
    const localOrders = JSON.parse(localStorage.getItem('ssa_orders_' + currentUser.email) || '[]');
    const orders = firestoreOrders.length > 0 ? firestoreOrders : localOrders;
    const avatar = localStorage.getItem('ssa_avatar_' + currentUser.email) || '';
    const avatarHtml = avatar ? `<img src="${avatar}" alt="Avatar" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.15);">` : `<i class="fas fa-user-circle" style="font-size:72px;color:#0066cc;"></i>`;
    modal.innerHTML = `<div class="modal account-modal-v2">
        <div class="acct-top">
            <div class="acct-top-inner">
                <div class="acct-avatar-wrap" onclick="document.getElementById('avatarUpload').click()">
                    ${avatar ? `<img src="${avatar}" alt="Avatar" class="acct-avatar-img">` : `<div class="acct-avatar-placeholder"><i class="fas fa-user"></i></div>`}
                    <span class="acct-avatar-edit"><i class="fas fa-camera"></i></span>
                    <input type="file" id="avatarUpload" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)">
                </div>
                <div class="acct-user-info">
                    <h4>${currentUser.name}</h4>
                    <p>${currentUser.email}</p>
                    ${currentUser.phone ? `<span class="acct-phone"><i class="fas fa-phone-alt"></i> ${currentUser.phone}</span>` : ''}
                </div>
            </div>
            <button class="acct-close" onclick="closeAuthModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="acct-tabs-bar">
            <button class="acct-tab-btn active" onclick="showAccountTab('orders')"><i class="fas fa-box-open"></i> Orders</button>
            <button class="acct-tab-btn" onclick="showAccountTab('profile')"><i class="fas fa-user-edit"></i> Profile</button>
            <button class="acct-tab-btn" onclick="showAccountTab('addresses')"><i class="fas fa-map-marker-alt"></i> Address</button>
            <button class="acct-tab-btn" onclick="showAccountTab('security')"><i class="fas fa-lock"></i> Password</button>
        </div>
        <div class="acct-body">
            <div class="acct-section active" id="accountOrders">
                ${orders.length === 0 ? '<div class="empty-orders"><i class="fas fa-box-open"></i><p>No orders yet. Start shopping!</p><a href="categories.html" class="btn btn-gradient btn-sm" onclick="closeAuthModal()">Browse Products</a></div>' :
                    orders.map(o => `<div class="acct-order-card">
                        <div class="acct-order-head">
                            <div><span class="acct-order-id">#${o.id}</span><span class="acct-order-date">${new Date(o.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span></div>
                            <span class="acct-order-status">${o.status}</span>
                        </div>
                        <div class="acct-order-items">${o.items.map(i => `<div class="acct-order-row"><span>${i.name} &times;${i.qty}</span><span>&#8377;${i.price*i.qty}</span></div>`).join('')}</div>
                        <div class="acct-order-foot"><span class="acct-order-total">Total: &#8377;${o.total.toLocaleString('en-IN')}</span><span class="acct-order-pay"><i class="fas fa-credit-card"></i> ${o.payment}</span></div>
                    </div>`).join('')}
            </div>
            <div class="acct-section" id="accountProfile" style="display:none;">
                <div class="profile-edit-form">
                    <div class="form-group"><span class="acct-field-label">Full Name</span><input type="text" id="editName" value="${currentUser.name}" placeholder="Your full name"></div>
                    <div class="form-group"><span class="acct-field-label">Mobile Phone</span><input type="tel" id="editPhone" value="${currentUser.phone||''}" placeholder="Phone number"></div>
                    <div class="form-group"><span class="acct-field-label">Email <small style="color:#94a3b8;font-size:0.7rem;">(cannot change)</small></span><input type="email" value="${currentUser.email}" readonly style="background:#f1f5f9;color:#64748b;cursor:not-allowed;"></div>
                    <button class="btn btn-gradient btn-full" onclick="saveProfileChanges()"><i class="fas fa-save"></i> Save Changes</button>
                </div>
            </div>
            <div class="acct-section" id="accountAddresses" style="display:none;">
                <div id="addressList"></div>
                <button class="btn btn-outline-dark btn-full" style="margin-top:8px" onclick="showAddAddressForm()"><i class="fas fa-plus"></i> Add New Address</button>
                <div id="addAddressForm" style="display:none;margin-top:12px;">
                    <div class="form-group"><label>Street / Door No.</label><input type="text" id="addrStreet" placeholder="Street address"></div>
                    <div class="form-row"><div class="form-group"><label>City</label><input type="text" id="addrCity" placeholder="City"></div><div class="form-group"><label>PIN Code</label><input type="text" id="addrPin" placeholder="PIN"></div></div>
                    <div class="form-group"><label>State</label><input type="text" id="addrState" placeholder="State" value="Tamil Nadu"></div>
                    <div class="form-row"><button class="btn btn-gradient" onclick="saveNewAddress()"><i class="fas fa-save"></i> Save</button><button class="btn btn-outline-dark" onclick="document.getElementById('addAddressForm').style.display='none'">Cancel</button></div>
                </div>
            </div>
            <div class="acct-section" id="accountSecurity" style="display:none;">
                <div class="profile-edit-form">
                    <div class="form-group"><label>Current Password</label><input type="password" id="pwdCurrent" placeholder="Current password"></div>
                    <div class="form-group"><label>New Password</label><input type="password" id="pwdNew" placeholder="New password (min 6 chars)"></div>
                    <div class="form-group"><label>Confirm New Password</label><input type="password" id="pwdConfirm" placeholder="Confirm new password"></div>
                    <p id="pwdMsg" style="display:none;font-size:0.82rem;margin-bottom:8px;"></p>
                    <button class="btn btn-gradient btn-full" onclick="changePassword()"><i class="fas fa-key"></i> Update Password</button>
                </div>
            </div>
        </div>
        <div class="acct-footer">
            <a href="wishlist.html" class="btn btn-outline-dark" style="flex:1;justify-content:center;" onclick="closeAuthModal()"><i class="fas fa-heart"></i> Wishlist</a>
            <button class="btn btn-outline-dark" style="flex:1;justify-content:center;color:var(--red);" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
        </div>
    </div>`;
    renderAddressList();
}
function showAccountTab(tab) {
    document.querySelectorAll('.acct-tab-btn, .account-tab').forEach(t => t.classList.remove('active'));
    ['accountOrders','accountProfile','accountAddresses','accountSecurity'].forEach(id => { const el = document.getElementById(id); if (el) { el.style.display = 'none'; el.classList.remove('active'); } });
    const map = { orders:'accountOrders', profile:'accountProfile', addresses:'accountAddresses', security:'accountSecurity' };
    const el = document.getElementById(map[tab]); if (el) el.style.display = 'block';
    const tabBtns = document.querySelectorAll('.acct-tab-btn, .account-tab');
    const tabIdx = { orders:0, profile:1, addresses:2, security:3 };
    if (tabBtns[tabIdx[tab]]) tabBtns[tabIdx[tab]].classList.add('active');
}
function handleAvatarUpload(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        localStorage.setItem('ssa_avatar_' + currentUser.email, e.target.result);
        const avatarDiv = document.querySelector('.account-avatar');
        if (avatarDiv) { avatarDiv.querySelector('i,img')?.remove(); const img = document.createElement('img'); img.src = e.target.result; img.style.cssText = 'width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.15);'; avatarDiv.insertBefore(img, avatarDiv.firstChild); }
        showToast('Profile picture updated!');
    };
    reader.readAsDataURL(file);
}
function saveProfileChanges() {
    const name  = document.getElementById('editName')?.value.trim();
    const phone = document.getElementById('editPhone')?.value.trim();
    if (!name) { showToast('Name cannot be empty'); return; }
    currentUser.name  = name;
    currentUser.phone = phone;
    localStorage.setItem('ssa_user', JSON.stringify(currentUser));
    // Update in ssa_users list
    const users = JSON.parse(localStorage.getItem('ssa_users') || '[]');
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx > -1) {
        const parts = name.split(' ');
        users[idx].firstName = parts[0] || users[idx].firstName;
        users[idx].lastName  = parts.slice(1).join(' ') || users[idx].lastName;
        users[idx].phone     = phone;
        localStorage.setItem('ssa_users', JSON.stringify(users));
    }
    updateAuthUI();
    showToast('Profile saved!');
}
function renderAddressList() {
    const el = document.getElementById('addressList'); if (!el) return;
    const addrs = JSON.parse(localStorage.getItem('ssa_addresses_' + currentUser.email) || '[]');
    if (addrs.length === 0) { el.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:10px 0">No saved addresses yet</p>'; return; }
    el.innerHTML = addrs.map((a, i) => `<div class="addr-card" style="border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin-bottom:8px;position:relative;">
        ${i===0?'<span style="font-size:0.7rem;font-weight:700;color:#0066cc;margin-bottom:4px;display:block">DEFAULT</span>':''}
        <p style="margin:0;font-size:0.88rem;line-height:1.6">${a.street}, ${a.city} – ${a.pincode}, ${a.state||'Tamil Nadu'}</p>
        <button onclick="deleteAddress(${i})" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:#ef4444;font-size:0.78rem;padding:2px 6px;"><i class="fas fa-trash"></i></button>
        ${i>0?`<button onclick="setDefaultAddress(${i})" style="font-size:0.72rem;color:#0066cc;background:none;border:none;cursor:pointer;margin-top:4px;padding:0">Set as default</button>`:''}
    </div>`).join('');
}
function showAddAddressForm() { document.getElementById('addAddressForm').style.display = 'block'; }
function saveNewAddress() {
    const street = document.getElementById('addrStreet')?.value.trim();
    const city   = document.getElementById('addrCity')?.value.trim();
    const pin    = document.getElementById('addrPin')?.value.trim();
    const state  = document.getElementById('addrState')?.value.trim();
    if (!street || !city || !pin) { showToast('Please fill street, city and PIN'); return; }
    const addrs = JSON.parse(localStorage.getItem('ssa_addresses_' + currentUser.email) || '[]');
    addrs.push({ street, city, pincode: pin, state: state || 'Tamil Nadu' });
    localStorage.setItem('ssa_addresses_' + currentUser.email, JSON.stringify(addrs));
    document.getElementById('addAddressForm').style.display = 'none';
    renderAddressList();
    showToast('Address saved!');
}
function deleteAddress(i) {
    const addrs = JSON.parse(localStorage.getItem('ssa_addresses_' + currentUser.email) || '[]');
    addrs.splice(i, 1);
    localStorage.setItem('ssa_addresses_' + currentUser.email, JSON.stringify(addrs));
    renderAddressList();
}
function setDefaultAddress(i) {
    const addrs = JSON.parse(localStorage.getItem('ssa_addresses_' + currentUser.email) || '[]');
    const [a] = addrs.splice(i, 1); addrs.unshift(a);
    localStorage.setItem('ssa_addresses_' + currentUser.email, JSON.stringify(addrs));
    renderAddressList();
}
function changePassword() {
    const curr    = document.getElementById('pwdCurrent')?.value;
    const newPwd  = document.getElementById('pwdNew')?.value;
    const confirm = document.getElementById('pwdConfirm')?.value;
    const msgEl   = document.getElementById('pwdMsg');
    const show = (msg, ok) => { msgEl.textContent = msg; msgEl.style.color = ok ? '#10b981' : '#ef4444'; msgEl.style.display = 'block'; };
    if (!curr || !newPwd || !confirm) { show('Please fill all fields'); return; }
    const users = JSON.parse(localStorage.getItem('ssa_users') || '[]');
    const idx = users.findIndex(u => u.email === currentUser.email);
    if (idx === -1 || users[idx].password !== curr) { show('Current password is incorrect'); return; }
    if (newPwd.length < 6) { show('New password must be at least 6 characters'); return; }
    if (newPwd !== confirm) { show('Passwords do not match'); return; }
    users[idx].password = newPwd;
    localStorage.setItem('ssa_users', JSON.stringify(users));
    show('Password updated successfully!', true);
    document.getElementById('pwdCurrent').value = '';
    document.getElementById('pwdNew').value = '';
    document.getElementById('pwdConfirm').value = '';
}
function handleLogout() { currentUser = null; localStorage.removeItem('ssa_user'); closeAuthModal(); updateAuthUI(); showToast('Logged out'); }

// ===== Place Order =====
function placeOrder() {
    if (!currentUser) { document.getElementById('checkoutModal').classList.remove('active'); openLoginModal(); showToast('Please login first'); return; }
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const pm = document.querySelector('[name="payment"]:checked');
    const order = { id: 'SSA' + Date.now().toString(36).toUpperCase(), date: new Date().toISOString(), items: cart.map(i => ({ name: i.name, selectedSize: i.selectedSize, selectedColor: i.selectedColor || null, qty: i.qty, price: i.price })), total: total > 2000 ? total : total + 150, payment: pm ? pm.value.toUpperCase() : 'COD', status: 'Processing' };
    const key = 'ssa_orders_' + currentUser.email;
    const orders = JSON.parse(localStorage.getItem(key) || '[]');
    orders.unshift(order); localStorage.setItem(key, JSON.stringify(orders));
    // Save to Firebase
    const shipping = {
        firstname: document.querySelector('[name="firstname"]')?.value || '',
        lastname: document.querySelector('[name="lastname"]')?.value || '',
        email: document.querySelector('[name="cemail"]')?.value || currentUser.email,
        phone: document.querySelector('[name="cphone"]')?.value || '',
        address: document.querySelector('[name="address"]')?.value || '',
        city: document.querySelector('[name="city"]')?.value || '',
        pincode: document.querySelector('[name="pincode"]')?.value || ''
    };
    if (typeof saveOrderToFirebase === 'function') saveOrderToFirebase(order, shipping);
    document.getElementById('checkoutModal').classList.remove('active');
    document.getElementById('orderId').textContent = order.id;
    document.getElementById('successModal').classList.add('active');
    cart = []; saveCart(); updateCartUI();
}

// ===== Hero Slider =====
function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    const prev = document.querySelector('.hero-prev');
    const next = document.querySelector('.hero-next');
    if (!slides.length) return;
    let current = 0, interval;
    function show(i) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        current = i; if (current >= slides.length) current = 0; if (current < 0) current = slides.length - 1;
        slides[current].classList.add('active'); dots[current].classList.add('active');
    }
    function start() { interval = setInterval(() => show(current + 1), 5000); }
    function reset() { clearInterval(interval); start(); }
    if (prev) prev.addEventListener('click', () => { show(current - 1); reset(); });
    if (next) next.addEventListener('click', () => { show(current + 1); reset(); });
    dots.forEach((d, i) => d.addEventListener('click', () => { show(i); reset(); }));
    start();
}

// ===== Stats Counter =====
function initStatsCounter() {
    const stats = document.querySelector('.stats');
    if (!stats) return;
    let counted = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !counted) {
                document.querySelectorAll('.stat-number').forEach(stat => {
                    const target = parseInt(stat.dataset.target);
                    const step = target / 100;
                    let cur = 0;
                    const counter = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(counter); } stat.textContent = Math.floor(cur).toLocaleString() + '+'; }, 20);
                });
                counted = true;
            }
        });
    }, { threshold: 0.3 });
    observer.observe(stats);
}

// ===== Chatbot =====
function initChatbot() {
    const toggle = document.getElementById('chatbotToggle');
    const win = document.getElementById('chatbotWindow');
    const minimize = document.getElementById('chatbotMinimize');
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    if (!toggle) return;
    toggle.addEventListener('click', () => { win.classList.toggle('open'); document.querySelector('.chatbot-badge').style.display = 'none'; });
    minimize.addEventListener('click', () => win.classList.remove('open'));
    document.addEventListener('click', (e) => { if (e.target.classList.contains('quick-reply')) sendChatMessage(e.target.dataset.msg); });
    send.addEventListener('click', () => { const m = input.value.trim(); if (m) sendChatMessage(m); });
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const m = input.value.trim(); if (m) sendChatMessage(m); } });
}
function sendChatMessage(msg) {
    const messages = document.getElementById('chatbotMessages');
    const input = document.getElementById('chatInput');
    appendMsg('user', msg); input.value = '';
    const typing = document.createElement('div'); typing.className = 'chat-message bot';
    typing.innerHTML = '<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    messages.appendChild(typing); messages.scrollTop = messages.scrollHeight;
    setTimeout(() => { typing.remove(); appendMsg('bot', getAIResponse(msg)); }, 1000);
}
function appendMsg(type, text) {
    const messages = document.getElementById('chatbotMessages');
    const div = document.createElement('div'); div.className = `chat-message ${type}`;
    const icon = type === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
    div.innerHTML = `<div class="message-avatar">${icon}</div><div class="message-content"><p>${text}</p></div>`;
    messages.appendChild(div); messages.scrollTop = messages.scrollHeight;
}
function getAIResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('product') || m.includes('offer') || m.includes('sell')) return 'We offer: 🥼 Doctor Uniforms (Male & Female, Full & Half Sleeve), 👔 Staff Uniforms (Multiple Styles), 🛏️ Bedsheets, 🏥 Hospital Linen, 🏨 Hotel Linen. <a href="categories.html">Browse All →</a>';
    if (m.includes('price') || m.includes('cost')) return 'Price ranges: Doctor Uniforms ₹750-₹900, Staff Uniforms ₹500-₹590, Bedsheets ₹150-₹480. Bulk discounts available!';
    if (m.includes('order') || m.includes('buy') || m.includes('how to')) return 'Easy! 1️⃣ Browse <a href="categories.html">Categories</a> 2️⃣ Add to Cart 3️⃣ Checkout 4️⃣ Choose payment (COD/UPI/Bank) 5️⃣ Done!';
    if (m.includes('deliver') || m.includes('ship')) return '📦 We deliver all-India! Free shipping above ₹2000. Standard: 3-5 days. Express available.';
    if (m.includes('contact') || m.includes('phone') || m.includes('call')) return '📞 Siva: +91 93666 40060 | Suresh: +91 93666 40050<br>✉️ sivasureshagency@gmail.com<br>📍 Erode, Tamil Nadu';
    if (m.includes('bulk') || m.includes('wholesale')) return '📦 Bulk orders: Special pricing, dedicated account manager, recurring orders. Call +91 93666 40060 or <a href="contact.html">contact us</a>';
    if (m.includes('hi') || m.includes('hello')) return 'Hello! 😊 How can I help? Ask about products, pricing, delivery, or orders!';
    if (m.includes('thank')) return "You're welcome! 😊 Happy shopping!";
    return 'I can help with products, pricing, ordering, delivery & contact info. Try "What products do you offer?" or call +91 93666 40060.';
}

// ===== Color Selection (order-only, no image change) =====
function selectCardColor(btn) {
    const swatches = btn.parentElement;
    swatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const label = swatches.querySelector('.color-name');
    if (label) label.textContent = btn.dataset.colorName;
}

function selectDetailColor(btn) {
    const container = btn.parentElement;
    container.querySelectorAll('.pd-color-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const label = container.parentElement.querySelector('.pd-color-name');
    if (label) label.textContent = btn.dataset.colorName;
}

// ===== Utilities =====
function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:100px;right:20px;background:linear-gradient(135deg,#0e4a86,#6c63ff);color:#fff;padding:12px 24px;border-radius:8px;font-size:0.88rem;font-weight:500;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:slideIn 0.3s ease;';
    t.innerHTML = `<i class="fas fa-check-circle" style="margin-right:8px;"></i>${msg}`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ===== Scroll Progress Bar =====
function initScrollProgress() {
    let bar = document.querySelector('.scroll-progress');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'scroll-progress';
        document.body.prepend(bar);
    }
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) bar.style.width = (scrollTop / docHeight * 100) + '%';
    });
}

// ===== Hero Particles & Shapes =====
function initHeroParticles() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    // Floating particles
    let container = hero.querySelector('.hero-particles');
    if (!container) {
        container = document.createElement('div');
        container.className = 'hero-particles';
        hero.prepend(container);
    }
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.width = p.style.height = (Math.random() * 4 + 2) + 'px';
        p.style.animationDuration = (Math.random() * 10 + 8) + 's';
        p.style.animationDelay = (Math.random() * 8) + 's';
        container.appendChild(p);
    }
    // Floating gradient shapes
    for (let i = 1; i <= 3; i++) {
        const shape = document.createElement('div');
        shape.className = 'hero-shape hero-shape-' + i;
        hero.appendChild(shape);
    }
}

function revealElements() {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger').forEach(el => {
        const top = el.getBoundingClientRect().top;
        if (top < window.innerHeight - 80) el.classList.add('active');
    });
}

// ===== Wishlist Page =====
function initWishlistPage() {
    renderWishlist();
}
function renderWishlist() {
    const grid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('wishlistEmpty');
    if (!grid) return;
    const items = productsData.filter(p => wishlist.includes(p.id));
    if (items.length === 0) {
        grid.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    if (emptyState) emptyState.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = items.map(p => `<div class="wishlist-card reveal active" data-id="${p.id}">
        <div class="wishlist-card-image" onclick="openProductDetail(${p.id})">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            ${p.badge ? `<span class="shop-card-badge">${p.badge}</span>` : ''}
        </div>
        <div class="wishlist-card-body">
            <span class="shop-card-category">${p.category.replace(/-/g, ' ')}</span>
            <h4>${p.name}</h4>
            <div class="shop-card-rating">${'<i class="fas fa-star"></i>'.repeat(Math.floor(p.rating))}${p.rating % 1 ? '<i class="fas fa-star-half-alt"></i>' : ''}<span>(${p.reviews})</span></div>
            <div class="shop-card-price"><span class="price">\u20b9${p.price}</span><span class="old-price">\u20b9${p.oldPrice}</span></div>
            <div class="wishlist-card-actions">
                <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})"><i class="fas fa-cart-plus"></i> Add to Cart</button>
                <button class="btn btn-outline-dark btn-sm" onclick="removeFromWishlist(${p.id})"><i class="fas fa-trash"></i> Remove</button>
            </div>
        </div>
    </div>`).join('');
}
function removeFromWishlist(id) {
    toggleWishlist(id);
    renderWishlist();
    showToast('Removed from wishlist');
}
function clearWishlist() {
    wishlist = [];
    localStorage.setItem('ssa_wishlist', JSON.stringify(wishlist));
    updateWishlistCount();
    renderWishlist();
    showToast('Wishlist cleared');
}

// ===== Global Exports =====
window.addToCart = addToCart;
window.buyNow = buyNow;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;
window.nextStep = nextStep;
window.closeCart = closeCart;
window.closeSuccessModal = closeSuccessModal;
window.openProductDetail = openProductDetail;
window.closeProductDetail = closeProductDetail;
window.selectSize = selectSize;
window.changePdQty = changePdQty;
window.addToCartFromDetail = addToCartFromDetail;
window.buyNowFromDetail = buyNowFromDetail;
window.openLoginModal = openLoginModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.closeAuthModal = closeAuthModal;
window.openAccountPanel = openAccountPanel;
window.showAccountTab = showAccountTab;
window.handleLogout = handleLogout;
window.placeOrder = placeOrder;
window.buildProductCard = buildProductCard;
window.renderProducts = renderProducts;
window.productsData = productsData;
window.selectCardColor = selectCardColor;
window.selectDetailColor = selectDetailColor;
window.removeFromWishlist = removeFromWishlist;
window.clearWishlist = clearWishlist;
window.toggleWishlist = toggleWishlist;
window.isWishlisted = isWishlisted;
