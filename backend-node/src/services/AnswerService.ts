/**
 * 标准答案服务
 */
import { getSupabase } from '../utils/supabase';
import { StandardAnswer, CreateAnswerInput } from '../models/Answer';
import { v4 as uuidv4 } from 'uuid';

export class AnswerService {
    private db = getSupabase();
    private table = 'standard_answers';

    /**
     * 获取题目的标准答案
     */
    async getByQuestionId(questionId: string): Promise<StandardAnswer | null> {
        const { data } = await this.db
            .from(this.table)
            .select('*')
            .eq('question_id', questionId)
            .single();

        return data as StandardAnswer | null;
    }

    /**
     * 创建标准答案
     */
    async create(input: CreateAnswerInput): Promise<StandardAnswer> {
        const answer = {
            id: uuidv4(),
            ...input,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await this.db.from(this.table).insert(answer);
        return answer as StandardAnswer;
    }

    /**
     * 更新标准答案
     */
    async update(id: string, input: Partial<CreateAnswerInput>): Promise<StandardAnswer | null> {
        const { data } = await this.db
            .from(this.table)
            .update({
                ...input,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        return data as StandardAnswer | null;
    }

    /**
     * 删除标准答案
     */
    async delete(id: string): Promise<boolean> {
        const { error } = await this.db.from(this.table).delete().eq('id', id);
        return !error;
    }
}
