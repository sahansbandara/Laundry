import { saveAuth } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const emailOrUsername = fd.get('email') || fd.get('username');
    const payload = {
      username: emailOrUsername,
      email: emailOrUsername,
      password: fd.get('password'),
    };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Invalid credentials');

      // Expect JSON like: { token, user: { role: 'ADMIN' | 'CUSTOMER', ... } }
      const data = await res.json();
      saveAuth(data);

      // If you need role-based routing keep it, but default to place-order for user
      if (data?.user?.role === 'ADMIN') {
        window.location.href = '/frontend/dashboard-admin.html';
      } else {
        window.location.href = '/frontend/place-order.html'; // ✅ new landing
      }
    } catch (err) {
      alert(err.message || 'Login failed');
    }
  });
});
