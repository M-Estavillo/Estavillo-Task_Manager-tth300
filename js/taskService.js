const TaskService = {
    API_URL: '/api/tasks',

    async request(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.message || 'Request failed');
        }

        return data;
    },

    getAll() {
        return this.request(this.API_URL);
    },

    getById(id) {
        return this.request(`${this.API_URL}/${id}`);
    },

    create(taskData) {
        return this.request(this.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
    },

    update(id, taskData) {
        return this.request(`${this.API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
    },

    delete(id) {
        return this.request(`${this.API_URL}/${id}`, {
            method: 'DELETE'
        });
    },

    async getStats() {
        const tasks = await this.getAll();
        return {
            total: tasks.length,
            todo: tasks.filter(t => t.status === 'To Do').length,
            inProgress: tasks.filter(t => t.status === 'In Progress').length,
            done: tasks.filter(t => t.status === 'Done').length
        };
    }
};
