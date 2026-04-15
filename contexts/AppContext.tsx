import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ALL_TASKS, DEFAULT_USERS, type TaskDefinition, type ResponseValue } from '@/data/checklist-data';
import { mapServerProject, mapServerTaskState, mapServerReport, mapServerMessage } from '@/lib/mappers';

function getApiBaseUrl() {
  const domain = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return window.location.origin.replace(':8081', ':5000');
    }
  }
  return 'http://localhost:5000';
}

const API_BASE = getApiBaseUrl();

export interface UserAccount {
  username: string;
  password: string;
  role: 'admin' | 'member';
}

export interface ProjectInfo {
  id: string;
  customer: string;
  projectName: string;
  location: string;
  commissionNumber: string;
  escalatorType: string;
  dateOfCompletion: string;
  createdAt: string;
  createdBy: string;
  assignedMembers: string[];
}

export interface SubmittedReport {
  id: string;
  projectId: string;
  submittedBy: string;
  submittedAt: string;
  type: 'generate' | 'manual';
  content: string;
  notes?: string;
  subject?: string;
  status: 'pending' | 'reviewed';
}

export interface Attachment {
  id: string;
  uri: string;
  name: string;
  type: 'photo' | 'file';
  mimeType?: string;
  addedAt: string;
}

export interface CommentAttachment {
  id: string;
  text: string;
  attachments: Attachment[];
  addedBy: string;
  addedAt: string;
}

export interface AdminMessage {
  id: string;
  type: 'message' | 'parts_request';
  projectId: string;
  projectName: string;
  senderUsername: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  sentAt: string;
  read: boolean;
}

export interface TaskState {
  uid: string;
  projectId: string;
  status: 'pending' | 'completed';
  assignedTo: string;
  dueDate: string;
  actDuration: string;
  actLabor: string;
  comments: string;
  response: ResponseValue;
  remarks: string;
  completedBy: string;
  completedAt: string;
  attachments?: Attachment[];
  commentHistory?: CommentAttachment[];
}

