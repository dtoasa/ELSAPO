let isLogin = true;

function switchAuthTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const regFields = document.getElementById('register-fields');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit-btn');

    if (!loginTab) return; // Salir si no estamos en una página con auth

    if (tab === 'register') {
        isLogin = false;
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        regFields.style.display = 'block';
        authTitle.innerText = 'Crea tu cuenta';
        authSubmit.innerText = 'Registrarse';
    } else {
        isLogin = true;
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        regFields.style.display = 'none';
        authTitle.innerText = 'Iniciar Sesión';
        authSubmit.innerText = 'Entrar';
    }
}

const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const status = document.getElementById('auth-status');
        const submitBtn = document.getElementById('auth-submit-btn');

        if (status) {
            status.innerText = "Procesando...";
            status.style.color = "white";
        }
        if (submitBtn) submitBtn.disabled = true;

        try {
            if (isLogin) {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const userDoc = await db.collection('user_profiles').doc(userCredential.user.uid).get();

                if (userDoc.exists) {
                    redirectUser(userDoc.data().role);
                } else {
                    throw new Error("El perfil no existe. Regístrate de nuevo.");
                }
            } else {
                const name = document.getElementById('reg-name').value;
                const lastname = document.getElementById('reg-lastname').value;
                const role = document.getElementById('reg-role').value;

                if (!name || !lastname) throw new Error("Completa nombres y apellidos");

                const userCredential = await auth.createUserWithEmailAndPassword(email, password);

                await db.collection('user_profiles').doc(userCredential.user.uid).set({
                    name,
                    lastname,
                    email,
                    role,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                redirectUser(role);
            }
        } catch (error) {
            console.error(error);
            if (submitBtn) submitBtn.disabled = false;
            if (status) {
                if (error.code === 'auth/too-many-requests') {
                    status.innerText = "Error: Acceso bloqueado temporalmente por seguridad. Prueba en 15 min o usa otra red.";
                } else {
                    status.innerText = "Error: " + error.message;
                }
                status.style.color = "var(--error)";
            }
        }
    };
}

function redirectUser(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'student.html';
    }
}

// Escucha de sesión sin redirección automática infinita
auth.onAuthStateChanged(user => {
    if (user && (window.location.pathname.includes('index.html') || window.location.pathname === '/')) {
        // Solo verificamos, no redirigimos para no causar bucles
        console.log("Usuario logueado:", user.email);
    }
});
// --- Lógica del Scraper ---
async function startScraping() {
    const btn = document.getElementById('run-scraper-btn');
    const log = document.getElementById('scraper-log');

    btn.disabled = true;
    btn.innerHTML = '⚙️ Scrapeando... <span class="loader-dots"></span>';
    log.classList.add('active');
    log.innerHTML = '<div class="console-line">Iniciando conexión con el servidor local...</div>';

    try {
        const response = await fetch('http://localhost:3000/api/run-scraper', { method: 'POST' });

        if (!response.ok) throw new Error('Servidor local no responde. ¿Has ejecutado "node server.js"?');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            lines.forEach(line => {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.replace('data: ', ''));
                    const div = document.createElement('div');
                    div.className = 'console-line' + (data.type === 'error' ? ' console-error' : '');
                    div.innerText = data.message || (data.type === 'done' ? '--- FIN DEL PROCESO ---' : '');
                    log.appendChild(div);
                    log.scrollTop = log.scrollHeight;

                    if (data.type === 'done') {
                        btn.disabled = false;
                        btn.innerHTML = '✅ ¡Sincronización Completa!';
                        // Recargar la página automáticamente para ver los nuevos datos
                        setTimeout(() => {
                            if (window.location.pathname.includes('student.html')) {
                                window.location.reload();
                            } else {
                                btn.innerText = '🔄 Sincronizar con Edukar360';
                            }
                        }, 2000);
                    }
                }
            });
        }
    } catch (error) {
        const div = document.createElement('div');
        div.className = 'console-line console-error';
        div.innerText = '❌ Error: ' + error.message;
        log.appendChild(div);
        btn.disabled = false;
        btn.innerText = '❌ Error de Conexión';
    }
}
