import { Job } from './Job';
import { Task } from '../models/Task';
import { Workflow } from '../models/Workflow';
import { AppDataSource } from '../data-source';
import { summarizeTasks } from '../utils/aggregation';

/**
 * Aggregates the outputs of all preceding tasks in the workflow into a JSON report.
 * Relies on the dependency mechanism (dependsOn) to run only after those tasks finish.
 * Failed preceding tasks are included with their error information.
 */
export class ReportGenerationJob implements Job {
    async run(task: Task): Promise<any> {
        console.log(`Generating report for task ${task.taskId}...`);

        const workflowRepository = AppDataSource.getRepository(Workflow);
        const workflow = await workflowRepository.findOne({
            where: { workflowId: task.workflow.workflowId },
            relations: ['tasks'],
        });

        if (!workflow) {
            throw new Error(`Workflow ${task.workflow.workflowId} not found for report generation`);
        }

        const precedingTasks = workflow.tasks.filter(
            t => t.taskId !== task.taskId && t.stepNumber < task.stepNumber
        );

        return {
            workflowId: workflow.workflowId,
            tasks: summarizeTasks(precedingTasks),
            finalReport: 'Aggregated data and results',
        };
    }
}
