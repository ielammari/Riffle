// fetch('https://dummyjson.com/products[?[limit=10]&[skip=10]&[select=title,price]]') .then(res => res.json())
// fetch('https://dummyjson.com/products/categories') .then(res => res.json())  category info.
// fetch('https://dummyjson.com/products/category/smartphones')  product by category
// fetch('https://dummyjson.com/products/search?q=phone')  search products

/**
 * products output example:
 *
 * {
 *   "products": [ ... ],
 *   "total": 194,
 *   "skip": 0,
 *   "limit": 30
 * }
 *
 * product example:
 *
 * {
 *   "id": 1,
 *   "title": "Essence Mascara Lash Princess",
 *   "description": "The Essence Mascara...",
 *   "price": 9.99,
 *   "discountPercentage": 7.17,
 *   "rating": 4.94,
 *   "stock": 5,
 *   "category": "beauty",
 *   "thumbnail": "https://cdn.dummyjson.com/..."
 * }
 *
 * category list example:
 *
 * [ {
 *     "slug": "beauty",
 *     "name": "Beauty",
 *     "url": "https://dummyjson.com/products/category/beauty"
 *   }, ... ]
 * */

const API_SITE = 'https://dummyjson.com';

async function apiFetch(target) {
    const request = await fetch (`${API_SITE}${target}`);
    if (!request.ok) {
        throw new Error(`API Error ${request.status} on ${target}`);
    }
    return request.json();
}

async function fetchAllProducts(page = 1) {
    const skip = (page - 1) * PER_PAGE;
    return apiFetch(`/products?limit=${PER_PAGE}&skip=${skip}`);
}

async function fetchCategories() {
    return apiFetch(`/products/categories`);
}

async function fetchByCategory(category, page = 1) {
    const skip = (page - 1) * PER_PAGE;
    return apiFetch(`/products/category/${category}?limit=${PER_PAGE}&skip=${skip}`);
}

async function searchProducts(query, page = 1) {
    const skip = (page - 1) * PER_PAGE;
    return apiFetch(`/products/search?q=${encodeURIComponent(query)}&limit=${PER_PAGE}&skip=${skip}`);
}