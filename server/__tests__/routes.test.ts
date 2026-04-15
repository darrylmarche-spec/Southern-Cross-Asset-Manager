/**
 * API route tests – Express routes tested in isolation via Supertest.
 *
 * The real DatabaseStorage (which needs a live PostgreSQL connection) is
 * replaced with InMemoryStorage so these tests run without any external
 * dependencies.
 *
 * Vitest hoists vi.mock() calls to the top of the file, which means any
 * variables referenced inside vi.mock() must also be hoisted with vi.hoisted().
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// ── Remaining imports (after mock is declared) ────────────────────────────────
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

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
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

  it('returns 400 when body is completely empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'alice', password: 'secret', role: 'admin' });
    app = await buildApp();
  });

  it('returns 200 with a list of users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('never exposes password in user list', async () => {
    const res = await request(app).get('/api/users');
    for (const user of res.body) {
      expect(user).not.toHaveProperty('password');
    }
  });
});

describe('POST /api/users', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('creates a user and returns username + role', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'newuser', role: 'member' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('newuser');
    expect(res.body.role).toBe('member');
  });

  it('assigns the default role "member" when role is omitted', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'norole' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('member');
  });

  it('assigns the hardcoded default password "password123"', async () => {
    await request(app).post('/api/users').send({ username: 'pwtest' });

    // Confirm via login that the created password is "password123"
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'pwtest', password: 'password123' });
    expect(loginRes.status).toBe(200);
  });

  it('returns 409 when the username already exists', async () => {
    await request(app).post('/api/users').send({ username: 'dupe' });
    const res = await request(app).post('/api/users').send({ username: 'dupe' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app).post('/api/users').send({ role: 'member' });
    expect(res.status).toBe(400);
  });

  it('never returns a password in the response', async () => {
    const res = await request(app).post('/api/users').send({ username: 'safe' });
    expect(res.body).not.toHaveProperty('password');
  });
});

describe('DELETE /api/users/:username', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    await inMemory.createUser({ username: 'regular', password: 'pw', role: 'member' });
    app = await buildApp();
  });

  it('deletes a regular user and returns success', async () => {
    const res = await request(app).delete('/api/users/regular');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 for the protected "admin" account', async () => {
    const res = await request(app).delete('/api/users/admin');
    expect(res.status).toBe(403);
  });

  it('returns 403 for the protected "darryl" account', async () => {
    const res = await request(app).delete('/api/users/darryl');
    expect(res.status).toBe(403);
  });

  it('is case-insensitive when protecting admin accounts ("Admin", "DARRYL")', async () => {
    const adminRes = await request(app).delete('/api/users/Admin');
    expect(adminRes.status).toBe(403);

    const darrylRes = await request(app).delete('/api/users/DARRYL');
    expect(darrylRes.status).toBe(403);
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

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

describe('GET /api/projects', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);

    // Project 1: assigned to "bob"
    await inMemory.createProject({ ...newProject(), assignedMembers: ['bob'] });
    // Project 2: unassigned
    await inMemory.createProject({ ...newProject(), commissionNumber: 'COM-002', assignedMembers: [] });

    app = await buildApp();
  });

  it('admin role receives all projects', async () => {
    const res = await request(app).get('/api/projects?role=admin');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('member role receives only projects they are assigned to', async () => {
    const res = await request(app).get('/api/projects?role=member&username=bob');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].assignedMembers).toContain('bob');
  });

  it('member with no assignments receives an empty list', async () => {
    const res = await request(app).get('/api/projects?role=member&username=nobody');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('documents the security issue: omitting username falls back to all projects', async () => {
    // This is a known security bug — documented as a regression test so any
    // intentional fix shows up here.
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2); // fallback: returns everything
  });
});

describe('POST /api/projects', () => {
  let app: express.Express;

  beforeEach(async () => {
    const inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('creates a project and returns it with an id', async () => {
    const res = await request(app).post('/api/projects').send(newProject());
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.customer).toBe('Acme');
  });
});

describe('PUT /api/projects/:id', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('updates an existing project', async () => {
    const created = await inMemory.createProject(newProject());
    const res = await request(app)
      .put(`/api/projects/${created.id}`)
      .send({ customer: 'Beta Corp' });
    expect(res.status).toBe(200);
    expect(res.body.customer).toBe('Beta Corp');
  });

  it('returns 404 for a non-existent project', async () => {
    const res = await request(app)
      .put('/api/projects/nonexistent')
      .send({ customer: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── Task States ─────────────────────────────────────────────────────────────

describe('POST /api/task-states/bulk', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('returns 400 when "states" is not an array', async () => {
    const res = await request(app)
      .post('/api/task-states/bulk')
      .send({ states: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when "states" key is missing', async () => {
    const res = await request(app).post('/api/task-states/bulk').send({});
    expect(res.status).toBe(400);
  });

  it('returns an empty array for an empty states array', async () => {
    const res = await request(app)
      .post('/api/task-states/bulk')
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
      .send({ states });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('PUT /api/task-states/:projectId/:uid', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
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
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('returns 404 when the composite key does not match', async () => {
    const res = await request(app)
      .put('/api/task-states/no-project/no-uid')
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });
});

// ─── Messages ────────────────────────────────────────────────────────────────

describe('POST /api/messages', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('creates a message and returns it with an id', async () => {
    const project = await inMemory.createProject(newProject());
    const res = await request(app).post('/api/messages').send({
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
});

describe('PUT /api/messages/:id/read', () => {
  let app: express.Express;
  let inMemory: InMemoryStorage;

  beforeEach(async () => {
    inMemory = new InMemoryStorage();
    wireStorage(inMemory);
    app = await buildApp();
  });

  it('marks the message as read and returns success', async () => {
    const project = await inMemory.createProject(newProject());
    const msg = await inMemory.createMessage({
      type: 'message',
      projectId: project.id,
      projectName: 'Escalator A',
      senderUsername: 'alice',
      subject: 'Hello',
      body: '',
      attachments: [],
      sentAt: new Date().toISOString(),
      read: false,
    });

    const res = await request(app).put(`/api/messages/${msg.id}/read`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm change persisted in the in-memory store
    const all = await inMemory.getAllMessages();
    const updated = all.find(m => m.id === msg.id);
    expect(updated!.read).toBe(true);
  });
});
