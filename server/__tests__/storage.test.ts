/**
 * Storage contract tests – run against InMemoryStorage (no real DB needed).
 *
 * These tests document the expected behaviour of the IStorage interface and
 * serve as a regression guard.  They should also be re-run against
 * DatabaseStorage in a CI environment that has a test PostgreSQL database.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from './in-memory-storage';

let storage: InMemoryStorage;

beforeEach(() => {
  storage = new InMemoryStorage();
});

// ─── Users ───────────────────────────────────────────────────────────────────

describe('getUserByUsername', () => {
  it('returns the user when the username matches exactly', async () => {
    await storage.createUser({ username: 'Alice', password: 'pw', role: 'member' });
    const found = await storage.getUserByUsername('Alice');
    expect(found).toBeDefined();
    expect(found!.username).toBe('Alice');
  });

  it('is case-insensitive', async () => {
    await storage.createUser({ username: 'Alice', password: 'pw', role: 'member' });
    expect(await storage.getUserByUsername('alice')).toBeDefined();
    expect(await storage.getUserByUsername('ALICE')).toBeDefined();
    expect(await storage.getUserByUsername('aLiCe')).toBeDefined();
  });

  it('returns undefined for a non-existent username', async () => {
    const found = await storage.getUserByUsername('nobody');
    expect(found).toBeUndefined();
  });
});

describe('createUser', () => {
  it('returns the newly created user with an id', async () => {
    const user = await storage.createUser({ username: 'bob', password: 'secret', role: 'admin' });
    expect(user.id).toBeDefined();
    expect(user.username).toBe('bob');
    expect(user.role).toBe('admin');
  });

  it('throws when a duplicate username is created', async () => {
    await storage.createUser({ username: 'bob', password: 'pw1', role: 'member' });
    await expect(
      storage.createUser({ username: 'bob', password: 'pw2', role: 'member' }),
    ).rejects.toThrow();
  });
});

describe('getAllUsers', () => {
  it('returns all created users', async () => {
    await storage.createUser({ username: 'u1', password: 'pw', role: 'member' });
    await storage.createUser({ username: 'u2', password: 'pw', role: 'admin' });
    const all = await storage.getAllUsers();
    expect(all).toHaveLength(2);
  });

  it('returns an empty array when no users exist', async () => {
    const all = await storage.getAllUsers();
    expect(all).toHaveLength(0);
  });
});

describe('deleteUser', () => {
  it('removes the user from storage', async () => {
    await storage.createUser({ username: 'toDelete', password: 'pw', role: 'member' });
    await storage.deleteUser('toDelete');
    expect(await storage.getUserByUsername('toDelete')).toBeUndefined();
  });

  it('is a no-op for non-existent usernames', async () => {
    await expect(storage.deleteUser('ghost')).resolves.toBeUndefined();
  });

  it('is case-insensitive', async () => {
    await storage.createUser({ username: 'CaseUser', password: 'pw', role: 'member' });
    await storage.deleteUser('caseuser');
    expect(await storage.getUserByUsername('CaseUser')).toBeUndefined();
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

const baseProject = () => ({
  customer: 'Acme',
  projectName: 'Escalator 1',
  location: 'Sydney',
  commissionNumber: 'COM-001',
  escalatorType: 'Escalator',
  dateOfCompletion: '',
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'admin',
  assignedMembers: [] as string[],
});

describe('createProject', () => {
  it('returns the project with an assigned id', async () => {
    const p = await storage.createProject(baseProject());
    expect(p.id).toBeDefined();
    expect(p.customer).toBe('Acme');
  });

  it('defaults assignedMembers to an empty array', async () => {
    const p = await storage.createProject(baseProject());
    expect(p.assignedMembers).toEqual([]);
  });
});

describe('updateProject', () => {
  it('merges updates without changing the id', async () => {
    const p = await storage.createProject(baseProject());
    const updated = await storage.updateProject(p.id, { customer: 'Beta Corp' });
    expect(updated).toBeDefined();
    expect(updated!.id).toBe(p.id);
    expect(updated!.customer).toBe('Beta Corp');
  });

  it('returns undefined for a non-existent project id', async () => {
    const result = await storage.updateProject('nonexistent', { customer: 'X' });
    expect(result).toBeUndefined();
  });
});

describe('deleteProject (cascade)', () => {
  it('removes the project and all related task states, reports, and messages', async () => {
    const project = await storage.createProject(baseProject());
    const pid = project.id;

    await storage.createTaskState({
      uid: '0.1', projectId: pid, status: 'pending',
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [], commentHistory: [],
    });
    await storage.createReport({
      projectId: pid, submittedBy: 'admin', submittedAt: '2024-01-01T00:00:00Z',
      type: 'generate', content: '', notes: '', subject: '', status: 'pending',
    });
    await storage.createMessage({
      type: 'message', projectId: pid, projectName: 'Escalator 1',
      senderUsername: 'admin', subject: 'Hello', body: '',
      attachments: [], sentAt: '2024-01-01T00:00:00Z', read: false,
    });

    await storage.deleteProject(pid);

    expect(await storage.getProjectById(pid)).toBeUndefined();
    expect(await storage.getTaskStatesByProjectId(pid)).toHaveLength(0);
    expect(await storage.getReportsByProjectId(pid)).toHaveLength(0);
    expect(await storage.getAllMessages()).toHaveLength(0);
  });

  it('does not affect data belonging to other projects', async () => {
    const p1 = await storage.createProject(baseProject());
    const p2 = await storage.createProject({ ...baseProject(), commissionNumber: 'COM-002' });

    await storage.createTaskState({
      uid: '1.1', projectId: p2.id, status: 'pending',
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [], commentHistory: [],
    });

    await storage.deleteProject(p1.id);

    const remaining = await storage.getTaskStatesByProjectId(p2.id);
    expect(remaining).toHaveLength(1);
  });
});

// ─── Task States ─────────────────────────────────────────────────────────────

describe('bulkCreateTaskStates', () => {
  it('returns an empty array when given an empty array', async () => {
    const result = await storage.bulkCreateTaskStates([]);
    expect(result).toEqual([]);
  });

  it('creates all supplied task states', async () => {
    const project = await storage.createProject(baseProject());
    const states = ['0.1', '0.2', '0.3'].map(uid => ({
      uid, projectId: project.id, status: 'pending' as const,
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [] as any[], commentHistory: [] as any[],
    }));
    const created = await storage.bulkCreateTaskStates(states);
    expect(created).toHaveLength(3);
    expect(created.map(s => s.uid)).toEqual(['0.1', '0.2', '0.3']);
  });
});

describe('updateTaskState', () => {
  it('updates the matching task state by composite key (projectId + uid)', async () => {
    const project = await storage.createProject(baseProject());
    await storage.createTaskState({
      uid: '0.1', projectId: project.id, status: 'pending',
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [], commentHistory: [],
    });

    const updated = await storage.updateTaskState(project.id, '0.1', { status: 'completed' });
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('completed');
  });

  it('does not change the id field even if provided in updates', async () => {
    const project = await storage.createProject(baseProject());
    const created = await storage.createTaskState({
      uid: '0.1', projectId: project.id, status: 'pending',
      assignedTo: '', dueDate: '', actDuration: '', actLabor: '',
      comments: '', response: '', remarks: '', completedBy: '', completedAt: '',
      attachments: [], commentHistory: [],
    });

    const updated = await storage.updateTaskState(project.id, '0.1', {
      id: 'INJECTED_ID',
      status: 'completed',
    } as any);
    expect(updated!.id).toBe(created.id);
    expect(updated!.id).not.toBe('INJECTED_ID');
  });

  it('returns undefined when the composite key does not match', async () => {
    const result = await storage.updateTaskState('no-project', 'no-uid', { status: 'completed' });
    expect(result).toBeUndefined();
  });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

describe('markMessageRead', () => {
  it('sets read to true for the specified message', async () => {
    const project = await storage.createProject(baseProject());
    const msg = await storage.createMessage({
      type: 'message', projectId: project.id, projectName: 'Escalator 1',
      senderUsername: 'alice', subject: 'Hi', body: '',
      attachments: [], sentAt: '2024-01-01T00:00:00Z', read: false,
    });
    expect(msg.read).toBe(false);

    await storage.markMessageRead(msg.id);

    const all = await storage.getAllMessages();
    const found = all.find(m => m.id === msg.id);
    expect(found!.read).toBe(true);
  });

  it('is a no-op for an unknown message id', async () => {
    await expect(storage.markMessageRead('unknown')).resolves.toBeUndefined();
  });
});
