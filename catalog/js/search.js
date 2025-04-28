// Initialize search functionality
function initSearch() {
    // This would be more comprehensive in a real implementation
    console.log('Search initialized');
}

// Perform search across all products
function performSearch(query) {
    // This would use Lunr.js or similar in a real implementation
    console.log(`Searching for: ${query}`);
    return []; // Return search results
}

// Filter products based on multiple criteria
function filterProducts(products, filters) {
    return products.filter(product => {
        let matches = true;
        
        // Check each filter
        for (const key in filters) {
            if (filters[key]) {
                if (key === 'search') {
                    // Search across multiple fields
                    const searchFields = ['name', 'description', 'sku', 'material'];
                    const searchMatch = searchFields.some(field => 
                        product[field] && 
                        product[field].toString().toLowerCase().includes(filters[key].toLowerCase())
                    );
                    matches = matches && searchMatch;
                } else {
                    // Exact match for other filters
                    matches = matches && 
                        product[key] && 
                        product[key].toString().toLowerCase() === filters[key].toLowerCase();
                }
            }
        }
        
        return matches;
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSearch);