import { describe, it, expect } from 'vitest';
import { PolygonAreaJob } from './PolygonAreaJob';
import type { Task } from '../models/Task';

const makeTask = (geoJson: string): Task => ({ taskId: 't1', geoJson } as unknown as Task);

describe('PolygonAreaJob', () => {
    const job = new PolygonAreaJob();

    it('computes a positive area in square meters for a valid polygon', async () => {
        const polygon = JSON.stringify({
            type: 'Polygon',
            coordinates: [[
                [-63.624885, -10.311050],
                [-63.624885, -10.367865],
                [-63.612783, -10.367865],
                [-63.612783, -10.311050],
                [-63.624885, -10.311050],
            ]],
        });

        const result = await job.run(makeTask(polygon));

        expect(result.unit).toBe('square_meters');
        expect(result.area).toBeGreaterThan(0);
    });

    it('accepts a Feature wrapping a polygon', async () => {
        const feature = JSON.stringify({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
            },
        });

        const result = await job.run(makeTask(feature));
        expect(result.area).toBeGreaterThan(0);
    });

    it('throws on GeoJSON that is not valid JSON', async () => {
        await expect(job.run(makeTask('definitely not json'))).rejects.toThrow(/Invalid GeoJSON/);
    });

    it('throws on non-polygon geometry', async () => {
        const point = JSON.stringify({ type: 'Point', coordinates: [0, 0] });
        await expect(job.run(makeTask(point))).rejects.toThrow(/Invalid GeoJSON/);
    });
});
