const App = {
    formatDate(dateStr) {
        if (!dateStr) return 'No due date';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    isOverdue(dueDate, status) {
        if (!dueDate || status === 'Done') return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const due = new Date(`${dueDate}T00:00:00`);
        return due < today;
    },

    getStatusBadgeClass(status) {
        switch (status) {
            case 'To Do': return 'badge-todo';
            case 'In Progress': return 'badge-inprogress';
            case 'Done': return 'badge-done';
            default: return 'badge-todo';
        }
    },

    getPriorityBadgeClass(priority) {
        switch (priority) {
            case 'High': return 'badge-high';
            case 'Medium': return 'badge-medium';
            case 'Low': return 'badge-low';
            default: return 'badge-medium';
        }
    },

    renderTaskCard(task, showActions = true) {
        const dueDate = this.formatDate(task.dueDate);
        const isOverdue = this.isOverdue(task.dueDate, task.status);

        return `
            <div class="task-card" data-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-badges">
                        <span class="badge ${this.getStatusBadgeClass(task.status)}">${task.status}</span>
                        <span class="badge ${this.getPriorityBadgeClass(task.priority)}">${task.priority}</span>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span>Created: ${this.formatDate(task.createdAt)}</span>
                    <span class="${isOverdue ? 'overdue' : ''}">Due: ${dueDate}</span>
                </div>
                ${showActions ? `
                    <div class="task-actions">
                        <a href="edit-task.html?id=${task.id}" class="btn btn-secondary btn-sm">Edit</a>
                        ${task.status !== 'Done' ? `
                            <button class="btn btn-success btn-sm complete-btn" data-id="${task.id}">Complete</button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm delete-btn" data-id="${task.id}">Delete</button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    async initDashboard() {
        await this.updateDashboardStats();
        await this.renderRecentTasks();
    },

    async refreshCurrentPage() {
        if (document.getElementById('tasks-list')) {
            await this.renderFilteredTasks();
        }

        if (document.getElementById('total-tasks')) {
            await this.updateDashboardStats();
            await this.renderRecentTasks();
        }
    },

    async updateDashboardStats() {
        const stats = await TaskService.getStats();
        document.getElementById('total-tasks').textContent = stats.total;
        document.getElementById('todo-count').textContent = stats.todo;
        document.getElementById('inprogress-count').textContent = stats.inProgress;
        document.getElementById('done-count').textContent = stats.done;
    },

    async renderRecentTasks() {
        const tasks = await TaskService.getAll();
        const inProgressTasks = tasks
            .filter(task => task.status === 'In Progress')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const todoTasks = tasks
            .filter(task => task.status === 'To Do')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        this.renderDashboardTaskGroup(
            document.getElementById('inprogress-tasks-list'),
            inProgressTasks,
            'No in progress tasks.'
        );
        this.renderDashboardTaskGroup(
            document.getElementById('todo-tasks-list'),
            todoTasks,
            'No to do tasks. <a href="add-task.html">Add a task</a>'
        );
    },

    renderDashboardTaskGroup(container, tasks, emptyMessage) {
        if (tasks.length === 0) {
            container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
            return;
        }

        container.innerHTML = tasks.map(task => this.renderTaskCard(task, true)).join('');
        this.bindCompleteButtons(container);
    },

    initTaskList() {
        this.renderFilteredTasks();
        this.bindFilters();
    },

    async renderFilteredTasks() {
        const statusFilter = document.getElementById('filter-status').value;
        const priorityFilter = document.getElementById('filter-priority').value;
        const sortBy = document.getElementById('sort-by').value;

        let tasks = await TaskService.getAll();

        if (statusFilter) {
            tasks = tasks.filter(t => t.status === statusFilter);
        }
        if (priorityFilter) {
            tasks = tasks.filter(t => t.priority === priorityFilter);
        }

        tasks.sort((a, b) => {
            switch (sortBy) {
                case 'created-asc':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'due-asc':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'due-desc':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(b.dueDate) - new Date(a.dueDate);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        const container = document.getElementById('tasks-list');
        if (tasks.length === 0) {
            container.innerHTML = '<p class="empty-state">No tasks found. <a href="add-task.html">Add a task</a></p>';
            return;
        }

        container.innerHTML = tasks.map(task => this.renderTaskCard(task, true)).join('');
        this.bindCompleteButtons(container);
    },

    bindFilters() {
        document.getElementById('filter-status').addEventListener('change', () => this.renderFilteredTasks());
        document.getElementById('filter-priority').addEventListener('change', () => this.renderFilteredTasks());
        document.getElementById('sort-by').addEventListener('change', () => this.renderFilteredTasks());
    },

    bindCompleteButtons(container) {
        container.querySelectorAll('.complete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                try {
                    const task = await TaskService.getById(id);
                    if (task) {
                        await TaskService.update(id, { ...task, status: 'Done' });
                        await this.refreshCurrentPage();
                    }
                } catch (error) {
                    alert(error.message || 'Unable to complete task.');
                }
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this task?')) {
                    try {
                        await TaskService.delete(id);
                        await this.refreshCurrentPage();
                    } catch (error) {
                        alert(error.message || 'Unable to delete task.');
                    }
                }
            });
        });
    },

    initTaskForm() {
        const form = document.getElementById('task-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description'),
                status: formData.get('status'),
                priority: formData.get('priority'),
                dueDate: formData.get('dueDate')
            };

            try {
                await TaskService.create(taskData);
                window.location.href = 'tasks.html';
            } catch (error) {
                alert(error.message || 'Unable to save task.');
            }
        });
    },

    async initEditForm() {
        const urlParams = new URLSearchParams(window.location.search);
        const taskId = urlParams.get('id');

        if (!taskId) {
            window.location.href = 'tasks.html';
            return;
        }

        let task;
        try {
            task = await TaskService.getById(taskId);
        } catch (error) {
            alert(error.message || 'Task not found');
            window.location.href = 'tasks.html';
            return;
        }

        if (!task) {
            alert('Task not found');
            window.location.href = 'tasks.html';
            return;
        }

        this.populateForm(task);

        const form = document.getElementById('task-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const taskData = {
                title: formData.get('title'),
                description: formData.get('description'),
                status: formData.get('status'),
                priority: formData.get('priority'),
                dueDate: formData.get('dueDate')
            };

            try {
                await TaskService.update(taskId, taskData);
                window.location.href = 'tasks.html';
            } catch (error) {
                alert(error.message || 'Unable to update task.');
            }
        });

        document.getElementById('complete-btn').addEventListener('click', async () => {
            try {
                const task = await TaskService.getById(taskId);
                if (task && task.status !== 'Done') {
                    await TaskService.update(taskId, { ...task, status: 'Done' });
                    window.location.href = 'tasks.html';
                }
            } catch (error) {
                alert(error.message || 'Unable to complete task.');
            }
        });
    },

    populateForm(task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description;
        document.getElementById('status').value = task.status;
        document.getElementById('priority').value = task.priority;
        document.getElementById('dueDate').value = task.dueDate;
    }
};
