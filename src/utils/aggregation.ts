import type { Task } from '../models/Task';

// Kept as plain string literals (not the TaskStatus enum) so this module has no
// runtime dependency on the worker/entity graph and stays trivially unit-testable.
const STATUS_COMPLETED = 'completed';
const STATUS_FAILED = 'failed';

/** Safely parse a task's stored output. Returns null for empty, the raw string if not JSON. */
export function parseOutput(output: string | null | undefined): any {
    if (output === null || output === undefined || output === '') return null;
    try {
        return JSON.parse(output);
    } catch {
        return output;
    }
}

export interface TaskSummary {
    taskId: string;
    stepNumber: number;
    type: string;
    status: string;
    output: any;
    error?: string;
}

/** Build a per-task summary, surfacing an error message for failed tasks. */
export function summarizeTask(task: Task): TaskSummary {
    const status = task.status as unknown as string;
    if (status === STATUS_FAILED) {
        const parsed = parseOutput(task.output);
        return {
            taskId: task.taskId,
            stepNumber: task.stepNumber,
            type: task.taskType,
            status,
            output: null,
            error: (parsed && parsed.error) || 'Task failed',
        };
    }
    return {
        taskId: task.taskId,
        stepNumber: task.stepNumber,
        type: task.taskType,
        status,
        output: parseOutput(task.output),
    };
}

/** Summaries of the given tasks, ordered by stepNumber. */
export function summarizeTasks(tasks: Task[]): TaskSummary[] {
    return [...tasks]
        .sort((a, b) => a.stepNumber - b.stepNumber)
        .map(summarizeTask);
}

/** Aggregate the outputs of every task in a workflow into its finalResult payload. */
export function buildFinalResult(workflowId: string, tasks: Task[]) {
    const statusOf = (t: Task) => t.status as unknown as string;
    return {
        workflowId,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => statusOf(t) === STATUS_COMPLETED).length,
        failedTasks: tasks.filter(t => statusOf(t) === STATUS_FAILED).length,
        tasks: summarizeTasks(tasks),
    };
}
