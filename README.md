# 10X CRM

10X CRM is a browser-based customer relationship management demo for sales managers. It includes registration, login, a protected dashboard, a client database, profile settings, local persistence, and a clean responsive interface.

## How to run

Run the folder through a small local server, then open `index.html`.




## Main features

- Sign up with six validation rules: name, email, phone, company, password strength, and password confirmation.
- Login with exact error feedback: `Invalid email or password`.
- Auth guard on protected pages and logout from the shared sidebar.
- Dashboard with greeting, live clock, four sales stats, pipeline distribution, and recent clients.
- Clients page with loading state, API fetch, fallback seed data, localStorage persistence, add/edit/delete, search, status chips, sorting, details modal, notes, reminders, call timer, and CSV export.
- Client add/edit/delete use POST, PUT, and DELETE requests before updating local data.
- Profile page with editable user details, password change, and reset data action.
- Theme preference saved as `crm_theme`.

## Storage keys

- `crm_users`: registered users.
- `crm_session`: active session in localStorage or sessionStorage, depending on Remember me.
- `crm_clients`: client records.
- `crm_theme`: light or dark theme.

## Technical notes

The project uses plain HTML, CSS, and JavaScript modules. Data is stored in browser storage because this exam project does not require a real backend. The clients page uses `fetch`, `async/await`, `try/catch`, and `response.ok`; if the remote API is not available, a local seed list is used so the app still works.

## Demo flow

1. Create an account from `signup.html`.
2. The app redirects to `dashboard.html`.
3. Open `clients.html`, add a client, change status, view details, add notes, and delete a client.
4. Open `profile.html`, edit profile details or change the password.
5. Log out and sign in again to confirm the data is still saved.
