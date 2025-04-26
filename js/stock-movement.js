document.addEventListener('DOMContentLoaded', function() {
    // Stock movement data
    let movementData = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    // Initialize the page
    function init() {
        loadMovementData().then(() => {
            renderMovementTable();
            setupEventListeners();
            setDefaultDates();
        });
    }
    
    // Load movement data from JSON file
    function loadMovementData() {
        return fetch('./data/movements.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load movement data');
                }
                return response.json();
            })
            .then(data => {
                movementData = data;
                // Sort by date (newest first)
                movementData.sort((a, b) => new Date(b.date) - new Date(a.date));
            })
            .catch(error => {
                console.error('Error loading movement data:', error);
                movementData = [];
            });
    }
    
    // Date helper functions
    function getFirstDayOfMonth(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    function getLastDayOfMonth(date = new Date()) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    function setDefaultDates() {
        const startDate = getFirstDayOfMonth();
        const endDate = getLastDayOfMonth();
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }

    // Format currency
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

    // Format dates
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Update summary cards
    function updateSummaryCards() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        // Filter movements by date range
        const filteredMovements = movementData.filter(movement => {
            const movementDate = new Date(movement.date);
            return (!startDate || movementDate >= new Date(startDate)) &&
                   (!endDate || movementDate <= new Date(endDate));
        });
        
        // Calculate totals
        const salesTotal = filteredMovements
            .filter(m => m.type === 'sale')
            .reduce((sum, m) => sum + (m.totalValue || 0), 0);
        
        const purchasesTotal = filteredMovements
            .filter(m => m.type === 'purchase')
            .reduce((sum, m) => sum + (m.totalValue || 0), 0);
        
        const transfersCount = filteredMovements
            .filter(m => m.type === 'transfer')
            .length;
        
        // Update the cards
        document.getElementById('totalSales').textContent = formatCurrency(salesTotal, 'NGN');
        document.getElementById('totalPurchases').textContent = formatCurrency(purchasesTotal, 'NGN');
        document.getElementById('totalTransfers').textContent = transfersCount;
        
        // Update the period text
        const periodText = startDate && endDate 
            ? `${formatDate(startDate)} to ${formatDate(endDate)}`
            : 'All time';
        
        document.getElementById('salesPeriod').textContent = periodText;
        document.getElementById('purchasesPeriod').textContent = periodText;
        document.getElementById('transfersPeriod').textContent = periodText;
    }

    // Render the movement table with pagination
    function renderMovementTable() {
        const tableBody = document.getElementById('movementTable').querySelector('tbody');
        tableBody.innerHTML = '';
        
        const searchTerm = document.getElementById('movementSearch').value.toLowerCase();
        const movementType = document.getElementById('movementTypeFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        // Filter items
        const filteredItems = movementData.filter(movement => {
            const matchesType = movementType === 'all' || movement.type === movementType;
            const matchesStatus = statusFilter === 'all' || movement.status.toLowerCase() === statusFilter;
            const matchesSearch = !searchTerm || 
                movement.productName.toLowerCase().includes(searchTerm) || 
                movement.productCode.toLowerCase().includes(searchTerm) ||
                movement.reference.toLowerCase().includes(searchTerm);
            
            const movementDate = new Date(movement.date);
            const matchesDate = (!startDate || movementDate >= new Date(startDate)) &&
                               (!endDate || movementDate <= new Date(endDate));
            
            return matchesType && matchesStatus && matchesSearch && matchesDate;
        });
        
        // Update pagination info
        const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
        document.getElementById('movementPageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Enable/disable pagination buttons
        document.getElementById('movementPrevPage').disabled = currentPage <= 1;
        document.getElementById('movementNextPage').disabled = currentPage >= totalPages;
        
        // Get items for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
        const pageItems = filteredItems.slice(startIndex, endIndex);
        
        // Populate table
        pageItems.forEach(movement => {
            const row = createMovementRow(movement);
            tableBody.appendChild(row);
        });
        
        updateSummaryCards();
    }
    
    // Create a table row for a movement
    function createMovementRow(movement) {
        const row = document.createElement('tr');
        
        // Format date
        const formattedDate = new Date(movement.date).toLocaleDateString();
        
        // Get status badge class
        const statusClass = getStatusClass(movement.status);
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span class="badge ${movement.type}">${getMovementTypeDisplay(movement.type)}</span></td>
            <td>${movement.productName}</td>
            <td>${movement.productCode}</td>
            <td class="${movement.quantity < 0 ? 'negative' : 'positive'}">${movement.quantity}</td>
            <td>${movement.unitPrice ? formatCurrency(movement.unitPrice, 'NGN') : '-'}</td>
            <td>${movement.totalValue ? formatCurrency(movement.totalValue, 'NGN') : '-'}</td>
            <td>${movement.fromLocation || '-'}</td>
            <td>${movement.toLocation || '-'}</td>
            <td>${movement.reference}</td>
            <td><span class="badge ${statusClass}">${movement.status}</span></td>
            <td>
                <button class="btn secondary view-movement-btn" data-id="${movement.id}">
                    <i class="fas fa-eye"></i> Details
                </button>
            </td>
        `;
        
        return row;
    }
    
    // Get display name for movement type
    function getMovementTypeDisplay(type) {
        switch(type) {
            case 'sale': return 'Sale';
            case 'purchase': return 'Purchase';
            case 'transfer': return 'Transfer';
            case 'adjustment': return 'Adjustment';
            default: return type;
        }
    }
    
    // Get CSS class for status badge
    function getStatusClass(status) {
        switch(status.toLowerCase()) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'cancelled': return 'danger';
            default: return 'info';
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Filter events
        document.getElementById('movementSearch').addEventListener('input', () => {
            currentPage = 1;
            renderMovementTable();
        });
        
        document.getElementById('movementTypeFilter').addEventListener('change', () => {
            currentPage = 1;
            renderMovementTable();
        });
        
        document.getElementById('statusFilter').addEventListener('change', () => {
            currentPage = 1;
            renderMovementTable();
        });
        
        document.getElementById('startDate').addEventListener('change', () => {
            currentPage = 1;
            renderMovementTable();
        });
        
        document.getElementById('endDate').addEventListener('change', () => {
            currentPage = 1;
            renderMovementTable();
        });
        
        document.getElementById('resetMovementFilters').addEventListener('click', () => {
            document.getElementById('movementSearch').value = '';
            document.getElementById('movementTypeFilter').value = 'all';
            document.getElementById('statusFilter').value = 'all';
            setDefaultDates();
            currentPage = 1;
            renderMovementTable();
        });
        
        // Quick date range selector
        document.getElementById('quickDateRange').addEventListener('change', function() {
            const today = new Date();
            let startDate, endDate;
            
            switch(this.value) {
                case 'month':
                    startDate = getFirstDayOfMonth(today);
                    endDate = getLastDayOfMonth(today);
                    break;
                case 'lastMonth':
                    const lastMonth = new Date(today);
                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                    startDate = getFirstDayOfMonth(lastMonth);
                    endDate = getLastDayOfMonth(lastMonth);
                    break;
                case 'quarter':
                    const quarter = Math.floor(today.getMonth() / 3);
                    startDate = new Date(today.getFullYear(), quarter * 3, 1);
                    endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'year':
                    startDate = new Date(today.getFullYear(), 0, 1);
                    endDate = new Date(today.getFullYear(), 11, 31);
                    break;
                case 'custom':
                    return; // Let user select custom dates
            }
            
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
            document.getElementById('quickDateRange').value = 'custom';
            currentPage = 1;
            renderMovementTable();
        });
        
        // Pagination events
        document.getElementById('movementPrevPage').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderMovementTable();
            }
        });
        
        document.getElementById('movementNextPage').addEventListener('click', () => {
            const filteredItems = getFilteredMovements();
            const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
            
            if (currentPage < totalPages) {
                currentPage++;
                renderMovementTable();
            }
        });
    }
    
    // Get filtered movements based on current filters
    function getFilteredMovements() {
        const searchTerm = document.getElementById('movementSearch').value.toLowerCase();
        const movementType = document.getElementById('movementTypeFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        return movementData.filter(movement => {
            const matchesType = movementType === 'all' || movement.type === movementType;
            const matchesStatus = statusFilter === 'all' || movement.status.toLowerCase() === statusFilter;
            const matchesSearch = !searchTerm || 
                movement.productName.toLowerCase().includes(searchTerm) || 
                movement.productCode.toLowerCase().includes(searchTerm) ||
                movement.reference.toLowerCase().includes(searchTerm);
            
            const movementDate = new Date(movement.date);
            const matchesDate = (!startDate || movementDate >= new Date(startDate)) &&
                               (!endDate || movementDate <= new Date(endDate));
            
            return matchesType && matchesStatus && matchesSearch && matchesDate;
        });
    }

    // Initialize the application
    init();
});