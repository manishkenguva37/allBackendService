app.get('/', async (req, res) => {
  // Acquire a dedicated client connection from the pool
  // client.query() with manual release: Best for multiple queries or transactions
  // ✅ Reuses same connection (more efficient)
  // ✅ Avoids creating separate connections for each query
  const client = await pool.connect()
  try {
    // First query: INSERT into posts table
    await client.query("INSERT INTO posts (id, title, description) VALUES (1, 'First Post', 'Description First post')")
    
    // Second query: SELECT all posts
    // Both queries run on the same client connection - no overhead of reconnecting
    const result = await client.query('SELECT * FROM posts')
    res.json(result.rows)
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Database error' })
  } finally {
    // Manually release the client back to the pool when done
    // This ensures the connection can be reused by other requests
    client.release()
  }
})