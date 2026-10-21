const form = document.getElementById('formLogin');
const input = document.getElementById('usuario');
try { input.value = localStorage.getItem('usuario') || ''; } catch { /* Almacenamiento opcional. */ }
form.addEventListener('submit', event => {
    event.preventDefault();
    const name = input.value.trim();
    input.setCustomValidity(name ? '' : 'Ingresá tu nombre para continuar.');
    if (!form.reportValidity()) return;
    try { localStorage.setItem('usuario', name); } catch { /* Se puede entrar sin guardar el nombre. */ }
    window.location.assign('/tienda');
});
input.addEventListener('input', () => input.setCustomValidity(''));
