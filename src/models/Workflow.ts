import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Task } from './Task';
import {WorkflowStatus} from "../workflows/WorkflowFactory";

@Entity({ name: 'workflows' })
export class Workflow {
    @PrimaryGeneratedColumn('uuid')
    workflowId!: string;

    @Column()
    clientId!: string;

    @Column({ default: WorkflowStatus.Initial })
    status!: WorkflowStatus;

    // Aggregated results of all tasks, saved once the workflow settles (JSON string).
    @Column({ nullable: true, type: 'text' })
    finalResult?: string | null;

    @OneToMany(() => Task, task => task.workflow)
    tasks!: Task[];
}