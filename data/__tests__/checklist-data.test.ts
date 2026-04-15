import { describe, it, expect } from 'vitest';
import { ALL_TASKS, SECTIONS, type TaskType } from '../checklist-data';

const VALID_SECTION_INDICES = new Set(SECTIONS.map(s => s.index));
const VALID_TYPES: TaskType[] = ['overhaul', 'commissioning'];

describe('SECTIONS', () => {
  it('has entries for indices 0 through 10', () => {
    const indices = SECTIONS.map(s => s.index).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('every section has a non-empty name', () => {
    for (const section of SECTIONS) {
      expect(section.name, `Section ${section.index} has no name`).toBeTruthy();
    }
  });

  it('every section type is overhaul or commissioning', () => {
    for (const section of SECTIONS) {
      expect(
        VALID_TYPES,
        `Section ${section.index} has invalid type "${section.type}"`,
      ).toContain(section.type);
    }
  });
});

describe('ALL_TASKS', () => {
  it('contains at least one task', () => {
    expect(ALL_TASKS.length).toBeGreaterThan(0);
  });

  it('every task has a non-empty uid', () => {
    for (const task of ALL_TASKS) {
      expect(task.uid, `Task "${task.name}" is missing a uid`).toBeTruthy();
    }
  });

  it('every task has a non-empty name', () => {
    for (const task of ALL_TASKS) {
      expect(task.name, `Task uid "${task.uid}" has no name`).toBeTruthy();
    }
  });

  it('every task has a non-empty section string', () => {
    for (const task of ALL_TASKS) {
      expect(
        task.section,
        `Task uid "${task.uid}" has no section`,
      ).toBeTruthy();
    }
  });

  it('every task sectionIndex maps to a defined section', () => {
    for (const task of ALL_TASKS) {
      expect(
        VALID_SECTION_INDICES,
        `Task uid "${task.uid}" has sectionIndex ${task.sectionIndex} which does not match any section`,
      ).toContain(task.sectionIndex);
    }
  });

  it('every task type is overhaul or commissioning', () => {
    for (const task of ALL_TASKS) {
      expect(
        VALID_TYPES,
        `Task uid "${task.uid}" has invalid type "${task.type}"`,
      ).toContain(task.type);
    }
  });

  it('all uids are unique across the full task list', () => {
    const uids = ALL_TASKS.map(t => t.uid);
    const duplicates = uids.filter((uid, idx) => uids.indexOf(uid) !== idx);
    expect(
      duplicates,
      `Duplicate uids found: ${duplicates.join(', ')}`,
    ).toHaveLength(0);
  });

  it('estDuration and estLabor only appear on overhaul tasks', () => {
    const commissioningWithDuration = ALL_TASKS.filter(
      t => t.type === 'commissioning' && (t.estDuration !== undefined || t.estLabor !== undefined),
    );
    expect(
      commissioningWithDuration.map(t => t.uid),
      'Commissioning tasks should not have estDuration or estLabor',
    ).toHaveLength(0);
  });

  it('all overhaul tasks are in section 0', () => {
    const overhaulInWrongSection = ALL_TASKS.filter(
      t => t.type === 'overhaul' && t.sectionIndex !== 0,
    );
    expect(
      overhaulInWrongSection.map(t => t.uid),
      'Overhaul tasks should be in sectionIndex 0',
    ).toHaveLength(0);
  });

  it('all commissioning tasks are in sections 1–10', () => {
    const commInWrongSection = ALL_TASKS.filter(
      t => t.type === 'commissioning' && t.sectionIndex === 0,
    );
    expect(
      commInWrongSection.map(t => t.uid),
      'Commissioning tasks should not be in sectionIndex 0',
    ).toHaveLength(0);
  });

  it('section 0 (Overhaul Workflow) has tasks', () => {
    const overhaulTasks = ALL_TASKS.filter(t => t.sectionIndex === 0);
    expect(overhaulTasks.length).toBeGreaterThan(0);
  });

  it('commissioning sections 1–7 each have at least one task', () => {
    for (let idx = 1; idx <= 7; idx++) {
      const tasks = ALL_TASKS.filter(t => t.sectionIndex === idx);
      expect(
        tasks.length,
        `Section ${idx} ("${SECTIONS.find(s => s.index === idx)?.name}") has no tasks`,
      ).toBeGreaterThan(0);
    }
  });
});
