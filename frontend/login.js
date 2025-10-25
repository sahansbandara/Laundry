import { saveAuth } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = (fd.get('email') || fd.get('username') || '').trim();
    const password = (fd.get('password') || '').trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });

      if (res.ok) {
        const data = await res.json(); // expect: { token, user: { role } }
        saveAuth(data);
        if (data?.user?.role === 'ADMIN') {
          window.location.href = '/frontend/dashboard-admin.html';
        } else {
          window.location.href = '/frontend/dashboard-user.html';
        }
        return;
      }
    } catch (err) {
      console.warn('Auth API unreachable, using demo fallback');
    }

    // Demo fallback (offline)
    const DEMO = {
      'admin@smartfold.lk': { id: 1, role: 'ADMIN', name: 'Admin' },
      'nimal@smartfold.lk': { id: 2, role: 'CUSTOMER', name: 'Nimal' },
      'ruwan@smartfold.lk': { id: 3, role: 'CUSTOMER', name: 'Ruwan' },
      'kamal@smartfold.lk': { id: 4, role: 'CUSTOMER', name: 'Kamal' },
    };

    const match = DEMO[email];
    if (match && password === '1234') {
      saveAuth({
        token: 'demo-' + Math.random().toString(36).slice(2),
        user: { email, ...match },
      });
      window.location.href =
        match.role === 'ADMIN'
          ? '/frontend/dashboard-admin.html'
          : '/frontend/dashboard-user.html';
      return;
    }

    alert('Invalid credentials');
  });
});
