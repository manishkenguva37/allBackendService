import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import Pusher from "pusher";
import pkg from "pg";

const { Pool } = pkg;
import myMiddleware from "./MIDDLEWARE/organsationMiddleware"
dotenv.config();

const app = express();
const port = 3000;

// ================= MIDDLEWARE =================

// Global JSON (for normal routes)
app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-org-name", "x-org-secret"],
}));

// ================= DATABASE =================

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pool = new Pool({
  host: PGHOST,
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

// ================= PUSHER =================

const pusher = new Pusher({
  appId: "2115469",
  key: "7666f32ac3b90070c7fa",
  secret: "e9d0d0296f19e92df9a0",
  cluster: "ap2",
  useTLS: true,
});

// ================= CRYPTO =================

async function decryptHeader(base64Ciphertext) {
  try {
    if (!base64Ciphertext || typeof base64Ciphertext !== "string") {
      throw new Error("Invalid ciphertext: must be a non-empty string");
    }

    const enc = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(process.env.NODEHANDLER),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("org-credentials-salt"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const combined = Uint8Array.from(atob(base64Ciphertext), c => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);

  } catch (err) {
    console.error("❌ Decryption failed:", err.message);
    throw err;
  }
}

// ================= ROUTES =================

// Health
app.get("/", (req, res) => {
  res.json({ status: "OK" });
});


app.use(myMiddleware);

app.post("/auth/signup", async (req, res) => {
  try {
    const encOrgName = req.headers["x-org-name"];
    const encOrgSecret = req.headers["x-org-secret"];

    if (!encOrgName || !encOrgSecret) {
      return res.status(400).json({
        success: false,
        message: "Missing org headers",
      });
    }

    // 🔐 Decrypt headers
    let orgName, orgSecret;

    try {
      orgName = await decryptHeader(encOrgName);
      orgSecret = await decryptHeader(encOrgSecret);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Header decryption failed",
      });
    }

    // ✅ Validate org
    const orgCheck = await pool.query(
      `SELECT * FROM organizationsvalidation 
       WHERE organizationname = $1 AND organizationsecret = $2`,
      [orgName, orgSecret]
    );

    if (orgCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid organisation credentials",
      });
    }

    // 🔐 Decrypt BODY (NOW FIXED)
    let userData;

    try {
     const encryptedBody = req.body?.data; // ✅ now STRING

      const decrypted = await decryptHeader(encryptedBody);
      userData = JSON.parse(decrypted);

    } catch (err) {
      console.error("Body decrypt error:", err.message);

      return res.status(400).json({
        success: false,
        message: "Invalid encrypted body",
      });
    }

    const { email, password, name } = userData;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & password required",
      });
    }

    // 👉 (Optional) Insert user
    // TODO: hash password before saving

    await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)`,
      [name || "", email, password] // ⚠️ hash later
    );

    res.json({
      success: true,
      message: "Signup successful",
    });

  } catch (err) {
  console.error("Signup error:", err);

  // 🔥 USER ALREADY EXISTS
  if (err.code === "42703") {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  // 🔴 OTHER ERRORS
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
});

// ================= OTHER ROUTES =================

app.get("/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM messages ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/messages", async (req, res) => {
  const { title, description } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO messages (title, description)
       VALUES ($1, $2) RETURNING *`,
      [title, description]
    );

    const newMessage = result.rows[0];

    await pusher.trigger("notifications", "new-message", {
      user: newMessage.title,
      message: newMessage.description,
    });

    res.json(newMessage);

  } catch {
    res.status(500).json({ error: "Insert error" });
  }
});

// ================= START =================

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});