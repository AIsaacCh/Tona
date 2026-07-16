export function authHeaders() {
  const token = localStorage.getItem("tona_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}