/**
 * Pure mapping functions that convert snake_case server responses to the
 * camelCase shapes used by the client.  Extracted here so they can be
 * unit-tested independently of the React context that consumes them.
 */

import type {
  ProjectInfo,
  TaskState,
  SubmittedReport,
  AdminMessage,
} from '@/contexts/AppContext';

export function mapServerProject(p: any): ProjectInfo {
  return {
    id: p.id,
    customer: p.customer || '',
    projectName: p.projectName || p.project_name || '',
    location: p.location || '',
    commissionNumber: p.commissionNumber || p.commission_number || '',
    escalatorType: p.escalatorType || p.escalator_type || 'Escalator',
    dateOfCompletion: p.dateOfCompletion || p.date_of_completion || '',
    createdAt: p.createdAt || p.created_at || '',
    createdBy: p.createdBy || p.created_by || '',
    assignedMembers: p.assignedMembers || p.assigned_members || [],
  };
}

export function mapServerTaskState(t: any): TaskState {
  return {
    uid: t.uid || '',
    projectId: t.projectId || t.project_id || '',
    status: t.status || 'pending',
    assignedTo: t.assignedTo || t.assigned_to || '',
    dueDate: t.dueDate || t.due_date || '',
    actDuration: t.actDuration || t.act_duration || '',
    actLabor: t.actLabor || t.act_labor || '',
    comments: t.comments || '',
    response: t.response || '',
    remarks: t.remarks || '',
    completedBy: t.completedBy || t.completed_by || '',
    completedAt: t.completedAt || t.completed_at || '',
    attachments: t.attachments || [],
    commentHistory: t.commentHistory || t.comment_history || [],
  };
}

export function mapServerReport(r: any): SubmittedReport {
  return {
    id: r.id,
    projectId: r.projectId || r.project_id || '',
    submittedBy: r.submittedBy || r.submitted_by || '',
    submittedAt: r.submittedAt || r.submitted_at || '',
    type: r.type || 'generate',
    content: r.content || '',
    notes: r.notes || '',
    subject: r.subject || '',
    status: r.status || 'pending',
  };
}

export function mapServerMessage(m: any): AdminMessage {
  return {
    id: m.id,
    type: m.type || 'message',
    projectId: m.projectId || m.project_id || '',
    projectName: m.projectName || m.project_name || '',
    senderUsername: m.senderUsername || m.sender_username || '',
    subject: m.subject || '',
    body: m.body || '',
    attachments: m.attachments || [],
    sentAt: m.sentAt || m.sent_at || '',
    read: m.read || false,
  };
}
