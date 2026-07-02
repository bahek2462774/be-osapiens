import { describe, it, expect } from 'vitest';
import { parseOutput, summarizeTasks, buildFinalResult } from './aggregation';
import type { Task } from '../models/Task';

const task = (over: Partial<Task>): Task => ({
    taskId: over.taskId ?? 'id',
    stepNumber: over.stepNumber ?? 1,
    taskType: over.taskType ?? 'analysis',
    status: over.status as any,
    output: over.output ?? null,
} as Task);

describe('parseOutput', () => {
    it('returns null for empty values', () => {
        expect(parseOutput(null)).toBeNull();
        expect(parseOutput(undefined)).toBeNull();
        expect(parseOutput('')).toBeNull();
    });

    it('parses JSON and falls back to the raw string', () => {
        expect(parseOutput('{"area":5}')).toEqual({ area: 5 });
        expect(parseOutput('plain text')).toBe('plain text');
    });
});

describe('summarizeTasks', () => {
    it('orders by stepNumber and surfaces errors for failed tasks', () => {
        const tasks = [
            task({ taskId: 'b', stepNumber: 2, taskType: 'polygonArea', status: 'failed' as any, output: '{"error":"boom"}' }),
            task({ taskId: 'a', stepNumber: 1, taskType: 'analysis', status: 'completed' as any, output: '{"country":"X"}' }),
        ];

        const summaries = summarizeTasks(tasks);

        expect(summaries.map(s => s.taskId)).toEqual(['a', 'b']);
        expect(summaries[0].output).toEqual({ country: 'X' });
        expect(summaries[1].output).toBeNull();
        expect(summaries[1].error).toBe('boom');
    });
});

describe('buildFinalResult', () => {
    it('aggregates counts and per-task outputs', () => {
        const tasks = [
            task({ taskId: 'a', stepNumber: 1, status: 'completed' as any, output: '{"ok":true}' }),
            task({ taskId: 'b', stepNumber: 2, status: 'failed' as any, output: '{"error":"x"}' }),
        ];

        const result = buildFinalResult('wf-1', tasks);

        expect(result.workflowId).toBe('wf-1');
        expect(result.totalTasks).toBe(2);
        expect(result.completedTasks).toBe(1);
        expect(result.failedTasks).toBe(1);
        expect(result.tasks).toHaveLength(2);
    });
});
