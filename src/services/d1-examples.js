/**
 * D1 Service — Usage Examples
 *
 * สำหรับอ้างอิงการใช้งาน Cloudflare D1 Database ผ่าน d1.js service
 *
 * Import:
 * import { query, execute, testConnection, getTables, tableExists } from "@/services/d1";
 */

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 1: Test Connection
══════════════════════════════════════════════════════════════════════ */

// ตรวจสอบว่าเชื่อมต่อ D1 ได้หรือไม่
async function checkConnection() {
  const result = await testConnection();
  if (result.success) {
    console.log("✓ D1 Connected");
  } else {
    console.error("✗ Connection failed:", result.error);
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 2: List All Tables
══════════════════════════════════════════════════════════════════════ */

// ดึงรายชื่อทุก table ใน database
async function listAllTables() {
  const result = await getTables();
  if (result.success) {
    console.log("Tables:", result.tables);
    // Output: ["users", "settings", "logs", ...]
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 3: Query Data (SELECT)
══════════════════════════════════════════════════════════════════════ */

// ดึงข้อมูล user ทั้งหมด
async function getAllUsers() {
  const result = await query("SELECT * FROM users");
  if (result.success) {
    const users = result.results;
    console.log("Found", users.length, "users");
    return users;
  }
}

// ดึง user ตาม ID (ใช้ prepared statement)
async function getUserById(userId) {
  const result = await query(
    "SELECT * FROM users WHERE id = ?",
    [userId]
  );
  if (result.success) {
    return result.results[0] || null;
  }
}

// ดึง user ด้วยหลายเงื่อนไข
async function searchUsers(name, status) {
  const result = await query(
    "SELECT * FROM users WHERE name LIKE ? AND status = ?",
    [`%${name}%`, status]
  );
  if (result.success) {
    return result.results;
  }
}

// ดึงข้อมูล JOIN ตาราง
async function getUserWithOrders(userId) {
  const result = await query(`
    SELECT u.*, o.id as order_id, o.total
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id = ?
  `, [userId]);
  if (result.success) {
    return result.results;
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 4: Insert Data
══════════════════════════════════════════════════════════════════════ */

// Insert ข้อมูลใหม่
async function insertUser(name, email, status) {
  const result = await execute(
    "INSERT INTO users (name, email, status, created_at) VALUES (?, ?, ?, ?)",
    [name, email, status, new Date().toISOString()]
  );
  if (result.success) {
    console.log("✓ User inserted");
  } else {
    console.error("Insert failed:", result.error);
  }
}

// Insert หลาย rows (transaction ต้องทำใน Worker โดยตรง)
async function insertMultipleUsers(users) {
  for (const user of users) {
    await execute(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [user.name, user.email]
    );
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 5: Update Data
══════════════════════════════════════════════════════════════════════ */

// Update ข้อมูล user
async function updateUserStatus(userId, newStatus) {
  const result = await execute(
    "UPDATE users SET status = ?, updated_at = ? WHERE id = ?",
    [newStatus, new Date().toISOString(), userId]
  );
  if (result.success) {
    console.log("✓ User updated");
  }
}

// Update หลาย fields
async function updateUserProfile(userId, data) {
  const result = await execute(
    "UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?",
    [data.name, data.email, data.phone, userId]
  );
  return result.success;
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 6: Delete Data
══════════════════════════════════════════════════════════════════════ */

// Delete user ตาม ID
async function deleteUser(userId) {
  const result = await execute(
    "DELETE FROM users WHERE id = ?",
    [userId]
  );
  if (result.success) {
    console.log("✓ User deleted");
  }
}

// Delete ด้วยเงื่อนไข
async function deleteOldLogs(beforeDate) {
  const result = await execute(
    "DELETE FROM logs WHERE created_at < ?",
    [beforeDate]
  );
  return result.success;
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 7: Check Table Exists
══════════════════════════════════════════════════════════════════════ */

// ตรวจสอบว่า table มีอยู่หรือไม่
async function ensureTableExists(tableName) {
  const exists = await tableExists(tableName);
  if (!exists) {
    console.log(`Table "${tableName}" does not exist`);
    // สร้าง table ใหม่ (ต้อง execute CREATE TABLE)
    await execute(`CREATE TABLE ${tableName} (id TEXT PRIMARY KEY, data JSON)`);
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 8: Aggregation Queries
══════════════════════════════════════════════════════════════════════ */

// นับจำนวน
async function countUsers() {
  const result = await query("SELECT COUNT(*) as count FROM users");
  if (result.success) {
    return result.results[0]?.count || 0;
  }
}

// หาค่าเฉลี่ย
async function getAverageOrderValue() {
  const result = await query(
    "SELECT AVG(total) as avg FROM orders WHERE status = 'completed'"
  );
  if (result.success) {
    return result.results[0]?.avg || 0;
  }
}

// Group by
async function getUsersByStatus() {
  const result = await query(`
    SELECT status, COUNT(*) as count
    FROM users
    GROUP BY status
  `);
  if (result.success) {
    return result.results;
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 9: Pagination
══════════════════════════════════════════════════════════════════════ */

// ดึงข้อมูลแบบหน้า
async function getUsersByPage(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const result = await query(
    "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [pageSize, offset]
  );
  if (result.success) {
    return result.results;
  }
}

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 10: React Component Usage
══════════════════════════════════════════════════════════════════════ */

/*
import React, { useState, useEffect } from "react";
import { query, execute } from "@/services/d1";

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const result = await query("SELECT * FROM users ORDER BY created_at DESC");
    if (result.success) {
      setUsers(result.results);
    }
    setLoading(false);
  }

  async function handleAddUser() {
    await execute(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      ["New User", "user@example.com"]
    );
    loadUsers(); // Reload
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleAddUser}>Add User</button>
      <ul>
        {users.map(u => (
          <li key={u.id}>{u.name} - {u.email}</li>
        ))}
      </ul>
    </div>
  );
}
*/

/* ═════════════════════════════════════════════════════════════════════
   EXAMPLE 11: Worker Direct Access (env.DB)
══════════════════════════════════════════════════════════════════════ */

/*
ใน Worker (apps/api-worker/src/worker.js) สามารถใช้ env.DB โดยตรง:

export default {
  async fetch(request, env, ctx) {
    // Query D1 โดยตรง (ไม่ต้องผ่าน API proxy)
    const { results } = await env.DB
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .all();

    // หรือใช้ first() สำหรับ 1 row
    const user = await env.DB
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first();

    // Execute INSERT/UPDATE/DELETE
    await env.DB
      .prepare("INSERT INTO logs (message) VALUES (?)")
      .bind("Hello")
      .run();

    return new Response(JSON.stringify({ user }));
  },
};
*/

export {
  checkConnection,
  listAllTables,
  getAllUsers,
  getUserById,
  searchUsers,
  insertUser,
  updateUserStatus,
  deleteUser,
  tableExists,
  countUsers,
  getUsersByPage,
};
