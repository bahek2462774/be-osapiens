import { Job } from './Job';
import { Task } from '../models/Task';
import area from '@turf/area';

export interface PolygonAreaResult {
    area: number;
    unit: string;
}

export class PolygonAreaJob implements Job {
    async run(task: Task): Promise<PolygonAreaResult> {
        console.log(`Calculating polygon area for task ${task.taskId}...`);

        let geoJson: any;
        try {
            geoJson = JSON.parse(task.geoJson);
        } catch {
            throw new Error('Invalid GeoJSON: task.geoJson is not valid JSON');
        }

        if (!isPolygonLike(geoJson)) {
            throw new Error('Invalid GeoJSON: expected a Polygon or MultiPolygon geometry or feature');
        }

        const value = area(geoJson);
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error('Invalid GeoJSON: computed area is not a positive number');
        }

        return { area: value, unit: 'square_meters' };
    }
}

/** Accepts a bare Polygon/MultiPolygon geometry or a Feature wrapping one. */
function isPolygonLike(input: any): boolean {
    if (!input || typeof input !== 'object') return false;
    const geometry = input.type === 'Feature' ? input.geometry : input;
    if (!geometry || typeof geometry !== 'object') return false;
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return false;
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
}
