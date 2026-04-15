import { describe, it, expect } from 'vitest';
import {
  mapServerProject,
  mapServerTaskState,
  mapServerReport,
  mapServerMessage,
} from '../mappers';

// ─── mapServerProject ─────────────────────────────────────────────────────────

describe('mapServerProject', () => {
  it('maps camelCase server fields correctly', () => {
    const raw = {
      id: 'proj-1',
      customer: 'Acme',
      projectName: 'Escalator A',
      location: 'Sydney',
      commissionNumber: 'COM-001',
      escalatorType: 'Escalator',
      dateOfCompletion: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'admin',
      assignedMembers: ['alice', 'bob'],
    };

    const result = mapServerProject(raw);
    expect(result).toEqual({
      id: 'proj-1',
      customer: 'Acme',
      projectName: 'Escalator A',
      location: 'Sydney',
      commissionNumber: 'COM-001',
      escalatorType: 'Escalator',
      dateOfCompletion: '2024-12-31',
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'admin',
      assignedMembers: ['alice', 'bob'],
    });
  });

  it('falls back to snake_case field names', () => {
    const raw = {
      id: 'proj-2',
      customer: 'Beta',
      project_name: 'Escalator B',
      location: 'Melbourne',
      commission_number: 'COM-002',
      escalator_type: 'Moving Walk',
      date_of_completion: '',
      created_at: '2024-02-01T00:00:00Z',
      created_by: 'manager',
      assigned_members: ['carol'],
    };

    const result = mapServerProject(raw);
    expect(result.projectName).toBe('Escalator B');
    expect(result.commissionNumber).toBe('COM-002');
    expect(result.escalatorType).toBe('Moving Walk');
    expect(result.createdAt).toBe('2024-02-01T00:00:00Z');
    expect(result.createdBy).toBe('manager');
    expect(result.assignedMembers).toEqual(['carol']);
  });

  it('defaults escalatorType to "Escalator" when absent', () => {
    const result = mapServerProject({ id: 'x', customer: 'C', location: 'L' });
    expect(result.escalatorType).toBe('Escalator');
  });

  it('defaults assignedMembers to [] when absent', () => {
    const result = mapServerProject({ id: 'x' });
    expect(result.assignedMembers).toEqual([]);
  });

  it('defaults string fields to empty string when absent', () => {
    const result = mapServerProject({ id: 'x' });
    expect(result.customer).toBe('');
    expect(result.projectName).toBe('');
    expect(result.location).toBe('');
    expect(result.commissionNumber).toBe('');
    expect(result.dateOfCompletion).toBe('');
    expect(result.createdAt).toBe('');
    expect(result.createdBy).toBe('');
  });
});

// ─── mapServerTaskState ───────────────────────────────────────────────────────

describe('mapServerTaskState', () => {
  it('maps all camelCase fields', () => {
    const raw = {
      uid: '0.1',
      projectId: 'proj-1',
      status: 'completed',
      assignedTo: 'alice',
      dueDate: '2024-06-01',
      actDuration: '8',
      actLabor: '2',
      comments: 'Done',
      response: 'yes',
      remarks: 'All good',
      completedBy: 'alice',
      completedAt: '2024-06-01T12:00:00Z',
      attachments: [{ id: 'a1' }],
      commentHistory: [{ text: 'First comment' }],
    };

    const result = mapServerTaskState(raw);
    expect(result.uid).toBe('0.1');
    expect(result.projectId).toBe('proj-1');
    expect(result.status).toBe('completed');
    expect(result.assignedTo).toBe('alice');
    expect(result.response).toBe('yes');
    expect(result.attachments).toEqual([{ id: 'a1' }]);
    expect(result.commentHistory).toEqual([{ text: 'First comment' }]);
  });

  it('falls back to snake_case field names', () => {
    const raw = {
      uid: '1.1',
      project_id: 'proj-2',
      status: 'pending',
      assigned_to: 'bob',
      due_date: '2024-07-01',
      act_duration: '4',
      act_labor: '1',
      completed_by: '',
      completed_at: '',
      comment_history: [],
    };

    const result = mapServerTaskState(raw);
    expect(result.projectId).toBe('proj-2');
    expect(result.assignedTo).toBe('bob');
    expect(result.dueDate).toBe('2024-07-01');
    expect(result.actDuration).toBe('4');
    expect(result.actLabor).toBe('1');
  });

  it('defaults status to "pending" when absent', () => {
    const result = mapServerTaskState({ uid: '0.1', projectId: 'p1' });
    expect(result.status).toBe('pending');
  });

  it('defaults all optional string fields to empty string when absent', () => {
    const result = mapServerTaskState({ uid: '0.1' });
    expect(result.assignedTo).toBe('');
    expect(result.dueDate).toBe('');
    expect(result.actDuration).toBe('');
    expect(result.actLabor).toBe('');
    expect(result.comments).toBe('');
    expect(result.response).toBe('');
    expect(result.remarks).toBe('');
    expect(result.completedBy).toBe('');
    expect(result.completedAt).toBe('');
  });

  it('defaults attachments and commentHistory to [] when absent', () => {
    const result = mapServerTaskState({ uid: '0.1' });
    expect(result.attachments).toEqual([]);
    expect(result.commentHistory).toEqual([]);
  });
});

