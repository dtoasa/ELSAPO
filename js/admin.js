// Check auth
let studentsMap = {};

auth.onAuthStateChanged(user => {
    // Redirección deshabilitada para permitir acceso libre
    /*
    if (!user) {
        window.location.href = 'index.html';
    } else {
        db.collection('user_profiles').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().role === 'admin') {
                document.getElementById('user-display-name').innerText = `Hola, ${doc.data().name}`;
                loadStudentsAndProgress();
            } else {
                window.location.href = 'index.html';
            }
        });
    }
    */
    loadStudentsAndProgress();
});

async function loadStudentsAndProgress() {
    const studentsSnap = await db.collection('user_profiles').where('role', '==', 'student').get();
    const select = document.getElementById('task-assignee');
    const progressList = document.getElementById('students-progress-list');

    select.innerHTML = '<option value="all">Todos los alumnos</option>';
    progressList.innerHTML = '';
    studentsMap = {};

    studentsSnap.forEach(doc => {
        const student = doc.data();
        studentsMap[doc.id] = `${student.name} ${student.lastname}`;

        const option = document.createElement('option');
        option.value = doc.id;
        option.innerText = `${student.name} ${student.lastname}`;
        select.appendChild(option);
    });

    listenToTasksAndProgress();
}

function listenToTasksAndProgress() {
    db.collection('school_tasks').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const grid = document.getElementById('admin-tasks-grid');
        const progressList = document.getElementById('students-progress-list');
        grid.innerHTML = '';

        let taskData = [];
        snap.forEach(doc => taskData.push({ id: doc.id, ...doc.data() }));

        taskData.forEach(task => {
            const assigneeName = task.assignee === 'all' ? 'Todos' : (studentsMap[task.assignee] || 'Alumno borrado');
            const card = document.createElement('div');
            card.className = 'glass-card task-card animate-fade-in';

            const today = new Date();
            const deadlineDate = task.deadline ? new Date(task.deadline) : null;
            let alarmHtml = '';

            if (deadlineDate && task.status !== 'completed') {
                const diffTime = deadlineDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) {
                    alarmHtml = '<span style="color: #ef4444; font-weight: bold; font-size: 0.7rem;">⚠️ ¡PLAZO VENCIDO!</span>';
                } else if (diffDays <= 2) {
                    alarmHtml = '<span style="color: #f59e0b; font-weight: bold; font-size: 0.7rem;">🕒 ¡VENCE PRONTO!</span>';
                }
            }

            const fileHtml = task.fileUrl ? `
                <div style="margin: 10px 0; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <a href="${task.fileUrl}" target="_blank" style="color: var(--primary); font-size: 0.8rem; text-decoration: none; display: flex; align-items: center; gap: 5px;">
                        📄 Ver Archivo Adjunto
                    </a>
                </div>
            ` : '';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <span class="task-status ${task.status === 'completed' ? 'status-completed' : 'status-pending'}">
                        ${task.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                    <button onclick="deleteTask('${task.id}', '${task.filePath}')" style="background:none; border:none; color:var(--error); cursor:pointer;">Eliminar</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <h4>${task.title}</h4>
                    ${alarmHtml}
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">${task.desc}</p>
                ${fileHtml}
                <div style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--glass-border); font-size: 0.8rem;">
                    <p><strong>Asignado a:</strong> ${assigneeName}</p>
                    <p><strong>Materia:</strong> ${task.subject || 'N/A'}</p>
                    <p><strong>Entrega:</strong> ${task.deadline || 'Sin fecha'}</p>
                </div>
            `;
            grid.appendChild(card);
        });

        progressList.innerHTML = '';
        Object.keys(studentsMap).forEach(studentId => {
            const studentTasks = taskData.filter(t => t.assignee === 'all' || t.assignee === studentId);
            const completed = studentTasks.filter(t => t.status === 'completed').length;
            const total = studentTasks.length;

            const progressCard = document.createElement('div');
            progressCard.className = 'glass-card animate-fade-in';
            progressCard.style.padding = '20px';
            progressCard.innerHTML = `
                <h4 style="margin-bottom: 10px;">${studentsMap[studentId]}</h4>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                        <span>Progreso: ${completed}/${total}</span>
                        <span>${total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${total > 0 ? (completed / total) * 100 : 0}%; height: 100%; background: var(--primary);"></div>
                    </div>
                </div>
            `;
            progressList.appendChild(progressCard);
        });
    });
}

document.getElementById('task-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-task-btn');
    const fileInput = document.getElementById('task-file');
    const file = fileInput.files[0];

    const taskData = {
        title: document.getElementById('task-title').value,
        desc: document.getElementById('task-desc').value,
        subject: document.getElementById('task-subject').value,
        deadline: document.getElementById('task-deadline').value,
        assignee: document.getElementById('task-assignee').value,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: auth.currentUser.uid
    };

    submitBtn.disabled = true;
    submitBtn.innerText = "Publicando...";

    try {
        if (file) {
            document.getElementById('upload-progress-container').style.display = 'block';
            const uploadBar = document.getElementById('upload-bar');

            const filePath = `tasks/${Date.now()}_${file.name}`;
            const fileRef = storage.ref().child(filePath);
            const uploadTask = fileRef.put(file);

            uploadTask.on('state_changed',
                (snap) => {
                    const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
                    uploadBar.style.width = progress + '%';
                },
                (err) => { throw err; },
                async () => {
                    const url = await uploadTask.snapshot.ref.getDownloadURL();
                    taskData.fileUrl = url;
                    taskData.filePath = filePath;
                    await db.collection('school_tasks').add(taskData);
                    resetForm();
                }
            );
        } else {
            await db.collection('school_tasks').add(taskData);
            resetForm();
        }
    } catch (err) {
        alert("Error: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Publicar Tarea";
    }
};

function resetForm() {
    document.getElementById('task-form').reset();
    document.getElementById('upload-progress-container').style.display = 'none';
    const submitBtn = document.getElementById('submit-task-btn');
    submitBtn.disabled = false;
    submitBtn.innerText = "Publicar Tarea";
    alert("¡Tarea publicada con éxito!");
}

window.deleteTask = async (id, filePath) => {
    if (confirm("¿Estás seguro de eliminar esta tarea?")) {
        await db.collection('school_tasks').doc(id).delete();
        if (filePath) {
            await storage.ref().child(filePath).delete().catch(e => console.log("File already gone"));
        }
    }
};
