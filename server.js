const express = require("express");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "task_manager_db"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        console.error("Create task_manager_db in phpMyAdmin and import task_manager_db.sql first.");
        return;
    }

    console.log("Connected to MySQL");
});

function formatDateValue(value) {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

function formatDateTimeValue(value) {
    if (!value) return "";

    if (value instanceof Date) {
        return value.toISOString();
    }

    return String(value);
}

function mapTask(row) {
    return {
        id: String(row.id),
        title: row.title,
        description: row.description || "",
        status: row.status,
        priority: row.priority,
        dueDate: formatDateValue(row.due_date),
        createdAt: formatDateTimeValue(row.created_at)
    };
}

function validateTask(data) {
    const statuses = ["To Do", "In Progress", "Done"];
    const priorities = ["Low", "Medium", "High"];

    if (!data.title || !data.title.trim()) {
        return "Title is required";
    }

    if (!statuses.includes(data.status)) {
        return "Invalid status";
    }

    if (!priorities.includes(data.priority)) {
        return "Invalid priority";
    }

    return null;
}

app.get("/api/tasks", (req, res) => {
    const sql = "SELECT * FROM tasks ORDER BY created_at DESC";

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        res.json(results.map(mapTask));
    });
});

app.get("/api/tasks/:id", (req, res) => {
    const sql = "SELECT * FROM tasks WHERE id = ?";

    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json(mapTask(results[0]));
    });
});

app.post("/api/tasks", (req, res) => {
    const task = {
        title: req.body.title,
        description: req.body.description || "",
        status: req.body.status || "To Do",
        priority: req.body.priority || "Medium",
        dueDate: req.body.dueDate || null
    };

    const validationError = validateTask(task);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const sql = `
        INSERT INTO tasks
        (title, description, status, priority, due_date)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [task.title.trim(), task.description, task.status, task.priority, task.dueDate],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            db.query(
                "SELECT * FROM tasks WHERE id = ?",
                [result.insertId],
                (selectErr, results) => {
                    if (selectErr) {
                        return res.status(500).json({ message: "Database error" });
                    }

                    res.status(201).json(mapTask(results[0]));
                }
            );
        }
    );
});

app.put("/api/tasks/:id", (req, res) => {
    const task = {
        title: req.body.title,
        description: req.body.description || "",
        status: req.body.status,
        priority: req.body.priority,
        dueDate: req.body.dueDate || null
    };

    const validationError = validateTask(task);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const sql = `
        UPDATE tasks
        SET title = ?, description = ?, status = ?, priority = ?, due_date = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [task.title.trim(), task.description, task.status, task.priority, task.dueDate, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Database error" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Task not found" });
            }

            db.query(
                "SELECT * FROM tasks WHERE id = ?",
                [req.params.id],
                (selectErr, results) => {
                    if (selectErr) {
                        return res.status(500).json({ message: "Database error" });
                    }

                    res.json(mapTask(results[0]));
                }
            );
        }
    );
});

app.delete("/api/tasks/:id", (req, res) => {
    const sql = "DELETE FROM tasks WHERE id = ?";

    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json({ message: "Task deleted successfully" });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