interface AppContextValue {
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  projects: ProjectInfo[];
  currentProject: ProjectInfo | null;
  createProject: (project: Omit<ProjectInfo, 'id' | 'createdAt' | 'createdBy'>) => void;
  updateProject: (id: string, updates: Partial<Omit<ProjectInfo, 'id' | 'createdAt' | 'createdBy'>>) => void;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
  taskStates: TaskState[];
  updateTask: (uid: string, updates: Partial<TaskState>) => void;
  completeTask: (uid: string) => void;
  getTaskState: (uid: string) => TaskState | undefined;
  getTaskDef: (uid: string) => TaskDefinition | undefined;
  isLoading: boolean;
  focusSection: number | null;
  setFocusSection: (index: number | null) => void;
  submittedReports: SubmittedReport[];
  submitReport: (report: Omit<SubmittedReport, 'id' | 'submittedAt' | 'status'>) => void;
  updateReport: (id: string, updates: Partial<SubmittedReport>) => void;
  addUser: (username: string, role: 'admin' | 'member') => Promise<boolean>;
  deleteUser: (username: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  adminMessages: AdminMessage[];
  sendAdminMessage: (message: Omit<AdminMessage, 'id' | 'sentAt' | 'read'>) => void;
  markMessageRead: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  CURRENT_USER: '@schindler_current_user',
  CURRENT_PROJECT: '@schindler_current_project',
};

// mapServerProject, mapServerTaskState, mapServerReport, mapServerMessage
// are imported from @/lib/mappers above.

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);
  const [taskStates, setTaskStates] = useState<TaskState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [focusSection, setFocusSection] = useState<number | null>(null);
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([]);
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedCurrentUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const savedCurrentProject = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);

      if (savedCurrentUser) setCurrentUser(JSON.parse(savedCurrentUser));
      if (savedCurrentProject) setCurrentProject(JSON.parse(savedCurrentProject));

      try {
        const [usersRes, projectsRes, taskStatesRes, reportsRes, messagesRes] = await Promise.all([
          fetch(`${API_BASE}/api/users`),
          fetch(`${API_BASE}/api/projects`),
          fetch(`${API_BASE}/api/task-states`),
          fetch(`${API_BASE}/api/reports`),
          fetch(`${API_BASE}/api/messages`),
        ]);

        if (usersRes.ok) {
          const serverUsers = await usersRes.json();
          const mapped: UserAccount[] = serverUsers.map((u: any) => ({
            username: u.username,
            password: '',
            role: u.role as 'admin' | 'member',
          }));
          setUsers(mapped);
        }

        if (projectsRes.ok) {
          const serverProjects = await projectsRes.json();
          setProjects(serverProjects.map(mapServerProject));
        }

        if (taskStatesRes.ok) {
          const serverStates = await taskStatesRes.json();
          setTaskStates(serverStates.map(mapServerTaskState));
        }

        if (reportsRes.ok) {
          const serverReports = await reportsRes.json();
          setSubmittedReports(serverReports.map(mapServerReport));
        }

        if (messagesRes.ok) {
          const serverMessages = await messagesRes.json();
          setAdminMessages(serverMessages.map(mapServerMessage));
        }
      } catch (e) {
        console.log('Could not fetch from server on load, using defaults');
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      if (res.ok) {
        const serverUsers = await res.json();
        const mapped: UserAccount[] = serverUsers.map((u: any) => ({
          username: u.username,
          password: '',
          role: u.role as 'admin' | 'member',
        }));
        setUsers(mapped);
      }
    } catch (e) {
      console.log('Could not fetch users from server');
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const user: UserAccount = {
          username: data.username,
          password: password,
          role: data.role as 'admin' | 'member',
        };
        setCurrentUser(user);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));

        try {
          const [projectsRes, taskStatesRes, reportsRes, messagesRes] = await Promise.all([
            fetch(`${API_BASE}/api/projects?username=${encodeURIComponent(data.username)}&role=${encodeURIComponent(data.role)}`),
            fetch(`${API_BASE}/api/task-states`),
            fetch(`${API_BASE}/api/reports`),
            fetch(`${API_BASE}/api/messages`),
          ]);

          if (projectsRes.ok) {
            const serverProjects = await projectsRes.json();
            setProjects(serverProjects.map(mapServerProject));
          }
          if (taskStatesRes.ok) {
            const serverStates = await taskStatesRes.json();
            setTaskStates(serverStates.map(mapServerTaskState));
          }
          if (reportsRes.ok) {
            const serverReports = await reportsRes.json();
            setSubmittedReports(serverReports.map(mapServerReport));
          }
          if (messagesRes.ok) {
            const serverMessages = await messagesRes.json();
            setAdminMessages(serverMessages.map(mapServerMessage));
          }
        } catch (e) {
          console.log('Could not refresh data after login');
        }

        return true;
      }
      return false;
    } catch (e) {
      console.log('Server login failed, trying local fallback');
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      if (user) {
        setCurrentUser(user);
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return true;
      }
      return false;
    }
  }, [users]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    setCurrentProject(null);
    await AsyncStorage.multiRemove([STORAGE_KEYS.CURRENT_USER, STORAGE_KEYS.CURRENT_PROJECT]);
  }, []);

  const createProject = useCallback(async (project: Omit<ProjectInfo, 'id' | 'createdAt' | 'createdBy'>) => {
    const projectData = {
      customer: project.customer,
      projectName: project.projectName,
      location: project.location,
      commissionNumber: project.commissionNumber,
      escalatorType: project.escalatorType || 'Escalator',
      dateOfCompletion: project.dateOfCompletion || '',
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username || '',
      assignedMembers: project.assignedMembers || [],
    };

    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });

      if (res.ok) {
        const created = await res.json();
        const newProject = mapServerProject(created);
        setProjects(prev => [...prev, newProject]);
        setCurrentProject(newProject);
        AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(newProject));

        const newTaskStates = ALL_TASKS.map(t => ({
          uid: t.uid,
          projectId: newProject.id,
          status: 'pending',
          assignedTo: '',
          dueDate: '',
          actDuration: '',
          actLabor: '',
          comments: t.defaultComments || '',
          response: '',
          remarks: '',
          completedBy: '',
          completedAt: '',
          attachments: [],
          commentHistory: [],
        }));

        try {
          const tasksRes = await fetch(`${API_BASE}/api/task-states/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ states: newTaskStates }),
          });
          if (tasksRes.ok) {
            const createdStates = await tasksRes.json();
            setTaskStates(prev => [...prev, ...createdStates.map(mapServerTaskState)]);
          }
        } catch (e) {
          console.log('Failed to create task states on server');
        }
      }
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  }, [currentUser]);

  const updateProject = useCallback(async (id: string, updates: Partial<Omit<ProjectInfo, 'id' | 'createdAt' | 'createdBy'>>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (currentProject?.id === id) {
      const updatedCurrent = { ...currentProject, ...updates };
      setCurrentProject(updatedCurrent);
      AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(updatedCurrent));
    }

    try {
      await fetch(`${API_BASE}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.log('Failed to update project on server');
    }
  }, [currentProject]);

  const selectProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProject(project);
      AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(project));
    }
  }, [projects]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTaskStates(prev => prev.filter(t => t.projectId !== id));
    setSubmittedReports(prev => prev.filter(r => r.projectId !== id));

    if (currentProject?.id === id) {
      setCurrentProject(null);
      AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    }

    try {
      await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.log('Failed to delete project on server');
    }
  }, [currentProject]);

  const submitReport = useCallback(async (report: Omit<SubmittedReport, 'id' | 'submittedAt' | 'status'>) => {
    const reportData = {
      ...report,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });

      if (res.ok) {
        const created = await res.json();
        setSubmittedReports(prev => [...prev, mapServerReport(created)]);
      }
    } catch (e) {
      const fallback: SubmittedReport = {
        ...report,
        id: Date.now().toString(),
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };
      setSubmittedReports(prev => [...prev, fallback]);
    }
  }, []);

  const updateReport = useCallback(async (id: string, updates: Partial<SubmittedReport>) => {
    setSubmittedReports(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

    try {
      await fetch(`${API_BASE}/api/reports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.log('Failed to update report on server');
    }
  }, []);

  const addUser = useCallback(async (username: string, role: 'admin' | 'member'): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role }),
      });

      if (res.ok) {
        const data = await res.json();
        const newUser: UserAccount = {
          username: data.username,
          password: 'password123',
          role: data.role as 'admin' | 'member',
        };
        setUsers(prev => [...prev, newUser]);
        return true;
      }
      return false;
    } catch (e) {
      console.log('Server addUser failed');
      return false;
    }
  }, []);

  const deleteUser = useCallback(async (username: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.username !== username));
        return true;
      }
      console.log('Delete user failed:', res.status);
      return false;
    } catch (e) {
      console.log('Server deleteUser failed:', e);
      return false;
    }
  }, []);

  const sendAdminMessage = useCallback(async (message: Omit<AdminMessage, 'id' | 'sentAt' | 'read'>) => {
    const messageData = {
      ...message,
      sentAt: new Date().toISOString(),
      read: false,
    };

    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (res.ok) {
        const created = await res.json();
        setAdminMessages(prev => [...prev, mapServerMessage(created)]);
      }
    } catch (e) {
      const fallback: AdminMessage = {
        ...message,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        sentAt: new Date().toISOString(),
        read: false,
      };
      setAdminMessages(prev => [...prev, fallback]);
    }
  }, []);

  const markMessageRead = useCallback(async (id: string) => {
    setAdminMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));

    try {
      await fetch(`${API_BASE}/api/messages/${id}/read`, { method: 'PUT' });
    } catch (e) {
      console.log('Failed to mark message read on server');
    }
  }, []);

  const updateTask = useCallback(async (uid: string, updates: Partial<TaskState>) => {
    if (!currentProject) return;
    const projectId = currentProject.id;

    setTaskStates(prev => prev.map(t =>
      t.uid === uid && t.projectId === projectId ? { ...t, ...updates } : t
    ));

    try {
      await fetch(`${API_BASE}/api/task-states/${projectId}/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (e) {
      console.log('Failed to update task on server');
    }
  }, [currentProject]);

  const completeTask = useCallback(async (uid: string) => {
    if (!currentProject || !currentUser) return;
    const projectId = currentProject.id;
    const completionUpdates = {
      status: 'completed' as const,
      completedBy: currentUser.username,
      completedAt: new Date().toISOString(),
    };

    setTaskStates(prev => prev.map(t =>
      t.uid === uid && t.projectId === projectId ? { ...t, ...completionUpdates } : t
    ));

    try {
      await fetch(`${API_BASE}/api/task-states/${projectId}/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionUpdates),
      });
    } catch (e) {
      console.log('Failed to complete task on server');
    }
  }, [currentProject, currentUser]);

  const getTaskState = useCallback((uid: string): TaskState | undefined => {
    if (!currentProject) return undefined;
    return taskStates.find(t => t.uid === uid && t.projectId === currentProject.id);
  }, [taskStates, currentProject]);

  const getTaskDef = useCallback((uid: string): TaskDefinition | undefined => {
    return ALL_TASKS.find(t => t.uid === uid);
  }, []);

  const value = useMemo(() => ({
    currentUser,
    users,
    login,
    logout,
    projects: currentUser?.role === 'admin'
      ? projects
      : projects.filter(p => p.assignedMembers?.includes(currentUser?.username || '')),
    currentProject,
    createProject,
    updateProject,
    selectProject,
    deleteProject,
    taskStates,
    updateTask,
    completeTask,
    getTaskState,
    getTaskDef,
    isLoading,
    focusSection,
    setFocusSection,
    submittedReports,
    submitReport,
    updateReport,
    addUser,
    deleteUser,
    refreshUsers,
    adminMessages,
    sendAdminMessage,
    markMessageRead,
  }), [currentUser, users, login, logout, projects, currentProject, createProject, updateProject, selectProject, deleteProject, taskStates, updateTask, completeTask, getTaskState, getTaskDef, isLoading, focusSection, submittedReports, submitReport, updateReport, addUser, deleteUser, refreshUsers, adminMessages, sendAdminMessage, markMessageRead]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
