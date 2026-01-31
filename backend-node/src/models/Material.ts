/**
 * 素材类型定义
 */
import { z } from 'zod';

export interface Material {
    id: string;
    category: string;
    title: string;
    content: string;
    source?: string;
    tags: string[];
    is_favorite: boolean;
    created_at: string;
    updated_at: string;
}

export const CreateMaterialSchema = z.object({
    category: z.string().min(1),
    title: z.string().min(1),
    content: z.string().min(1),
    source: z.string().optional(),
    tags: z.array(z.string()).default([]),
});

export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;
