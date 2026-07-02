import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Workflow } from './Workflow';
import {TaskStatus} from "../workers/taskRunner";

@Entity({ name: 'tasks' })
export class Task {
    @PrimaryGeneratedColumn('uuid')
    taskId!: string;

    @Column()
    clientId!: string;

    @Column('text')
    geoJson!: string;

    @Column()
    status!: TaskStatus;

    @Column({ nullable: true, type: 'text' })
    progress?: string | null;

    @Column({ nullable: true })
    resultId?: string;

    // Serialized job result (JSON string). Mirrors Result.data for easy aggregation.
    @Column({ nullable: true, type: 'text' })
    output?: string | null;

    @Column()
    taskType!: string;

    @Column({ default: 1 })
    stepNumber!: number;

    // taskId of a task in the same workflow this task depends on (resolved from YAML `dependsOn`).
    @Column({ nullable: true, type: 'text' })
    dependsOn?: string | null;

    @ManyToOne(() => Workflow, workflow => workflow.tasks)
    workflow!: Workflow;
}