import { describe, it, expect } from 'vitest';
import { assignDependencies, WorkflowStep } from './dependencies';
import type { Task } from '../models/Task';

const task = (stepNumber: number, taskId: string): Task =>
    ({ stepNumber, taskId } as unknown as Task);

describe('assignDependencies', () => {
    it('resolves a dependsOn stepNumber into the dependency task id', () => {
        const steps: WorkflowStep[] = [
            { taskType: 'polygonArea', stepNumber: 1 },
            { taskType: 'reportGeneration', stepNumber: 2, dependsOn: 1 },
        ];
        const tasks = [task(1, 'uuid-A'), task(2, 'uuid-B')];

        assignDependencies(steps, tasks);

        expect(tasks[0].dependsOn).toBeUndefined();
        expect(tasks[1].dependsOn).toBe('uuid-A');
    });

    it('leaves tasks without dependsOn untouched', () => {
        const steps: WorkflowStep[] = [
            { taskType: 'analysis', stepNumber: 1 },
            { taskType: 'notification', stepNumber: 2 },
        ];
        const tasks = [task(1, 'uuid-A'), task(2, 'uuid-B')];

        assignDependencies(steps, tasks);

        expect(tasks[0].dependsOn).toBeUndefined();
        expect(tasks[1].dependsOn).toBeUndefined();
    });

    it('throws when dependsOn references a non-existent step', () => {
        const steps: WorkflowStep[] = [{ taskType: 'x', stepNumber: 1, dependsOn: 9 }];
        const tasks = [task(1, 'uuid-A')];

        expect(() => assignDependencies(steps, tasks)).toThrow(/does not exist/);
    });
});
