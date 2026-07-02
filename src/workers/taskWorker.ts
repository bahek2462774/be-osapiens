import {AppDataSource} from '../data-source';
import {Task} from '../models/Task';
import {TaskRunner, TaskStatus} from './taskRunner';

export async function taskWorker() {
    const taskRepository = AppDataSource.getRepository(Task);
    const taskRunner = new TaskRunner(taskRepository);

    while (true) {
        const queuedTasks = await taskRepository.find({
            where: { status: TaskStatus.Queued },
            relations: ['workflow'],
            order: { stepNumber: 'ASC' },
        });

        let didWork = false;

        for (const task of queuedTasks) {
            // Resolve dependency readiness before running the task.
            if (task.dependsOn) {
                const dependency = await taskRepository.findOne({ where: { taskId: task.dependsOn } });

                // Dependency still pending -> this task is not ready, try the next one.
                if (!dependency || dependency.status === TaskStatus.Queued || dependency.status === TaskStatus.InProgress) {
                    continue;
                }

                // Dependency failed -> this task can never run; fail it and move on.
                if (dependency.status === TaskStatus.Failed) {
                    await taskRunner.failDueToDependency(task, dependency);
                    didWork = true;
                    break;
                }
            }

            try {
                await taskRunner.run(task);
            } catch (error) {
                console.error('Task execution failed. Task status has already been updated by TaskRunner.');
                console.error(error);
            }
            didWork = true;
            break;
        }

        // Poll quickly while there is progress to make, back off when idle.
        await new Promise(resolve => setTimeout(resolve, didWork ? 200 : 2000));
    }
}
