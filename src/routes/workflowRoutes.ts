import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Workflow } from '../models/Workflow';
import { TaskStatus } from '../workers/taskRunner';
import { WorkflowStatus } from '../workflows/WorkflowFactory';

const router = Router();

/**
 * GET /workflow/:id/status
 * Returns the workflow status plus completed/total task counts. 404 if not found.
 */
router.get('/:id/status', async (req, res) => {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const workflow = await workflowRepository.findOne({
        where: { workflowId: req.params.id },
        relations: ['tasks'],
    });

    if (!workflow) {
        res.status(404).json({ message: 'Workflow not found' });
        return;
    }

    const totalTasks = workflow.tasks.length;
    const completedTasks = workflow.tasks.filter(t => t.status === TaskStatus.Completed).length;

    res.json({
        workflowId: workflow.workflowId,
        status: workflow.status,
        completedTasks,
        totalTasks,
    });
});

/**
 * GET /workflow/:id/results
 * Returns the aggregated finalResult of a settled workflow.
 * 404 if not found, 400 if the workflow has not settled yet.
 */
router.get('/:id/results', async (req, res) => {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const workflow = await workflowRepository.findOne({
        where: { workflowId: req.params.id },
    });

    if (!workflow) {
        res.status(404).json({ message: 'Workflow not found' });
        return;
    }

    const settled =
        workflow.status === WorkflowStatus.Completed || workflow.status === WorkflowStatus.Failed;
    if (!settled) {
        res.status(400).json({
            message: 'Workflow is not yet completed',
            status: workflow.status,
        });
        return;
    }

    let finalResult: any = workflow.finalResult ?? null;
    if (typeof finalResult === 'string') {
        try {
            finalResult = JSON.parse(finalResult);
        } catch {
            // leave as raw string if it is not valid JSON
        }
    }

    res.json({
        workflowId: workflow.workflowId,
        status: workflow.status,
        finalResult,
    });
});

export default router;
