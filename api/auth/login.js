const USERS = [
  { username: "Admin", password: "admin123", role: "admin" },
  { username: "Darryl", password: "darryl123", role: "admin" },
  { username: "TeamMember1", password: "password123", role: "member" },
  { username: "TeamMember2", password: "password123", role: "member" },
  { username: "TeamMember3", password: "password123", role: "member" },
];

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = USERS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  return res.json({ username: user.username, role: user.role });
}
