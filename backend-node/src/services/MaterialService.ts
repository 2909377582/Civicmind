/**
 * 素材服务
 */
import { getSupabase } from '../utils/supabase';
import { Material, CreateMaterialInput } from '../models/Material';
import { v4 as uuidv4 } from 'uuid';

export class MaterialService {
    private db = getSupabase();
    private table = 'materials';

    /**
     * 获取素材列表
     */
    async getList(
        filters: { category?: string; is_favorite?: boolean } = {},
        limit: number = 50
    ): Promise<Material[]> {
        let query = this.db.from(this.table).select('*');

        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.is_favorite !== undefined) {
            query = query.eq('is_favorite', filters.is_favorite);
        }

        const { data } = await query.order('created_at', { ascending: false }).limit(limit);
        return (data || []) as Material[];
    }

    /**
     * 搜索素材
     */
    async search(keyword: string, limit: number = 20): Promise<Material[]> {
        const { data } = await this.db
            .from(this.table)
            .select('*')
            .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
            .limit(limit);

        return (data || []) as Material[];
    }

    /**
     * 创建素材
     */
    async create(input: CreateMaterialInput): Promise<Material> {
        const material = {
            id: uuidv4(),
            ...input,
            is_favorite: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const { error } = await this.db.from(this.table).insert(material);

        if (error) {
            console.error('Create material DB error:', error);
            throw new Error(error.message);
        }

        return material as Material;
    }

    /**
     * 切换收藏状态
     */
    async toggleFavorite(id: string): Promise<boolean> {
        const { data: current } = await this.db.from(this.table).select('is_favorite').eq('id', id).single();

        if (!current) return false;

        const { error } = await this.db
            .from(this.table)
            .update({ is_favorite: !current.is_favorite })
            .eq('id', id);

        if (error) throw new Error(error.message);

        return true;
    }

    /**
     * 删除素材
     */
    async delete(id: string): Promise<boolean> {
        const { error } = await this.db.from(this.table).delete().eq('id', id);

        if (error) {
            console.error('Delete material error:', error);
            throw new Error(error.message);
        }

        return true;
    }

    /**
     * 统计数量
     */
    async count(): Promise<number> {
        const { count } = await this.db.from(this.table).select('*', { count: 'exact', head: true });
        return count || 0;
    }

    /**
     * 获取单个素材
     */
    async getById(id: string): Promise<Material | null> {
        const { data } = await this.db.from(this.table).select('*').eq('id', id).single();
        return data as Material | null;
    }

    /**
     * 更新素材
     */
    async update(id: string, input: Partial<CreateMaterialInput>): Promise<Material | null> {
        const { data } = await this.db
            .from(this.table)
            .update({
                ...input,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        return data as Material | null;
    }

    /**
     * 按分类统计素材数量
     */
    async getStats(): Promise<Record<string, number>> {
        const { data } = await this.db.from(this.table).select('category');
        const materials = data || [];

        const stats: Record<string, number> = {};
        for (const m of materials) {
            const cat = m.category || '未分类';
            stats[cat] = (stats[cat] || 0) + 1;
        }

        return stats;
    }
}