// ─── mapServerReport ──────────────────────────────────────────────────────────

describe('mapServerReport', () => {
  it('maps all camelCase fields', () => {
    const raw = {
      id: 'rpt-1',
      projectId: 'proj-1',
      submittedBy: 'admin',
      submittedAt: '2024-03-01T09:00:00Z',
      type: 'manual',
      content: 'Report body',
      notes: 'Some notes',
      subject: 'Monthly report',
      status: 'reviewed',
    };

    const result = mapServerReport(raw);
    expect(result).toEqual(raw);
  });

  it('falls back to snake_case field names', () => {
    const raw = {
      id: 'rpt-2',
      project_id: 'proj-2',
      submitted_by: 'manager',
      submitted_at: '2024-04-01T00:00:00Z',
      type: 'generate',
      status: 'pending',
    };

    const result = mapServerReport(raw);
    expect(result.projectId).toBe('proj-2');
    expect(result.submittedBy).toBe('manager');
    expect(result.submittedAt).toBe('2024-04-01T00:00:00Z');
  });

  it('defaults type to "generate" when absent', () => {
    const result = mapServerReport({ id: 'r1' });
    expect(result.type).toBe('generate');
  });

  it('defaults status to "pending" when absent', () => {
    const result = mapServerReport({ id: 'r1' });
    expect(result.status).toBe('pending');
  });
});

// ─── mapServerMessage ─────────────────────────────────────────────────────────

describe('mapServerMessage', () => {
  it('maps all camelCase fields', () => {
    const raw = {
      id: 'msg-1',
      type: 'parts_request',
      projectId: 'proj-1',
      projectName: 'Escalator A',
      senderUsername: 'alice',
      subject: 'Parts needed',
      body: 'Please send part X',
      attachments: [],
      sentAt: '2024-05-01T08:00:00Z',
      read: true,
    };

    const result = mapServerMessage(raw);
    expect(result).toEqual(raw);
  });

  it('falls back to snake_case field names', () => {
    const raw = {
      id: 'msg-2',
      type: 'message',
      project_id: 'proj-3',
      project_name: 'Escalator B',
      sender_username: 'bob',
      subject: 'Hi',
      sent_at: '2024-05-02T00:00:00Z',
      read: false,
    };

    const result = mapServerMessage(raw);
    expect(result.projectId).toBe('proj-3');
    expect(result.projectName).toBe('Escalator B');
    expect(result.senderUsername).toBe('bob');
    expect(result.sentAt).toBe('2024-05-02T00:00:00Z');
  });

  it('defaults type to "message" when absent', () => {
    const result = mapServerMessage({ id: 'm1' });
    expect(result.type).toBe('message');
  });

  it('defaults read to false when absent', () => {
    const result = mapServerMessage({ id: 'm1' });
    expect(result.read).toBe(false);
  });

  it('correctly maps read: true (does not coerce to false)', () => {
    const result = mapServerMessage({ id: 'm1', read: true });
    expect(result.read).toBe(true);
  });

  it('defaults body and string fields to empty string when absent', () => {
    const result = mapServerMessage({ id: 'm1' });
    expect(result.projectId).toBe('');
    expect(result.projectName).toBe('');
    expect(result.senderUsername).toBe('');
    expect(result.subject).toBe('');
    expect(result.body).toBe('');
    expect(result.sentAt).toBe('');
  });

  it('defaults attachments to [] when absent', () => {
    const result = mapServerMessage({ id: 'm1' });
    expect(result.attachments).toEqual([]);
  });
});
