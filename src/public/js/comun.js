(() => {
    const button = document.querySelector('.theme-toggle');
    let dark = false;
    try { dark = localStorage.getItem('modoOscuro') === 'true'; } catch { /* El sitio también funciona sin almacenamiento. */ }
    function applyTheme() {
        document.body.classList.toggle('dark-mode', dark);
        if (!button) return;
        button.setAttribute('aria-pressed', String(dark));
        button.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
    }
    applyTheme();
    button?.addEventListener('click', () => {
        dark = !dark;
        applyTheme();
        try { localStorage.setItem('modoOscuro', String(dark)); } catch { /* Preferencia solo para esta visita. */ }
    });
    document.addEventListener('error', event => {
        if (event.target instanceof HTMLImageElement && !event.target.src.endsWith('/assets/products/fallback.svg')) {
            event.target.src = '/assets/products/fallback.svg';
        }
    }, true);
})();
