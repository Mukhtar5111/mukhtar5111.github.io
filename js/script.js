document.addEventListener('DOMContentLoaded', function() {
    // Inventory data will be loaded from JSON file
    let inventoryData = [];

    // Current state
    let currentPage = 1;
    let itemsPerPage = 10;
    let currentCurrency = 'NGN';
    let currentProduct = null;
    let invoiceItems = [];
    
    // Initialize the page
    function init() {
        loadInventoryData().then(() => {
            renderInventoryTable();
            updateSummaryCards();
            setupEventListeners();
            setCurrentDate();
        });
    }
    
    // Load inventory data from JSON file
    function loadInventoryData() {
        return fetch('./data/inventory.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load inventory data');
                }
                return response.json();
            })
            .then(data => {
                inventoryData = data;
            })
            .catch(error => {
                console.error('Error loading inventory data:', error);
                inventoryData = [];
            });
    }
    
    // Set current date in invoice date field
    function setCurrentDate() {
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        document.getElementById('invoiceDate').value = formattedDate;
    }
    
    // Render the inventory table with pagination
    function renderInventoryTable() {
        const tableBody = document.getElementById('inventoryTable').querySelector('tbody');
        tableBody.innerHTML = '';
        
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        
        // Filter items
        const filteredItems = inventoryData.filter(product => {
            const matchesCategory = category === 'all' || product.category === category;
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm) || 
                product.code.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });
        
        // Update pagination info
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Enable/disable pagination buttons
        document.getElementById('prevPage').disabled = currentPage <= 1;
        document.getElementById('nextPage').disabled = currentPage >= totalPages;
        
        // Get items for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        // Populate table
        pageItems.forEach(product => {
            const row = createTableRow(product);
            tableBody.appendChild(row);
        });
        
        // Update summary cards
        updateSummaryCards();
    }
    
    // Create a table row for a product
    function createTableRow(product) {
        const row = document.createElement('tr');
        row.dataset.id = product.id;
        
        // Calculate prices
        const prices = calculatePrices(product.foreignPrice);
        
        // Format currencies
        const foreignPriceFormatted = formatCurrency(prices.foreignPrice, currentCurrency);
        const landingCostFormatted = formatCurrency(prices.landingCost, 'NGN');
        const sellingPriceFormatted = formatCurrency(prices.sellingPrice, 'NGN');
        
        // Determine category display name
        const categoryDisplay = getCategoryDisplayName(product.category);
        
        // Get location stocks (default to 0 if not specified)
        const mainWarehouse = product.locations?.mainWarehouse || 0;
        const branchA = product.locations?.branchA || 0;
        const branchB = product.locations?.branchB || 0;
        const totalStock = mainWarehouse + branchA + branchB;
        
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.code}</td>
            <td>${categoryDisplay}</td>
            <td class="${mainWarehouse < 3 ? 'low-stock' : ''}">${mainWarehouse}</td>
            <td class="${branchA < 3 ? 'low-stock' : ''}">${branchA}</td>
            <td class="${branchB < 3 ? 'low-stock' : ''}">${branchB}</td>
            <td class="${totalStock < 3 ? 'low-stock' : ''}">${totalStock}</td>
            <td>${foreignPriceFormatted}</td>
            <td>${landingCostFormatted}</td>
            <td>${sellingPriceFormatted}</td>
            <td>
                <button class="btn secondary view-btn" data-id="${product.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        return row;
    }
    
    // Calculate all prices based on current settings
    function calculatePrices(foreignValue) {
        const exchange = parseFloat(document.getElementById('exchangeRate').value) || 1500;
        const freight = parseFloat(document.getElementById('freightMarkup').value) || 15;
        const wholesale = parseFloat(document.getElementById('wholesaleMarkup').value) || 25;
        
        return {
            foreignPrice: foreignValue,
            landingCost: foreignValue * exchange * (1 + freight/100),
            sellingPrice: foreignValue * exchange * (1 + freight/100) * (1 + wholesale/100)
        };
    }
    
    // Format currency based on selected currency
    function formatCurrency(amount, currency) {
        if (currency === 'USD') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(amount);
        } else if (currency === 'EUR') {
            return new Intl.NumberFormat('en-IE', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2
            }).format(amount);
        } else if (currency === 'GBP') {
            return new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: 'GBP',
                minimumFractionDigits: 2
            }).format(amount);
        } else {
            // NGN
            return '₦' + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        }
    }
    
    // Get display name for category
    function getCategoryDisplayName(category) {
        switch(category) {
            case 'machine': return 'Machines';
            case 'spare-part': return 'Spare Parts';
            case 'accessory': return 'Accessories';
            default: return category;
        }
    }
    
    // Update summary cards
    function updateSummaryCards() {
        const totalItems = inventoryData.length;
        const totalStock = inventoryData.reduce((sum, item) => sum + item.stock, 0);
        
        // Calculate total inventory value
        const exchange = parseFloat(document.getElementById('exchangeRate').value) || 1500;
        const freight = parseFloat(document.getElementById('freightMarkup').value) || 15;
        const totalValue = inventoryData.reduce((sum, item) => {
            return sum + (item.foreignPrice * exchange * (1 + freight/100) * item.stock);
        }, 0);
        
        const lowStockItems = inventoryData.filter(item => item.stock < 3).length;
        
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalStock').textContent = totalStock;
        document.getElementById('totalValue').textContent = formatCurrency(totalValue, 'NGN');
        document.getElementById('lowStockItems').textContent = lowStockItems;
    }
    
    // Show product modal
    function showProductModal(productId) {
        currentProduct = inventoryData.find(p => p.id === productId);
        if (!currentProduct) return;
        
        // Calculate prices
        const prices = calculatePrices(currentProduct.foreignPrice);
        
        // Format currencies
        const foreignPriceFormatted = formatCurrency(prices.foreignPrice, currentCurrency);
        const landingCostFormatted = formatCurrency(prices.landingCost, 'NGN');
        const sellingPriceFormatted = formatCurrency(prices.sellingPrice, 'NGN');
        
        // Update modal content
        document.getElementById('modalProductImage').src = currentProduct.image;
        document.getElementById('modalProductName').textContent = currentProduct.name;
        document.getElementById('modalProductCode').textContent = currentProduct.code;
        document.getElementById('modalStockIn').textContent = currentProduct.stockIn;
        document.getElementById('modalStockOut').textContent = currentProduct.stockOut;
        document.getElementById('modalStockBalance').textContent = currentProduct.stock;
        document.getElementById('modalForeignPrice').textContent = foreignPriceFormatted;
        document.getElementById('modalLandingCost').textContent = landingCostFormatted;
        document.getElementById('modalSellingPrice').textContent = sellingPriceFormatted;
        document.getElementById('modalDescription').textContent = currentProduct.description;
        
        // Show modal
        document.getElementById('productModal').style.display = 'block';
    }
    
    // Show add items modal with searchable list
    function showAddItemsModal() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('addItemsModal')) {
            const modalHTML = `
                <div id="addItemsModal" class="modal">
                    <div class="modal-content" style="max-width: 800px;">
                        <span class="close">&times;</span>
                        <h2>Add Items to Invoice</h2>
                        <div class="search-container" style="margin-bottom: 20px;">
                            <input type="text" id="addItemsSearch" placeholder="Search products..." style="width: 100%; padding: 10px;">
                        </div>
                        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                            <table id="addItemsTable" style="width: 100%;">
                                <thead>
                                    <tr>
                                        <th>Select</th>
                                        <th>Product</th>
                                        <th>Code</th>
                                        <th>Category</th>
                                        <th>Stock</th>
                                        <th>Price</th>
                                    </tr>
                                </thead>
                                <tbody id="addItemsTableBody">
                                    <!-- Items will be populated here -->
                                </tbody>
                            </table>
                        </div>
                        <div style="margin-top: 20px; display: flex; justify-content: space-between;">
                            <button id="cancelAddItems" class="btn secondary">Cancel</button>
                            <button id="confirmAddItems" class="btn primary">Add Selected Items</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Setup event listeners for the new modal
            setupAddItemsModalListeners();
        }
        
        // Populate the table with inventory items
        populateAddItemsTable(inventoryData);
        
        // Show the modal
        document.getElementById('addItemsModal').style.display = 'block';
    }
    
    // Populate the add items table
    function populateAddItemsTable(items) {
        const tableBody = document.getElementById('addItemsTableBody');
        tableBody.innerHTML = '';
        
        items.forEach(product => {
            const prices = calculatePrices(product.foreignPrice);
            const row = document.createElement('tr');
            row.dataset.id = product.id;
            
            row.innerHTML = `
                <td><input type="checkbox" class="item-checkbox" data-id="${product.id}"></td>
                <td>${product.name}</td>
                <td>${product.code}</td>
                <td>${getCategoryDisplayName(product.category)}</td>
                <td class="${product.stock < 3 ? 'low-stock' : ''}">${product.stock}</td>
                <td>${formatCurrency(prices.sellingPrice, 'NGN')}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
    
    // Setup event listeners for add items modal
    function setupAddItemsModalListeners() {
        const modal = document.getElementById('addItemsModal');
        
        // Close modal when clicking X
        modal.querySelector('.close').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Close modal when clicking cancel
        document.getElementById('cancelAddItems').addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Search functionality
        document.getElementById('addItemsSearch').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const filteredItems = inventoryData.filter(product => {
                return product.name.toLowerCase().includes(searchTerm) || 
                       product.code.toLowerCase().includes(searchTerm) ||
                       getCategoryDisplayName(product.category).toLowerCase().includes(searchTerm);
            });
            populateAddItemsTable(filteredItems);
        });
        
        // Add selected items
        document.getElementById('confirmAddItems').addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('#addItemsTableBody .item-checkbox:checked');
            let addedCount = 0;
            
            checkboxes.forEach(checkbox => {
                const productId = parseInt(checkbox.dataset.id);
                const product = inventoryData.find(p => p.id === productId);
                
                if (product && product.stock > 0) {
                    const prices = calculatePrices(product.foreignPrice);
                    
                    // Check if item already exists in invoice
                    const existingItemIndex = invoiceItems.findIndex(item => item.product.id === product.id);
                    
                    if (existingItemIndex >= 0) {
                        // Item exists, increase quantity but don't exceed available stock
                        const newQty = invoiceItems[existingItemIndex].quantity + 1;
                        if (newQty <= product.stock) {
                            invoiceItems[existingItemIndex].quantity = newQty;
                            addedCount++;
                        }
                    } else {
                        // Add new item to invoice
                        invoiceItems.push({
                            product: product,
                            quantity: 1,
                            customPrice: prices.sellingPrice
                        });
                        addedCount++;
                    }
                }
            });
            
            // Update the invoice display
            renderInvoiceItems();
            
            // Show notification
            if (addedCount > 0) {
                showNotification(`${addedCount} item(s) added to invoice`);
                // Show the invoice modal if it's not already visible
                if (document.getElementById('invoiceModal').style.display !== 'block') {
                    showInvoiceModal();
                }
            } else {
                showNotification('No items were added', false);
            }
            
            // Close the add items modal
            modal.style.display = 'none';
        });
    }
    
    // Show invoice modal
    function showInvoiceModal() {
        renderInvoiceItems();
        document.getElementById('invoiceModal').style.display = 'block';
    }
    
    // Render invoice items with editable prices and quantities
    function renderInvoiceItems() {
        const tableBody = document.getElementById('invoiceItemsTable').querySelector('tbody');
        tableBody.innerHTML = '';
        
        if (invoiceItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="empty-message">No items added to invoice</td>';
            updateInvoiceTotals();
            return;
        }
        
        invoiceItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.dataset.index = index;
            
            row.innerHTML = `
                <td>${item.product.name}</td>
                <td>${item.product.description.substring(0, 50)}...</td>
                <td><input type="number" class="item-qty" value="${item.quantity}" min="1" max="${item.product.stock}"></td>
                <td><input type="number" class="item-price" value="${item.customPrice.toFixed(2)}" min="0" step="0.01"></td>
                <td class="item-total">${formatCurrency(item.customPrice * item.quantity, 'NGN')}</td>
                <td>
                    <button class="btn secondary remove-item-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        updateInvoiceTotals();
    }
    
    // Update invoice totals
    function updateInvoiceTotals() {
        let subtotal = 0;
        
        invoiceItems.forEach(item => {
            subtotal += item.customPrice * item.quantity;
        });
        
        const tax = subtotal * 0.075; // 7.5% tax
        const total = subtotal + tax;
        
        document.getElementById('invoiceSubtotal').textContent = formatCurrency(subtotal, 'NGN');
        document.getElementById('invoiceTax').textContent = formatCurrency(tax, 'NGN');
        document.getElementById('invoiceTotal').textContent = formatCurrency(total, 'NGN');
    }
    
    // Show notification
    function showNotification(message, isSuccess = true) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 24px';
        notification.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '1000';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        notification.style.animation = 'fadeIn 0.3s';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
        
        // Add some basic animations if they don't exist
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; transform: translateY(0); }
                    to { opacity: 0; transform: translateY(20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Print invoice
    function printInvoice() {
        // Create a print stylesheet link if it doesn't exist
        if (!document.getElementById('print-styles')) {
            const link = document.createElement('link');
            link.id = 'print-styles';
            link.rel = 'stylesheet';
            link.href = 'css/print.css';
            link.media = 'print';
            document.head.appendChild(link);
        }
        
        // Generate invoice HTML
        const invoiceHTML = generateInvoiceHTML();
        
        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        printWindow.onload = function() {
            printWindow.print();
        };
    }
    
    // Generate invoice HTML for printing
    function generateInvoiceHTML() {
        // Calculate totals
        let subtotal = 0;
        let itemsRows = '';
        
        invoiceItems.forEach(item => {
            const itemTotal = item.customPrice * item.quantity;
            subtotal += itemTotal;
            
            itemsRows += `
                <tr>
                    <td style="border: 1px solid #e0e0e0; padding: 10px;">${item.product.name}</td>
                    <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: center;">${item.product.code}</td>
                    <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: center;">${item.quantity}</td>
                    <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: right;">${formatCurrency(item.customPrice, 'NGN')}</td>
                    <td style="border: 1px solid #e0e0e0; padding: 10px; text-align: right;">${formatCurrency(itemTotal, 'NGN')}</td>
                </tr>
            `;
        });
        
        const tax = subtotal * 0.075;
        const total = subtotal + tax;
        
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice - Dinar Agricultural</title>
                <style>
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .invoice-wrapper {
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 30px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #e0e0e0;
                    }
                    .company-address {
                        flex: 1;
                    }
                    .invoice-info {
                        text-align: right;
                    }
                    .logo {
                        max-height: 80px;
                        margin-bottom: 15px;
                    }
                    .company-name {
                        color: #2c3e50;
                        font-size: 22px;
                        font-weight: 600;
                        margin-bottom: 5px;
                    }
                    .company-details {
                        color: #555;
                        font-size: 14px;
                        line-height: 1.5;
                    }
                    .invoice-title {
                        font-size: 28px;
                        color: #3498db;
                        font-weight: bold;
                        margin-bottom: 5px;
                        background: linear-gradient(to right, #3498db, #2c3e50);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .invoice-number {
                        font-size: 16px;
                        color: #7f8c8d;
                        margin-bottom: 5px;
                    }
                    .invoice-date {
                        color: #555;
                        font-weight: 500;
                    }
                    .billing-info {
                        display: flex;
                        margin-bottom: 30px;
                        background: linear-gradient(to right, #f8f9fa, #ffffff);
                        padding: 20px;
                        border-radius: 6px;
                        border: 1px solid #e0e0e0;
                    }
                    .bill-to {
                        flex: 1;
                    }
                    .invoice-meta {
                        flex: 1;
                        text-align: right;
                    }
                    .section-title {
                        color: #2c3e50;
                        font-size: 18px;
                        font-weight: 600;
                        margin-bottom: 10px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 5px;
                        display: inline-block;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }
                    th {
                        background: linear-gradient(to bottom, #3498db, #2980b9);
                        color: white;
                        border: 1px solid #2980b9;
                        padding: 12px;
                        text-align: left;
                        font-weight: 500;
                    }
                    td {
                        border: 1px solid #e0e0e0;
                        padding: 10px;
                    }
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    tr:hover {
                        background-color: #f1f8fe;
                    }
                    .text-right {
                        text-align: right;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .totals-table {
                        width: 300px;
                        float: right;
                        margin-top: 20px;
                        border-radius: 6px;
                        overflow: hidden;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    }
                    .totals-table td {
                        border: none;
                        padding: 12px 15px;
                        background-color: white;
                    }
                    .totals-table tr:first-child td {
                        border-top: none;
                    }
                    .totals-table tr:last-child td {
                        border-top: 2px solid #3498db;
                        font-weight: bold;
                        background-color: #f8f9fa;
                        color: #2c3e50;
                    }
                    .footer {
                        margin-top: 50px;
                        padding-top: 20px;
                        border-top: 1px solid #e0e0e0;
                        text-align: center;
                        font-size: 12px;
                        color: #7f8c8d;
                    }
                    .notes {
                        margin-top: 30px;
                        font-size: 14px;
                        padding: 15px;
                        background-color: #f8f9fa;
                        border-radius: 6px;
                        border-left: 4px solid #3498db;
                    }
                    .notes-title {
                        color: #2c3e50;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    .payment-info {
                        margin-top: 15px;
                        padding: 12px;
                        background-color: #e8f4fc;
                        border-radius: 6px;
                        border-left: 4px solid #2980b9;
                    }
                    .stamp-area {
                        float: right;
                        margin-top: 30px;
                        text-align: center;
                        color: #7f8c8d;
                        font-style: italic;
                    }
                    .stamp {
                        width: 120px;
                        height: 80px;
                        border: 2px dashed #bdc3c7;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="invoice-wrapper">
                    <div class="header">
                        <div class="company-address">
                            <img src="images/logo.png" alt="Company Logo" class="logo">
                            <div class="company-name">Dinar Agricultural Machines & Spare Parts</div>
                            <div class="company-details">
                                123 Agric Road, Kano, Nigeria<br>
                                Phone: +234 123 456 7890<br>
                                Email: info@dinaragric.com<br>
                                VAT No: NG123456789
                            </div>
                        </div>
                        <div class="invoice-info">
                            <div class="invoice-title">TAX INVOICE</div>
                            <div class="invoice-number">Invoice #: ${document.getElementById('invoiceNumber').value}</div>
                            <div class="invoice-date">Date: ${document.getElementById('invoiceDate').value}</div>
                        </div>
                    </div>
                    
                    <div class="billing-info">
                        <div class="bill-to">
                            <div class="section-title">Bill To:</div>
                            <p><strong>${document.getElementById('customerName').value || 'Customer Name'}</strong></p>
                            <p>${document.getElementById('customerPhone').value || 'Phone Number'}</p>
                            <p>${document.getElementById('customerAddress').value || 'Customer Address'}</p>
                        </div>
                        <div class="invoice-meta">
                            <div class="section-title">Invoice Details</div>
                            <p><strong>Payment Method:</strong> ${document.getElementById('paymentMethod').value}</p>
                            <p><strong>Due Date:</strong> ${new Date(new Date(document.getElementById('invoiceDate').value).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</p>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30%;">Product</th>
                                <th style="width: 15%;">Code</th>
                                <th style="width: 10%;">Qty</th>
                                <th style="width: 20%;">Unit Price</th>
                                <th style="width: 25%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                    
                    <table class="totals-table">
                        <tr>
                            <td>Subtotal:</td>
                            <td class="text-right">${formatCurrency(subtotal, 'NGN')}</td>
                        </tr>
                        <tr>
                            <td>Tax (7.5%):</td>
                            <td class="text-right">${formatCurrency(tax, 'NGN')}</td>
                        </tr>
                        <tr>
                            <td>Total Due:</td>
                            <td class="text-right">${formatCurrency(total, 'NGN')}</td>
                        </tr>
                    </table>
                    
                    <div style="clear: both;"></div>
                    
                    <div class="stamp-area">
                        <div class="stamp">Approved Stamp</div>
                        <div>Authorized Signature</div>
                    </div>
                    
                    <div class="notes">
                        <div class="notes-title">Notes:</div>
                        <p>Thank you for your business. Please make payment within 14 days to avoid late fees.</p>
                        
                        <div class="payment-info">
                            <strong>Payment Information:</strong><br>
                            Bank Name: Zenith Bank<br>
                            Account Name: Dinar Agricultural<br>
                            Account Number: 1234567890<br>
                            Sort Code: 12345678
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>If you have any questions about this invoice, please contact</p>
                        <p>accounts@dinaragric.com or call +234 123 456 7890</p>
                        <p style="margin-top: 10px;">This is a computer generated invoice. No signature required.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    // Print stock report
    function printStockReport() {
        // Create a print stylesheet link if it doesn't exist
        if (!document.getElementById('print-styles')) {
            const link = document.createElement('link');
            link.id = 'print-styles';
            link.rel = 'stylesheet';
            link.href = 'css/print.css';
            link.media = 'print';
            document.head.appendChild(link);
        }
        
        // Generate stock report HTML
        const stockHTML = generateStockReportHTML();
        
        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(stockHTML);
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load before printing
        printWindow.onload = function() {
            printWindow.print();
        };
    }
    
    // Generate stock report HTML
    function generateStockReportHTML() {
        // Create items rows
        let itemsRows = '';
        inventoryData.forEach(item => {
            const prices = calculatePrices(item.foreignPrice);
            
            itemsRows += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.code}</td>
                    <td>${getCategoryDisplayName(item.category)}</td>
                    <td>${item.stockIn}</td>
                    <td>${item.stockOut}</td>
                    <td class="${item.stock < 3 ? 'low-stock' : ''}">${item.stock}</td>
                    <td>${formatCurrency(prices.foreignPrice, currentCurrency)}</td>
                    <td>${formatCurrency(prices.landingCost, 'NGN')}</td>
                    <td>${formatCurrency(prices.sellingPrice, 'NGN')}</td>
                </tr>
            `;
        });
        
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Stock Report - Dinar Agricultural</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .report-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .logo { max-width: 150px; }
                    .report-title { font-size: 24px; font-weight: bold; color: #2c3e50; }
                    .report-info { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f5f5f5; }
                    .low-stock { color: #e74c3c; font-weight: bold; }
                    .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #777; }
                    .summary { display: flex; justify-content: space-around; margin: 30px 0; }
                    .summary-card { padding: 15px; border-radius: 6px; background: #f5f5f5; text-align: center; min-width: 150px; }
                    .summary-card h3 { margin: 0 0 10px 0; font-size: 1em; color: #7f8c8d; }
                    .summary-card p { margin: 0; font-size: 1.5em; font-weight: bold; color: #2c3e50; }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="header">
                        <div>
                            <img src="images/logo.png" alt="Dinar Agricultural" class="logo">
                            <h1>Dinar Agricultural Machines & Spare Parts</h1>
                            <p>123 Agric Road, Kano, Nigeria</p>
                        </div>
                        <div class="report-title">STOCK REPORT</div>
                    </div>
                    
                    <div class="report-info">
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Currency:</strong> ${currentCurrency}</p>
                        <p><strong>Exchange Rate:</strong> ₦${document.getElementById('exchangeRate').value} per $1</p>
                    </div>
                    
                    <div class="summary">
                        <div class="summary-card">
                            <h3>Total Items</h3>
                            <p>${inventoryData.length}</p>
                        </div>
                        <div class="summary-card">
                            <h3>Total Stock</h3>
                            <p>${inventoryData.reduce((sum, item) => sum + item.stock, 0)}</p>
                        </div>
                        <div class="summary-card">
                            <h3>Low Stock Items</h3>
                            <p>${inventoryData.filter(item => item.stock < 3).length}</p>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Code</th>
                                <th>Category</th>
                                <th>Stock In</th>
                                <th>Stock Out</th>
                                <th>Balance</th>
                                <th>Foreign Price</th>
                                <th>Landing Cost</th>
                                <th>Selling Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>Generated by Dinar Agricultural Inventory System</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Filter events
        document.getElementById('searchInput').addEventListener('input', () => {
            currentPage = 1;
            renderInventoryTable();
        });
        
        document.getElementById('categoryFilter').addEventListener('change', () => {
            currentPage = 1;
            renderInventoryTable();
        });
        
        document.getElementById('resetFilters').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('categoryFilter').value = 'all';
            currentPage = 1;
            renderInventoryTable();
        });
        
        // Currency change
        document.getElementById('baseCurrency').addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            renderInventoryTable();
        });
        
        // Price calculator events
        document.getElementById('exchangeRate').addEventListener('change', renderInventoryTable);
        document.getElementById('freightMarkup').addEventListener('change', renderInventoryTable);
        document.getElementById('wholesaleMarkup').addEventListener('change', renderInventoryTable);
        
        // Pagination events
        document.getElementById('prevPage').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderInventoryTable();
            }
        });
        
        document.getElementById('nextPage').addEventListener('click', () => {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const category = document.getElementById('categoryFilter').value;
            const filteredItems = inventoryData.filter(product => {
                const matchesCategory = category === 'all' || product.category === category;
                const matchesSearch = !searchTerm || 
                    product.name.toLowerCase().includes(searchTerm) || 
                    product.code.toLowerCase().includes(searchTerm);
                return matchesCategory && matchesSearch;
            });
            
            const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
            
            if (currentPage < totalPages) {
                currentPage++;
                renderInventoryTable();
            }
        });
        
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderInventoryTable();
        });
        
        // Modal events
        document.querySelectorAll('.close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').style.display = 'none';
            });
        });
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        document.getElementById('closeModalBtn')?.addEventListener('click', () => {
            document.getElementById('productModal').style.display = 'none';
        });
        
        // View button events (delegated)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-btn') || e.target.closest('.view-btn')) {
                const btn = e.target.classList.contains('view-btn') ? e.target : e.target.closest('.view-btn');
                const productId = parseInt(btn.dataset.id);
                showProductModal(productId);
            }
        });
        
        // Invoice events
        document.getElementById('printInvoiceBtn').addEventListener('click', showInvoiceModal);
        document.getElementById('printStockBtn').addEventListener('click', printStockReport);
        
        document.getElementById('printInvoiceFinalBtn').addEventListener('click', printInvoice);
        document.getElementById('clearInvoiceBtn').addEventListener('click', () => {
            invoiceItems = [];
            renderInvoiceItems();
            showNotification('Invoice cleared');
        });
        
        // Changed from showAddItemModal to showAddItemsModal
        document.getElementById('addItemBtn').addEventListener('click', showAddItemsModal);
        
        // Delegated events for invoice items
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-btn') || e.target.closest('.remove-item-btn')) {
                const btn = e.target.classList.contains('remove-item-btn') ? e.target : e.target.closest('.remove-item-btn');
                const index = parseInt(btn.dataset.index);
                const removedItem = invoiceItems[index].product.name;
                invoiceItems.splice(index, 1);
                renderInvoiceItems();
                showNotification(`${removedItem} removed from invoice`);
            }
        });
        
        // Handle quantity and price changes in invoice
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('item-qty')) {
                const index = parseInt(e.target.closest('tr').dataset.index);
                const newQty = parseInt(e.target.value);
                
                if (newQty < 1) {
                    e.target.value = 1;
                    invoiceItems[index].quantity = 1;
                } else if (newQty > invoiceItems[index].product.stock) {
                    e.target.value = invoiceItems[index].product.stock;
                    invoiceItems[index].quantity = invoiceItems[index].product.stock;
                    showNotification(`Only ${invoiceItems[index].product.stock} items available in stock!`, false);
                } else {
                    invoiceItems[index].quantity = newQty;
                }
                
                // Update the total column
                const row = e.target.closest('tr');
                const price = invoiceItems[index].customPrice;
                row.querySelector('.item-total').textContent = formatCurrency(price * invoiceItems[index].quantity, 'NGN');
                
                updateInvoiceTotals();
            }
            
            if (e.target.classList.contains('item-price')) {
                const index = parseInt(e.target.closest('tr').dataset.index);
                const newPrice = parseFloat(e.target.value);
                
                if (newPrice < 0) {
                    e.target.value = 0;
                    invoiceItems[index].customPrice = 0;
                } else {
                    invoiceItems[index].customPrice = newPrice;
                }
                
                // Update the total column
                const row = e.target.closest('tr');
                const qty = invoiceItems[index].quantity;
                row.querySelector('.item-total').textContent = formatCurrency(newPrice * qty, 'NGN');
                
                updateInvoiceTotals();
            }
        });
    }

    // Initialize the application
    init();
});