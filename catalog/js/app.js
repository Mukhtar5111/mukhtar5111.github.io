// Global variables
let allParts = [];
let allMachines = [];

// Initialize the application
function initApp() {
    // Check if we're on the homepage and initialize any homepage-specific logic
    if (document.getElementById('homeSearch')) {
        // Homepage-specific initialization
    }
}

// Helper function to format text (capitalize first letter)
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);