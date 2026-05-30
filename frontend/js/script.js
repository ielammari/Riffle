const PER_PAGE = 24;

const state = {
    category: "all",
    page: 1,
    sort: "default",
    query: "",
    itemCount: 0,
    cart: []
}

async function setState(partial) {
    Object.assign(state, partial);
    await loadProducts();
}

let elements = {
    menuBtn: document.getElementById('menu-btn'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    cartCount: document.getElementById('cart-count'),

    categoryNav: document.getElementById('category-nav'),
    navOverlay: document.getElementById('nav-overlay'),
    closeBtn: document.getElementById('category-nav-close-btn'),
    categoryList: document.getElementById('category-list'),

    resultsCount: document.getElementById('results-count'),
    sortSelect: document.getElementById('sort-select'),
    loadingState: document.getElementById('loading-state'),
    productsGrid: document.getElementById('products-grid'),

    prevBtn: document.getElementById('previous-page'),
    nextBtn: document.getElementById('next-page'),
    pageNumber: document.getElementById('pagination-number')
};

function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.productsGrid.innerHTML = '';
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
}

function renderItemCount(total) {
    elements.resultsCount.innerHTML = `Results (<strong>${total}</strong>)`;
}

function buildProductCard(product) {
    const currentPrice = product.price;
    const originalPrice = product.discountPercentage > 0 ? ((currentPrice / (1 - product.discountPercentage / 100))*10).toFixed(2) : null;
    const productRating = product.rating;
    const discountBadge = product.discountPercentage > 0 ? `<span class="discount-badge">${product.discountPercentage}%</span>` : '';
    const crossedOffPrice = originalPrice ? `<span class="original-price">${originalPrice}</span>` : '';

    return `
        <article class="product-card" data-id="${product.id}">
            <div class="product-image-wrapper">
                <img class="product-image" src="${product.thumbnail}" alt="${product.title}" loading="lazy">
                ${discountBadge}
            </div>
            <div class="product-body">
                <p class="product-title"> ${product.title} </p>
                <div class="product-rating">
                    <i class="fa-solid fa-star"></i> <span class="product-rating-count">( ${productRating} )</span>
                </div>
                <div class="product-price-block">
                    <span class="current-price">${(product.price*10).toFixed(2)}Dh</span>
                    ${crossedOffPrice}
                </div>
                <button class="add-to-cart-btn" data-id="${product.id}"> Add to Cart </button>
            </div>
        </article>`
}

function renderProducts(products) {
    if (products.length === 0) {
        elements.productsGrid.innerHTML = '<p class="no-results">No products found. Try a different search or category</p>';
        return;
    }
    elements.productsGrid.innerHTML = products.map(buildProductCard).join('');
}

function renderCategories(categories) {

    const links = categories.map(cat => `
                    <li>
                      <a
                        href="#"
                        class="category-link"
                        data-category="${cat.slug}"
                      >
                        ${cat.name}
                      </a>
                    </li> `).join('');

    elements.categoryList.insertAdjacentHTML('beforeend', links);
    elements.categoryList.querySelectorAll('.category-link').forEach(link => {
        link.addEventListener('click', onCategoryClick);
    });
}

function renderPagination(total) {
    const totalPages = Math.ceil(total / PER_PAGE);

    elements.pageNumber.textContent = state.page;
    elements.prevBtn.disabled = state.page <= 1;
    elements.nextBtn.disabled = state.page >= totalPages;
}

function setActiveCategory(slug) {
    elements.categoryList.querySelectorAll('.category-link').forEach(link => {
        link.classList.toggle('active', link.dataset.category === slug);
    });
}

function updateCartBadge() {
    const count = state.cart.length;
    elements.cartCount.innerHTML = `${count}`;

    elements.cartCount.style.display = count > 0 ? 'block' : 'none';
}

function openSideBar() {
    elements.categoryNav.classList.add('is-open');
    elements.navOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeSideBar() {
    elements.categoryNav.classList.remove('is-open');
    elements.navOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
}

function toggleSideBar() {
    elements.categoryNav.classList.contains('is-open') ? closeSideBar() : openSideBar();
}

function onCategoryClick(e) {
    e.preventDefault();
    const slug = e.currentTarget.dataset.category;
    setState({ category: slug, page: 1, query: '' });
    setActiveCategory(slug);
    elements.searchInput.value = '';
    closeSideBar();
}

function sortProducts(products, sort) {
    const arr = [...products];

    switch (sort) {
        case 'price-asc':
            return arr.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return arr.sort((a, b) => b.price - a.price);
        case 'rating':
            return arr.sort((a, b) => b.rating - a.rating);
        case 'discount':
            return arr.sort((a, b) => b.discountPercentage - a.discountPercentage);
        default:
            return arr;
    }
}

function onSortChange() {
    setState({ sort: elements.sortSelect.value, page: 1 });
}

function onPrevPage() {
    if (state.page > 1) setState({ page: state.page - 1 });
}

function onNextPage() {
    const totalPages = Math.ceil(state.itemCount / PER_PAGE);
    if (state.page < totalPages) setState({ page: state.page + 1 });
}

function onAddToCart(productId) {
    const card = elements.productsGrid.querySelector(`[data-id="${productId}"]`);
    if (!card) return;

    state.cart.push({ id: productId });
    updateCartBadge();
}

function onSearchClick() {
    setState({ query: elements.searchInput.value.trim(), page: 1, category: 'all' });
    setActiveCategory('all');
}

async function loadProducts() {

    showLoading();
    try {
        let data;

        if (state.query) {
            data = await searchProducts(state.query, state.page);
        } else if (state.category !== 'all') {
            data = await fetchByCategory(state.category, state.page);
        } else {
            data = await fetchAllProducts(state.page);
        }

        const sorted = sortProducts(data.products, state.sort);

        state.itemCount = data.total;

        renderProducts(sorted);
        renderItemCount(data.total);
        renderPagination(data.total);

    } catch (error) {
        elements.productsGrid.innerHTML = `
      <p class="no-results">
        Something went wrong loading products. Please try again.
      </p>
        `;
        console.error('loadProducts failed:', error);

    } finally {
        hideLoading();
    }

}

async function init() {

    elements.menuBtn.addEventListener('click', toggleSideBar);
    elements.navOverlay.addEventListener('click', closeSideBar);
    elements.closeBtn.addEventListener('click', closeSideBar);
    elements.sortSelect.addEventListener('change', onSortChange);
    elements.prevBtn.addEventListener('click', onPrevPage);
    elements.nextBtn.addEventListener('click', onNextPage);
    elements.searchBtn.addEventListener('click', onSearchClick);

    elements.productsGrid.addEventListener('click', e => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn) onAddToCart(btn.dataset.id);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeSideBar();
    });

    elements.searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') onSearchClick();
    });

    try {
        const categories = await fetchCategories();
        renderCategories(categories);
    } catch (e) {
        console.error('Failed to load categories:', e);
    }

    await loadProducts();
}

document.addEventListener('DOMContentLoaded', init);