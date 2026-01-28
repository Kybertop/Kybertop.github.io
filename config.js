// Konfigurácia pre GitHub API
// UPOZORNENIE: Token je verejne viditeľný! Použi token s minimálnymi právami (len repo contents)

const CONFIG = {
    // GitHub nastavenia - VYPLŇ TIETO HODNOTY
    GITHUB_TOKEN: '', // Tvoj Personal Access Token (Settings → Developer settings → Personal access tokens)
    GITHUB_OWNER: '', // Tvoje GitHub meno (napr. 'kybertop')
    GITHUB_REPO: '',  // Názov repozitára (napr. 'lunch-reservation')
    GITHUB_BRANCH: 'main', // Branch kde sú dáta
    
    // Cesta k JSON súboru s objednávkami
    ORDERS_FILE: 'data/orders.json',
    
    // Ak je token prázdny, použije sa localStorage ako fallback
    USE_GITHUB: false // Zmeň na true keď nastavíš token
};

// Automaticky zapni GitHub ak je token vyplnený
if (CONFIG.GITHUB_TOKEN && CONFIG.GITHUB_OWNER && CONFIG.GITHUB_REPO) {
    CONFIG.USE_GITHUB = true;
}
