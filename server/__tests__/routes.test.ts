/**
 * API route tests – Express routes tested in isolation via Supertest.
 *
 * The real DatabaseStorage (which needs a live PostgreSQL connection) is
 * replaced with InMemoryStorage so these tests run without any external
 * dependencies.
 *
 * Since Fix #2 added session-based authentication, every test suite must
 * log in first and pass the resulting session cookie to protected requests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import session from 'express-session';

// ── Hoist the mock so its reference is available inside vi.mock() ─────────────
const storageMock = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  getAllUsers: vi.fn(),
  deleteUser: vi.fn(),
  seedDefaults: vi.fn(),
  getAllProjects: vi.fn(),
  getProjectById: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getTaskStatesByProjectId: vi.fn(),
  getAllTaskStates: vi.fn(),
  createTaskState: vi.fn(),
  bulkCreateTaskStates: vi.fn(),
  updateTaskState: vi.fn(),
  getAllReports: vi.fn(),
  getReportsByProjectId: vi.fn(),
  createReport: vi.fn(),
  updateReport: vi.fn(),
  getAllMessages: vi.fn(),
  createMessage: vi.fn(),
  markMessageRead: vi.fn(),
}));

vi.mock('../storage', () => ({ storage: storageMock }));

// ── Remaining imports ─────────────────────────────────────────────────────────
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '../routes';
import { InMemoryStorage } from './in-memory-storage';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wire every method on storageMock to delegate to a fresh InMemoryStorage. */
function wireStorage(inMemory: InMemoryStorage) {
  for (const key of Object.keys(storageMock) as (keyof typeof storageMock)[]) {
    (storageMock[key] as ReturnType<typeof vi.fn>).mockImplementation(
      (...args: unknown[]) => (inMemory as any)[key](...args),
    );
  }
}

/** Build a minimal Express app with session middleware (MemoryStore) + routes. */
async function buildApp() {
  const app = express();
  app.use(express.json());
  // Use default MemoryStore (no DB needed for tests).
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  await registerRoutes(app);
  return app;
}

/**
 * Log in and return the Set-Cookie header so subsequent requests can
 * include the session cookie.
 */
async function loginAs(
  app: express.Express,
  username: string,
  password: string,
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  // Supertest returns Set-Cookie as a string array; join for use with .set()
  return (res.headers['set-cookie'] as string[] | undefined)?.join('; ') ?? '';
}

const newProject = () => ({
  customer: 'Acme',
  projectName: 'Escalator A',
  location: 'Melbourne',
  commissionNumber: 'COM-001',
  escalatorType: 'Escalator',
  dateOfCompletion: '',
  createdAt: new Date().toISOString(),
  createdBy: 'admin',
  assignedMembers: [] as string[],
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    // createUser hashes the password, so login must use the same plaintext.
    await inMemory.createUser({ username: 'alice', password: 'correct', role: 'admin' });
    app = await buildApp();
  });

  it('returns 200 with username and role on correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'correct' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.role).toBe('admin');
  });

  it('sets a session cookie on success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'correct' });

    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('never returns the password in the response', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'correct' });

    expect(res.body).not.toHaveProperty('password');
  });

  it('returns 401 for a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for a non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'pw' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'correct' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'alice', password: 'pw', role: 'admin' });
    app = await buildApp();
  });

  it('returns success and clears the session', async () => {
    const cookie = await loginAs(app, 'alice', 'pw');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('protected routes return 401 after logout', async () => {
    const cookie = await loginAs(app, 'alice', 'pw');
    await request(app).post('/api/auth/logout').set('Cookie', cookie);

    const res = await request(app).get('/api/users').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

// ── requireAuth guard ─────────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('returns 401 for protected routes without a session', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  let app: express.Express;
  let cookie: string;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'alice', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'alice', 'pw');
  });

  it('returns 200 with a list of users', async () => {
    const res = await request(app).get('/api/users').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('never exposes password in user list', async () => {
    const res = await request(app).get('/api/users').set('Cookie', cookie);
    for (const user of res.body) {
      expect(user).not.toHaveProperty('password');
    }
  });
});

describe('POST /api/users', () => {
  let app: express.Express;
  let cookie: string;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'adminpw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'adminpw');
  });

  it('creates a user and returns username + role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ username: 'newuser', role: 'member' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('newuser');
    expect(res.body.role).toBe('member');
  });

  it('assigns the default role "member" when role is omitted', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ username: 'norole' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('member');
  });

  it('new user can log in with the default password "password123"', async () => {
    await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ username: 'pwtest' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'pwtest', password: 'password123' });
    expect(loginRes.status).toBe(200);
  });

  it('returns 409 when the username already exists', async () => {
    await request(app).post('/api/users').set('Cookie', cookie).send({ username: 'dupe' });
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ username: 'dupe' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ role: 'member' });
    expect(res.status).toBe(400);
  });

  it('never returns a password in the response', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Cookie', cookie)
      .send({ username: 'safe' });
    expect(res.body).not.toHaveProperty('password');
  });
});

