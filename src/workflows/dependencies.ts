import type { Task } from '../models/Task';

export interface WorkflowStep {
    taskType: string;
    stepNumber: number;
    // References another step's stepNumber; resolved to that task's taskId.
    dependsOn?: number;
}

/**
 * Resolve YAML `dependsOn: <stepNumber>` references into concrete task ids.
 * Mutates each task's `dependsOn` field in place. Pure & side-effect free besides that.
 * @throws if a step depends on a stepNumber that doesn't exist in the workflow.
 */
export function assignDependencies(steps: WorkflowStep[], tasks: Task[]): void {
    const stepToTaskId = new Map<number, string>();
    for (const task of tasks) {
        stepToTaskId.set(task.stepNumber, task.taskId);
    }

    for (const step of steps) {
        if (step.dependsOn === undefined || step.dependsOn === null) continue;

        const task = tasks.find(t => t.stepNumber === step.stepNumber);
        if (!task) continue;

        const dependencyTaskId = stepToTaskId.get(step.dependsOn);
        if (!dependencyTaskId) {
            throw new Error(
                `Step ${step.stepNumber} depends on step ${step.dependsOn}, which does not exist in the workflow`
            );
        }
        task.dependsOn = dependencyTaskId;
    }
}
