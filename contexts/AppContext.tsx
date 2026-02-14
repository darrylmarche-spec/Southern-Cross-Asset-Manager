import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_TASKS, DEFAULT_USERS, type TaskDefinition, type ResponseValue } from '@/data/checklist-data';

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
  content: string; // HTML or JSON string
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
}

interface AppContextValue {
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  projects: ProjectInfo[];
  currentProject: ProjectInfo | null;
  createProject: (project: Omit<ProjectInfo, 'id' | 'createdAt' | 'createdBy'>) => void;
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
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  USERS: '@schindler_users',
  PROJECTS: '@schindler_projects',
  CURRENT_PROJECT: '@schindler_current_project',
  TASK_STATES: '@schindler_task_states',
  CURRENT_USER: '@schindler_current_user',
  SUBMITTED_REPORTS: '@schindler_submitted_reports',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>(DEFAULT_USERS);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);
  const [taskStates, setTaskStates] = useState<TaskState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [focusSection, setFocusSection] = useState<number | null>(null);
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [savedUsers, savedProjects, savedCurrentProject, savedTaskStates, savedCurrentUser, savedReports] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.PROJECTS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT),
        AsyncStorage.getItem(STORAGE_KEYS.TASK_STATES),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
        AsyncStorage.getItem(STORAGE_KEYS.SUBMITTED_REPORTS),
      ]);

      if (savedUsers) setUsers(JSON.parse(savedUsers));
      else await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));

      if (savedProjects) setProjects(JSON.parse(savedProjects));
      if (savedCurrentProject) setCurrentProject(JSON.parse(savedCurrentProject));
      if (savedTaskStates) setTaskStates(JSON.parse(savedTaskStates));
      if (savedCurrentUser) setCurrentUser(JSON.parse(savedCurrentUser));
      if (savedReports) setSubmittedReports(JSON.parse(savedReports));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTaskStates = useCallback(async (states: TaskState[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.TASK_STATES, JSON.stringify(states));
  }, []);

  const saveProjects = useCallback(async (projs: ProjectInfo[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projs));
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      setCurrentUser(user);
      AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }, []);

  const createProject = useCallback((project: Omit<ProjectInfo, 'id' | 'createdAt' | 'createdBy'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newProject: ProjectInfo = {
      ...project,
      id,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.username || '',
    };
    const updated = [...projects, newProject];
    setProjects(updated);
    setCurrentProject(newProject);
    saveProjects(updated);
    AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(newProject));

    const newTaskStates: TaskState[] = ALL_TASKS.map(t => ({
      uid: t.uid,
      projectId: id,
      status: 'pending' as const,
      assignedTo: '',
      dueDate: '',
      actDuration: '',
      actLabor: '',
      comments: t.defaultComments || '',
      response: '' as ResponseValue,
      remarks: '',
      completedBy: '',
      completedAt: '',
    }));
    const allStates = [...taskStates, ...newTaskStates];
    setTaskStates(allStates);
    saveTaskStates(allStates);
  }, [projects, taskStates, currentUser, saveProjects, saveTaskStates]);

  const selectProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProject(project);
      AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(project));
    }
  }, [projects]);

  const deleteProject = useCallback((id: string) => {
    const updatedProjects = projects.filter(p => p.id !== id);
    const updatedTasks = taskStates.filter(t => t.projectId !== id);
    const updatedReports = submittedReports.filter(r => r.projectId !== id);
    setProjects(updatedProjects);
    setTaskStates(updatedTasks);
    setSubmittedReports(updatedReports);
    saveProjects(updatedProjects);
    saveTaskStates(updatedTasks);
    AsyncStorage.setItem(STORAGE_KEYS.SUBMITTED_REPORTS, JSON.stringify(updatedReports));
    if (currentProject?.id === id) {
      setCurrentProject(null);
      AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    }
  }, [projects, taskStates, submittedReports, currentProject, saveProjects, saveTaskStates]);

  const submitReport = useCallback((report: Omit<SubmittedReport, 'id' | 'submittedAt' | 'status'>) => {
    const newReport: SubmittedReport = {
      ...report,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    setSubmittedReports(prev => {
      const updated = [...prev, newReport];
      AsyncStorage.setItem(STORAGE_KEYS.SUBMITTED_REPORTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateReport = useCallback((id: string, updates: Partial<SubmittedReport>) => {
    setSubmittedReports(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      AsyncStorage.setItem(STORAGE_KEYS.SUBMITTED_REPORTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateTask = useCallback((uid: string, updates: Partial<TaskState>) => {
    if (!currentProject) return;
    setTaskStates(prev => {
      const updated = prev.map(t =>
        t.uid === uid && t.projectId === currentProject.id ? { ...t, ...updates } : t
      );
      saveTaskStates(updated);
      return updated;
    });
  }, [currentProject, saveTaskStates]);

  const completeTask = useCallback((uid: string) => {
    if (!currentProject || !currentUser) return;
    setTaskStates(prev => {
      const updated = prev.map(t =>
        t.uid === uid && t.projectId === currentProject.id
          ? { ...t, status: 'completed' as const, completedBy: currentUser.username, completedAt: new Date().toISOString() }
          : t
      );
      saveTaskStates(updated);
      return updated;
    });
  }, [currentProject, currentUser, saveTaskStates]);

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
    projects,
    currentProject,
    createProject,
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
  }), [currentUser, users, login, logout, projects, currentProject, createProject, selectProject, deleteProject, taskStates, updateTask, completeTask, getTaskState, getTaskDef, isLoading, focusSection, submittedReports, submitReport, updateReport]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
