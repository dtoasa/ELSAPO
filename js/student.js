// Check auth
let currentUserProfile = null;

auth.onAuthStateChanged(user => {
    // Redirección deshabilitada para permitir acceso libre
    /*
    if (!user) {
        window.location.href = 'index.html';
    } else {
        db.collection('user_profiles').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                currentUserProfile = doc.data();
                document.getElementById('user-display-name').innerText = `${currentUserProfile.name} ${currentUserProfile.lastname}`;
                document.getElementById('welcome-text').innerText = `Hola, ${currentUserProfile.name}`;
                listenToStudentTasks(user.uid);
            } else {
                window.location.href = 'index.html';
            }
        });
    }
    */
    // Cargar tareas para todos por defecto ya que no hay login obligatorio
    listenToStudentTasks('all');
});

function listenToStudentTasks(uid) {
    db.collection('school_tasks')
        .onSnapshot(snap => {
            const grid = document.getElementById('student-tasks-grid');
            grid.innerHTML = '';
            let pendingCount = 0;
            let nearDeadlineCount = 0;

            const tasks = snap.docs.filter(doc => {
                const task = doc.data();
                return task.assignee === 'all' || task.assignee === uid;
            });

            if (tasks.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No tienes tareas asignadas por el momento.</p>';
            }

            tasks.forEach(doc => {
                const task = doc.data();
                const taskId = doc.id;
                const isCompleted = task.status === 'completed';

                // Lógica de Alarma
                const today = new Date();
                const deadlineDate = task.deadline ? new Date(task.deadline) : null;
                let alarmHtml = '';

                if (deadlineDate && !isCompleted) {
                    pendingCount++;
                    const diffTime = deadlineDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 0) {
                        alarmHtml = '<span style="color: #ef4444; font-weight: bold; font-size: 0.75rem;">🚨 ¡VENCIDA!</span>';
                    } else if (diffDays <= 2) {
                        alarmHtml = '<span style="color: #f59e0b; font-weight: bold; font-size: 0.75rem;">⚠️ VENCE PRONTO</span>';
                        nearDeadlineCount++;
                    }
                }

                const fileHtml = task.fileUrl ? `
                    <div style="margin: 10px 0; padding: 10px; background: rgba(99, 102, 241, 0.1); border: 1px dashed var(--primary); border-radius: 12px; text-align: center;">
                        <a href="${task.fileUrl}" target="_blank" style="color: white; font-size: 0.85rem; text-decoration: none; font-weight: 600;">
                            📂 Descargar Material (PDF/Imagen)
                        </a>
                    </div>
                ` : '';

                const card = document.createElement('div');
                card.className = 'glass-card task-card animate-fade-in';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <span class="task-status ${isCompleted ? 'status-completed' : 'status-pending'}">
                            ${isCompleted ? 'Completada ✅' : 'Pendiente'}
                        </span>
                        ${alarmHtml}
                    </div>
                    <h4 style="margin-top: 10px;">${task.title}</h4>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">${task.desc}</p>
                    ${fileHtml}
                    <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 0.8rem;">
                            <span style="display: block; color: var(--text-muted);">Materia: ${task.subject || 'S/M'}</span>
                            <span style="font-weight: 600;">Entrega: ${task.deadline || 'S/F'}</span>
                        </div>
                        <button class="btn ${isCompleted ? '' : 'btn-primary'}" 
                                onclick="toggleTaskStatus('${taskId}', '${task.status}')"
                                style="font-size: 0.8rem; padding: 8px 16px; border-radius: 10px;">
                            ${isCompleted ? 'Reabrir' : 'Hecha'}
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });

            document.getElementById('pending-count').innerText = pendingCount;

            // Notificación extra si hay tareas que vencen pronto
            if (nearDeadlineCount > 0) {
                const stats = document.getElementById('stats-summary');
                stats.style.background = 'rgba(239, 68, 68, 0.2)';
                stats.style.borderColor = 'var(--error)';
            } else {
                const stats = document.getElementById('stats-summary');
                stats.style.background = '';
                stats.style.borderColor = '';
            }
        });
}

window.toggleTaskStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    db.collection('school_tasks').doc(id).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};