describe('DELETE /api/users/:username', () => {
  let app: express.Express;
  let cookie: string;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'adminuser', password: 'adminpw', role: 'admin' });
    await inMemory.createUser({ username: 'regular', password: 'pw', role: 'member' });
    app = await buildApp();
    cookie = await loginAs(app, 'adminuser', 'adminpw');
  });

  it('deletes a regular user and returns success', async () => {
    const res = await request(app)
      .delete('/api/users/regular')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 for the protected "admin" account', async () => {
    const res = await request(app)
      .delete('/api/users/admin')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('returns 403 for the protected "darryl" account', async () => {
    const res = await request(app)
      .delete('/api/users/darryl')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('is case-insensitive when protecting admin accounts ("Admin", "DARRYL")', async () => {
    expect((await request(app).delete('/api/users/Admin').set('Cookie', cookie)).status).toBe(403);
    expect((await request(app).delete('/api/users/DARRYL').set('Cookie', cookie)).status).toBe(403);
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createProject({ ...newProject(), assignedMembers: ['bob'] });
    await inMemory.createProject({ ...newProject(), commissionNumber: 'COM-002', assignedMembers: [] });
  });

  it('admin session receives all projects (Fix #3)', async () => {
    await inMemory.createUser({ username: 'adminuser', password: 'pw', role: 'admin' });
    app = await buildApp();
    const cookie = await loginAs(app, 'adminuser', 'pw');

    const res = await request(app).get('/api/projects').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('member session receives only assigned projects (Fix #3)', async () => {
    await inMemory.createUser({ username: 'bob', password: 'pw', role: 'member' });
    app = await buildApp();
    const cookie = await loginAs(app, 'bob', 'pw');

    const res = await request(app).get('/api/projects').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].assignedMembers).toContain('bob');
  });

  it('unauthenticated request returns 401 (role-bypass is fixed)', async () => {
    app = await buildApp();
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/projects', () => {
  let app: express.Express;
  let cookie: string;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'pw');
  });

  it('creates a project and returns it with an id', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .send(newProject());
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.customer).toBe('Acme');
  });

  it('returns 400 when required fields are missing (Fix #8)', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .send({ customer: 'Missing fields' }); // no projectName, location, etc.
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/projects/:id', () => {
  let app: express.Express;
  let cookie: string;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'pw');
  });

  it('updates an existing project', async () => {
    const created = await inMemory.createProject(newProject());
    const res = await request(app)
      .put(`/api/projects/${created.id}`)
      .set('Cookie', cookie)
      .send({ customer: 'Beta Corp' });
    expect(res.status).toBe(200);
    expect(res.body.customer).toBe('Beta Corp');
  });

  it('returns 404 for a non-existent project', async () => {
    const res = await request(app)
      .put('/api/projects/nonexistent')
      .set('Cookie', cookie)
      .send({ customer: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── Task States ─────────────────────────────────────────────────────────────

describe('POST /api/task-states/bulk', () => {
  let app: express.Express;
  let cookie: string;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'pw');
  });

  it('returns 400 when "states" is not an array', async () => {
    const res = await request(app)
      .post('/api/task-states/bulk')
      .set('Cookie', cookie)
      .send({ states: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when "states" key is missing', async () => {
    const res = await request(app)
      .post('/api/task-states/bulk')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns an empty array for an empty states array', async () => {
    const res = await request(app)
      .post('/api/task-states/bulk')
      .set('Cookie', cookie)
      .send({ states: [] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates all supplied task states', async () => {
    const project = await inMemory.createProject(newProject());
    const states = ['0.1', '0.2'].map(uid => ({
      uid,
      projectId: project.id,
      status: 'pending',
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [], commentHistory: [],
    }));

    const res = await request(app)
      .post('/api/task-states/bulk')
      .set('Cookie', cookie)
      .send({ states });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('PUT /api/task-states/:projectId/:uid', () => {
  let app: express.Express;
  let cookie: string;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'pw');
  });

  it('updates a task state by composite key', async () => {
    const project = await inMemory.createProject(newProject());
    await inMemory.createTaskState({
      uid: '0.1', projectId: project.id, status: 'pending',
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [], commentHistory: [],
    });

    const res = await request(app)
      .put(`/api/task-states/${project.id}/0.1`)
      .set('Cookie', cookie)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('returns 404 when the composite key does not match', async () => {
    const res = await request(app)
      .put('/api/task-states/no-project/no-uid')
      .set('Cookie', cookie)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });
});

// ─── Messages ────────────────────────────────────────────────────────────────

describe('POST /api/messages', () => {
  let app: express.Express;
  let cookie: string;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'pw');
  });

  it('creates a message and returns it with id and read:false', async () => {
    const project = await inMemory.createProject(newProject());
    const res = await request(app)
      .post('/api/messages')
      .set('Cookie', cookie)
      .send({
        type: 'message',
        projectId: project.id,
        projectName: 'Escalator A',
        senderUsername: 'alice',
        subject: 'Hello',
        body: 'Test body',
        attachments: [],
        sentAt: new Date().toISOString(),
        read: false,
      });
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.read).toBe(false);
  });

  it('returns 400 when required message fields are missing (Fix #8)', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Cookie', cookie)
      .send({ subject: 'Missing required fields' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/messages/:id/read', () => {
  let app: express.Express;
  let cookie: string;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'admin', password: 'pw', role: 'admin' });
    app = await buildApp();
    cookie = await loginAs(app, 'admin', 'pw');
  });

  it('marks the message as read and returns success', async () => {
    const project = await inMemory.createProject(newProject());
    const msg = await inMemory.createMessage({
      type: 'message', projectId: project.id, projectName: 'Escalator A',
      senderUsername: 'alice', subject: 'Hello', body: '',
      attachments: [], sentAt: new Date().toISOString(), read: false,
    });

    const res = await request(app)
      .put(`/api/messages/${msg.id}/read`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const all = await inMemory.getAllMessages();
    expect(all.find(m => m.id === msg.id)!.read).toBe(true);
  });
});
