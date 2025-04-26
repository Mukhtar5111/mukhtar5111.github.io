// print.js - Print-specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // Print single product
    document.getElementById('printSingleBtn')?.addEventListener('click', function() {
        if (!currentProduct) return;
        
        // Create a print stylesheet link if it doesn't exist
        if (!document.getElementById('print-styles')) {
            const link = document.createElement('link');
            link.id = 'print-styles';
            link.rel = 'stylesheet';
            link.href = 'css/print.css';
            link.media = 'print';
            document.head.appendChild(link);
        }
        
        // Generate product HTML
        const productHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Product Details - ${currentProduct.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .product-container { max-width: 800px; margin: 0 auto; padding: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .logo { max-width: 150px; }
                    .product-title { font-size: 24px; font-weight: bold; color: #2c3e50; }
                    .product-content { display: flex; gap: 2rem; }
                    .product-image { flex: 1; }
                    .product-image img { max-width: 100%; height: auto; }
                    .product-details { flex: 1; }
                    .price-details { margin: 1.5rem 0; padding: 1rem; background-color: #f5f5f5; border-radius: 6px; }
                    .price-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
                    .stock-info { font-size: 1.1rem; margin: 1rem 0; }
                    .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #777; }
                </style>
            </head>
            <body>
                <div class="product-container">
                    <div class="header">
                        <div>
                            <img src="images/logo.png" alt="Dinar Agricultural" class="logo">
                            <h1>Dinar Agricultural Machines & Spare Parts</h1>
                        </div>
                        <div class="product-title">PRODUCT DETAILS</div>
                    </div>
                    
                    <div class="product-content">
                        <div class="product-image">
                            <img src="${currentProduct.image}" alt="${currentProduct.name}">
                        </div>
                        <div class="product-details">
                            <h2>${currentProduct.name}</h2>
                            <p><strong>Code:</strong> ${currentProduct.code}</p>
                            
                            <div class="stock-info">
                                <p><strong>Stock In:</strong> ${currentProduct.stockIn}</p>
                                <p><strong>Stock Out:</strong> ${currentProduct.stockOut}</p>
                                <p><strong>Current Stock:</strong> ${currentProduct.stock}</p>
                            </div>
                            
                            <div class="price-details">
                                <h3>Pricing Information</h3>
                                <div class="price-row">
                                    <span>Foreign Price:</span>
                                    <span>${document.getElementById('modalForeignPrice').textContent}</span>
                                </div>
                                <div class="price-row">
                                    <span>Landing Cost:</span>
                                    <span>${document.getElementById('modalLandingCost').textContent}</span>
                                </div>
                                <div class="price-row">
                                    <span>Selling Price:</span>
                                    <span>${document.getElementById('modalSellingPrice').textContent}</span>
                                </div>
                            </div>
                            
                            <div class="product-description">
                                <h3>Description</h3>
                                <p>${currentProduct.description}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Generated on ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(productHTML);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        printWindow.onload = function() {
            printWindow.print();
        };
    });
});