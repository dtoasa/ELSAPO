// CONFIGURACIÓN FIREBASE - PROYECTO TAREAS ESCOLARES JM
const firebaseConfig = {
    apiKey: "AIzaSyAcNRr7Qx4zlcXn1r87Ms1dVYzp_BEwhxU",
    authDomain: "tareas-escolares-jm.firebaseapp.com",
    projectId: "tareas-escolares-jm",
    storageBucket: "tareas-escolares-jm.firebasestorage.app",
    messagingSenderId: "1049622737927",
    appId: "1:1049622737927:web:8bc4806ced19337ce2a6a2",
    measurementId: "G-6B71EFEZD9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage(); // <--- NUEVO: Activamos Storage para archivos
