import { Repository } from 'typeorm';
import { Task } from '../models/Task';
import { getJobForTaskType } from '../jobs/JobFactory';
import { WorkflowStatus } from "../workflows/WorkflowFactory";
import { Workflow } from "../models/Workflow";
import { Result } from "../models/Result";
import { buildFinalResult } from "../utils/aggregation";

export enum TaskStatus {
    Queued = 'queued',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed'
}

export class TaskRunner {
    constructor(
        private taskRepository: Repository<Task>,
    ) {}

    /**
     * Runs the appropriate job based on the task's type, managing the task's status.
     * @param task - The task entity that determines which job to run.
     * @throws If the job fails, it rethrows the error.
     */
    async run(task: Task): Promise<void> {
        task.status = TaskStatus.InProgress;
        task.progress = 'starting job...';
        await this.taskRepository.save(task);
        const job = getJobForTaskType(task.taskType);

        try {
            console.log(`Starting job ${task.taskType} for task ${task.taskId}...`);
            const resultRepository = this.taskRepository.manager.getRepository(Result);
            const taskResult = await job.run(task);
            console.log(`Job ${task.taskType} for task ${task.taskId} completed successfully.`);
            const serialized = JSON.stringify(taskResult ?? {});

            const result = new Result();
            result.taskId = task.taskId!;
            result.data = serialized;
            await resultRepository.save(result);

            task.resultId = result.resultId!;
            task.output = serialized;
            task.status = TaskStatus.Completed;
            task.progress = null;
            await this.taskRepository.save(task);

        } catch (error: any) {
            console.error(`Error running job ${task.taskType} for task ${task.taskId}:`, error);

            task.status = TaskStatus.Failed;
            task.progress = null;
            task.output = JSON.stringify({ error: String(error?.message ?? error) });
            await this.taskRepository.save(task);

            await this.updateWorkflowStatus(task.workflow.workflowId);
            throw error;
        }

        await this.updateWorkflowStatus(task.workflow.workflowId);
    }

    /**
     * Marks a task as failed because one of its dependencies failed, then refreshes the workflow.
     */
    async failDueToDependency(task: Task, dependency: Task): Promise<void> {
        console.error(
            `Task ${task.taskId} (${task.taskType}) failed: dependency ${dependency.taskId} (${dependency.taskType}) failed.`
        );
        task.status = TaskStatus.Failed;
        task.progress = null;
        task.output = JSON.stringify({
            error: `Dependency task ${dependency.taskId} (${dependency.taskType}) failed`,
        });
        await this.taskRepository.save(task);

        await this.updateWorkflowStatus(task.workflow.workflowId);
    }

    /**
     * Recomputes the workflow status from its tasks and, once every task has settled
     * (completed or failed), saves the aggregated finalResult.
     */
    private async updateWorkflowStatus(workflowId: string): Promise<void> {
        const workflowRepository = this.taskRepository.manager.getRepository(Workflow);
        const currentWorkflow = await workflowRepository.findOne({
            where: { workflowId },
            relations: ['tasks'],
        });
        if (!currentWorkflow) return;

        const tasks = currentWorkflow.tasks;
        const anyFailed = tasks.some(t => t.status === TaskStatus.Failed);
        const allSettled = tasks.every(
            t => t.status === TaskStatus.Completed || t.status === TaskStatus.Failed
        );

        // Stay in progress until every task has settled, so the terminal state
        // (completed/failed) is only reached once, together with the finalResult.
        if (!allSettled) {
            currentWorkflow.status = WorkflowStatus.InProgress;
        } else {
            currentWorkflow.status = anyFailed ? WorkflowStatus.Failed : WorkflowStatus.Completed;
            currentWorkflow.finalResult = JSON.stringify(buildFinalResult(workflowId, tasks));
        }

        await workflowRepository.save(currentWorkflow);
    }
}
