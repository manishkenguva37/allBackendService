import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import Pusher from "pusher";
import pkg from "pg";

const { Pool } = pkg;

dotenv.config();

const app = express();
const port = 3000;

// ✅ CORS FIX (important for Codespaces)
// app.use(cors({
//   origin: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"]
// }));
// app.options("*", cors());
// app.use(cors({
//   origin: "*",
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));

app.use(cors({
  origin: "*",
}));
app.use(cors());
app.use(express.json());
// VERY IMPORTANT for preflight requests
// app.options("*", (req, res) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   res.sendStatus(200);
// });


// ✅ DATABASE CONNECTION
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pool = new Pool({
  host: PGHOST,
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ✅ PUSHER CONFIG
const pusher = new Pusher({
  appId: "2115469",
  key: "7666f32ac3b90070c7fa",
  secret: "e9d0d0296f19e92df9a0",
  cluster: "ap2",
  useTLS: true,
});

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.json({ status: "Server is working ✅" });
});

// 🟢 GET all messages
app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
});

// 🔵 CREATE message + send realtime
app.post("/messages", async (req, res) => {
  const { title, description } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [title, description]
    );

    const newMessage = result.rows[0];

    // 🔔 SEND REALTIME EVENT
    await pusher.trigger("notifications", "new-message", {
      user: newMessage.title,
      message: newMessage.description,
    });

    res.json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Insert error" });
  }
});

// ================= START SERVER =================

// app.listen(port, () => {
//   console.log(`🚀 Server running on port ${port}`);
// });

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});



















// import express from "express";
// import dotenv from "dotenv";
// import cors from "cors";
// import Pusher from "pusher";
// import pkg from "pg";

// const { Pool } = pkg;

// dotenv.config();

// const app = express();
// const port = 3000;

// // middleware
// // app.use(cors({
// //   origin: "*",   // allow all origins (for dev)
// // }));
// app.use(cors({
//   origin: true,   // allow all origins dynamically
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// }));

// // VERY IMPORTANT for preflight
// app.options("*", cors());
// app.use(express.json());

// // database connection
// const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

// const pool = new Pool({
//   host: PGHOST,
//   database: PGDATABASE,
//   user: PGUSER,
//   password: PGPASSWORD,
//   port: 5432,
//   ssl: {
//     rejectUnauthorized: true,
//   },
// });

// // Pusher config
// const pusher = new Pusher({
//   appId: "2115469",
//   key: "7666f32ac3b90070c7fa",
//   secret: "e9d0d0296f19e92df9a0",
//   cluster: "ap2",
//   useTLS: true,
// });


// // 🟢 GET all messages
// app.get("/messages", async (req, res) => {
//   try {
//     const result = await pool.query(
//       "SELECT * FROM messages ORDER BY created_at DESC"
//     );
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "DB error" });
//   }
// });


// // 🔵 CREATE message + trigger pusher
// app.post("/messages", async (req, res) => {
//   const { title, description } = req.body;

//   try {
//     const result = await pool.query(
//       `INSERT INTO messages (title, description)
//        VALUES ($1, $2)
//        RETURNING *`,
//       [title, description]
//     );

//     const newMessage = result.rows[0];

//     // 🔔 send realtime event
//     await pusher.trigger("my-channel", "my-event", newMessage);

//     res.json(newMessage);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Insert error" });
//   }
// });


// // 🟡 UPDATE message
// app.put("/messages/:id", async (req, res) => {
//   const { id } = req.params;
//   const { title, description } = req.body;

//   try {
//     const result = await pool.query(
//       `UPDATE messages
//        SET title=$1, description=$2, updated_at=CURRENT_TIMESTAMP
//        WHERE id=$3
//        RETURNING *`,
//       [title, description, id]
//     );

//     res.json(result.rows[0]);
//   } catch (err) {
//     res.status(500).json({ error: "Update failed" });
//   }
// });


// // 🔴 DELETE message
// app.delete("/messages/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     await pool.query("DELETE FROM messages WHERE id=$1", [id]);
//     res.json({ success: true });
//   } catch (err) {
//     res.status(500).json({ error: "Delete failed" });
//   }
// });


// app.listen(port, () => {
//   console.log(`🚀 Server running on http://localhost:${port}`);
// });



// // app.get('/', async (req, res) => {
// //   // Acquire a dedicated client connection from the pool
// //   // client.query() with manual release: Best for multiple queries or transactions
// //   // ✅ Reuses same connection (more efficient)
// //   // ✅ Avoids creating separate connections for each query
// //   const client = await pool.connect()
// //   try {
// //     // First query: INSERT into posts table
// //     await client.query("INSERT INTO posts (id, title, description) VALUES (1, 'First Post', 'Description First post')")
    
// //     // Second query: SELECT all posts
// //     // Both queries run on the same client connection - no overhead of reconnecting
// //     const result = await client.query('SELECT * FROM posts')
// //     res.json(result.rows)
// //   } catch (error) {
// //     console.log(error)
// //     res.status(500).json({ error: 'Database error' })
// //   } finally {
// //     // Manually release the client back to the pool when done
// //     // This ensures the connection can be reused by other requests
// //     client.release()
// //   }
// // })