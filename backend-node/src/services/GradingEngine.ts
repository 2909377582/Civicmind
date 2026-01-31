/**
 * 批改引擎 - 核心批改逻辑
 * CivicMind 的灵魂所在
 */
import { Question } from '../models/Question';
import { StandardAnswer, ScoringPoint } from '../models/Answer';
import {
    GradingResult,
    PointMatch,
    FormatCheck,
    LanguageAnalysis,
    StructureAnalysis,
    AIFeedback,
} from '../models/UserAnswer';
import { AIService } from './AIService';
import { config } from '../config';

export class GradingEngine {
    private aiService: AIService;

    constructor() {
        this.aiService = new AIService();
    }

    /**
     * 执行完整的批改流程
     */
    async grade(
        question: Question,
        standardAnswer: StandardAnswer,
        userContent: string
    ): Promise<GradingResult> {
        const start = Date.now();
        console.log(`[Perf] Start GradingEngine.grade for question: ${question.id}`);
        // 1. 基础数据
        const wordCount = userContent.replace(/\s/g, '').length;
        const maxScore = question.score;

        // 2. 采分点匹配（核心）
        const t1 = Date.now();
        const pointMatches = await this.matchScoringPoints(
            userContent,
            standardAnswer.scoring_points
        );
        console.log(`[Perf] matchScoringPoints took ${Date.now() - t1}ms`);

        // 3. 计算内容得分 (Precision Grading: 直接累加采分点得分)
        // const contentScore = this.calculateContentScore(pointMatches, maxScore);
        const contentScore = pointMatches.reduce((sum, p) => sum + p.earned_score, 0);

        // 4. 格式检查（应用文题型）
        let formatCheck: FormatCheck | undefined;
        let formatScore = 0;
        if (question.question_type === '贯彻执行') {
            formatCheck = this.checkFormat(userContent);
            formatScore = formatCheck.format_score;
        }

        // 5. 语言质量分析
        const t2 = Date.now();
        const languageData = await this.aiService.analyzeLanguageQuality(
            userContent,
            question.question_type
        );
        console.log(`[Perf] analyzeLanguageQuality took ${Date.now() - t2}ms`);
        const languageAnalysis: LanguageAnalysis = {
            fluency_score: languageData.fluency,
            accuracy_score: languageData.accuracy,
            professionalism_score: languageData.professionalism,
            issues: languageData.issues,
            suggestions: languageData.suggestions,
        };
        const languageScore = Math.round(
            ((languageData.fluency + languageData.accuracy + languageData.professionalism) / 3) * 10
        );

        // 6. 结构分析
        const structureAnalysis = this.analyzeStructure(userContent);

        // 7. 字数扣分
        const wordCountDeduction = this.calculateWordCountDeduction(
            wordCount,
            question.word_limit
        );

        // 8. 计算总分 (算法初评)
        let totalScore = contentScore + formatScore + languageScore - wordCountDeduction;
        totalScore = Math.max(0, Math.min(maxScore, Math.round(totalScore)));

        // 9. AI 综合反馈 (Holistic Grading)
        const t3 = Date.now();
        const holisticFeedback = await this.aiService.generateHolisticFeedback(
            userContent,
            question.title,
            standardAnswer.full_answer,
            question.question_type,
            standardAnswer.scoring_points,
            question.exam_level
        );
        console.log(`[Perf] generateHolisticFeedback took ${Date.now() - t3}ms`);

        // 融合算法分与AI评分 (权重：算法40% + AI 60%)
        // 将AI的四维总分(100)换算为题目总分比例
        const aiTotalRaw = holisticFeedback.dimensions.understanding
            + holisticFeedback.dimensions.logic
            + holisticFeedback.dimensions.language
            + holisticFeedback.dimensions.norm;
        const aiScoreScaled = (aiTotalRaw / 100) * maxScore;
        // 如果没有采分点（例如从旧数据迁移），或者采分点总分为0，则回退到混合模式
        const maxPointsScore = standardAnswer.scoring_points.reduce((sum, p) => sum + p.score, 0);

        // --- 核心修复：精准模式得分统合 ---
        // 直接使用 AI 反馈中 scoring_details 的 earned 累加作为内容得分
        let refinedContentScore = contentScore;
        if (holisticFeedback.scoring_details && holisticFeedback.scoring_details.length > 0) {
            const aiEarnedSum = holisticFeedback.scoring_details.reduce((sum, d) => sum + (d.earned || 0), 0);
            // 直接使用采分点累加得分，不再按比例换算
            refinedContentScore = Math.max(contentScore, aiEarnedSum);
        }

        // 最终总分 = 采分点累加得分（不加语言分、格式分）
        let finalScore = refinedContentScore;

        if (maxPointsScore === 0) {
            console.log('[Grading] No scoring points found, using hybrid mode.');
            const baseScore = (totalScore * 0.4) + (aiScoreScaled * 0.6);
            finalScore = baseScore;
        }

        // 获取采分点满分作为 maxScore
        const actualMaxScore = maxPointsScore > 0 ? maxPointsScore : maxScore;
        finalScore = Math.max(0, Math.min(actualMaxScore, Math.round(finalScore * 10) / 10));

        console.log(`[Grading] Score Components - Content: ${refinedContentScore} (采分点累加)`);
        console.log(`[Grading] Final Result - ID: ${question.id}, Title: ${question.title}, MaxScore: ${actualMaxScore}, FinalScore: ${finalScore}`);

        // 修正命中率统计：只要有得分就算命中（包括部分命中）
        const pointsHit = holisticFeedback.scoring_details
            ? holisticFeedback.scoring_details.filter(d => (d.earned || 0) > 0).length
            : pointMatches.filter(p => p.earned_score > 0).length;

        return {
            total_score: finalScore,
            max_score: actualMaxScore, // 使用采分点满分
            content_score: refinedContentScore,
            content_max_score: maxPointsScore || (maxScore * 0.7),
            format_score: formatScore,
            format_max_score: Math.max(3, Math.round(maxScore * 0.1)), // 格式分占 10%
            language_score: languageScore,
            language_max_score: Math.max(10, Math.round(maxScore * 0.2)), // 语言分占 20%
            word_count: wordCount,
            word_count_deduction: wordCountDeduction,
            point_matches: pointMatches,
            format_check: formatCheck,
            language_analysis: languageAnalysis,
            structure_analysis: structureAnalysis,
            ai_feedback: {
                overall_comment: holisticFeedback.overall_comment,
                strengths: holisticFeedback.strengths,
                weaknesses: holisticFeedback.weaknesses,
                suggestions: holisticFeedback.suggestions,
                score_explanation: `内容分: ${refinedContentScore} | 语言分: ${languageScore} | 格式分: ${formatScore} | 扣分: ${wordCountDeduction}`,
                scoring_details: holisticFeedback.scoring_details,
                logic_analysis: holisticFeedback.logic_analysis,
                polished_with_marks: holisticFeedback.polished_with_marks,
                polished_clean: holisticFeedback.polished_clean,
                polished_version: holisticFeedback.polished_with_marks, // 兼容旧前端
                sentence_upgrades: holisticFeedback.sentence_upgrades
            },
            points_hit: pointsHit,
            points_total: Math.max(pointMatches.length, holisticFeedback.scoring_details?.length || 0),
            hit_rate: Math.max(pointMatches.length, holisticFeedback.scoring_details?.length || 0) > 0
                ? pointsHit / Math.max(pointMatches.length, holisticFeedback.scoring_details?.length || 0)
                : 0,
        };
    }

    /**
     * 匹配采分点 - 关键词 + AI语义双重验证
     */
    private async matchScoringPoints(
        userContent: string,
        scoringPoints: ScoringPoint[]
    ): Promise<PointMatch[]> {
        const matches: PointMatch[] = [];

        for (const point of scoringPoints) {
            // 1. 先尝试关键词匹配（快速）
            const keywordResult = this.keywordMatch(userContent, point);

            if (keywordResult.isMatched && keywordResult.matchType === 'keyword') {
                // 关键词完全匹配，直接得分
                matches.push({
                    point_order: point.point_order,
                    point_content: point.content,
                    max_score: point.score,
                    earned_score: point.score,
                    is_matched: true,
                    match_type: 'keyword',
                    matched_text: keywordResult.matchedText,
                    feedback: '✓ 完整命中采分点',
                });
            } else {
                // 2. 调用 AI 语义分析
                const similarity = await this.aiService.analyzeSemanticSimilarity(
                    point.content,
                    userContent
                );

                const threshold = point.semantic_threshold || config.grading.defaultSemanticThreshold;

                if (similarity >= threshold) {
                    // 语义匹配成功
                    const earnedScore = similarity >= 0.85
                        ? point.score
                        : Math.round(point.score * similarity * 10) / 10;

                    matches.push({
                        point_order: point.point_order,
                        point_content: point.content,
                        max_score: point.score,
                        earned_score: earnedScore,
                        is_matched: true,
                        match_type: 'semantic',
                        similarity_score: similarity,
                        feedback: `语义匹配度: ${Math.round(similarity * 100)}%`,
                    });
                } else if (keywordResult.isMatched && keywordResult.matchType === 'partial') {
                    // 部分匹配
                    matches.push({
                        point_order: point.point_order,
                        point_content: point.content,
                        max_score: point.score,
                        earned_score: Math.round(point.score * 0.5 * 10) / 10,
                        is_matched: true,
                        match_type: 'partial',
                        matched_text: keywordResult.matchedText,
                        feedback: '部分命中，建议补充完整',
                    });
                } else {
                    // 未匹配
                    matches.push({
                        point_order: point.point_order,
                        point_content: point.content,
                        max_score: point.score,
                        earned_score: 0,
                        is_matched: false,
                        match_type: 'none',
                        similarity_score: similarity,
                        feedback: '未命中此采分点',
                    });
                }
            }
        }

        return matches;
    }

    /**
     * 关键词匹配
     */
    private keywordMatch(
        content: string,
        point: ScoringPoint
    ): { isMatched: boolean; matchType: 'keyword' | 'partial' | 'none'; matchedText?: string } {
        const contentLower = content.toLowerCase();

        // 检查必须包含的关键词
        if (point.must_contain && point.must_contain.length > 0) {
            const allContained = point.must_contain.every((kw) =>
                contentLower.includes(kw.toLowerCase())
            );
            if (!allContained) {
                return { isMatched: false, matchType: 'none' };
            }
        }

        // 检查主要关键词
        const allKeywords = [...(point.keywords || []), ...(point.synonyms || [])];
        const matchedKeywords = allKeywords.filter((kw) =>
            contentLower.includes(kw.toLowerCase())
        );

        if (matchedKeywords.length === 0) {
            return { isMatched: false, matchType: 'none' };
        }

        // 计算匹配率
        const matchRatio = matchedKeywords.length / Math.max(1, point.keywords?.length || 1);

        if (matchRatio >= 0.8) {
            return {
                isMatched: true,
                matchType: 'keyword',
                matchedText: matchedKeywords.join(', '),
            };
        } else if (matchRatio >= 0.4) {
            return {
                isMatched: true,
                matchType: 'partial',
                matchedText: matchedKeywords.join(', '),
            };
        }

        return { isMatched: false, matchType: 'none' };
    }

    /**
     * 计算内容得分
     */
    private calculateContentScore(pointMatches: PointMatch[], maxScore: number): number {
        const earnedPoints = pointMatches.reduce((sum, m) => sum + m.earned_score, 0);
        const totalPoints = pointMatches.reduce((sum, m) => sum + m.max_score, 0);

        if (totalPoints === 0) return 0;

        // 按比例换算到满分
        const ratio = earnedPoints / totalPoints;
        // 内容分占总分的 70%
        return Math.round(maxScore * 0.7 * ratio * 10) / 10;
    }

    /**
     * 检查应用文格式
     */
    private checkFormat(content: string): FormatCheck {
        const issues: string[] = [];
        let formatScore = 0;

        // 检查标题
        const hasTitle = /^.{2,20}\n/.test(content) || content.includes('关于');
        if (hasTitle) formatScore += 1;
        else issues.push('缺少标题');

        // 检查称呼
        const hasGreeting = /各位|同志们|领导|先生|女士|朋友们/.test(content);
        if (hasGreeting) formatScore += 0.5;
        else issues.push('缺少称呼语');

        // 检查正文结构
        const hasBody = content.length > 100;
        if (hasBody) formatScore += 1;

        // 检查落款
        const hasSignature = /\d{4}年\d{1,2}月\d{1,2}日|署名|单位/.test(content);
        if (hasSignature) formatScore += 0.5;
        else issues.push('缺少落款');

        return {
            has_title: hasTitle,
            has_greeting: hasGreeting,
            has_body: hasBody,
            has_signature: hasSignature,
            format_score: formatScore,
            issues,
        };
    }

    /**
     * 分析文章结构
     */
    private analyzeStructure(content: string): StructureAnalysis {
        const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        const paragraphCount = paragraphs.length;
        const issues: string[] = [];

        // 简单判断结构
        const hasIntroduction = paragraphCount >= 1 && paragraphs[0].length >= 20;
        const hasBody = paragraphCount >= 2;
        const hasConclusion = paragraphCount >= 3;

        let structureScore = 0;
        if (hasIntroduction) structureScore += 1;
        if (hasBody) structureScore += 1.5;
        if (hasConclusion) structureScore += 0.5;

        if (paragraphCount < 3) {
            issues.push('段落划分不够清晰，建议分为开头、主体、结尾三部分');
        }

        return {
            has_introduction: hasIntroduction,
            has_body: hasBody,
            has_conclusion: hasConclusion,
            paragraph_count: paragraphCount,
            structure_score: structureScore,
            issues,
        };
    }

    /**
     * 计算字数扣分
     */
    private calculateWordCountDeduction(wordCount: number, wordLimit?: number): number {
        if (!wordLimit) return 0;

        if (wordCount < wordLimit * 0.5) {
            return 3; // 严重不足
        } else if (wordCount < wordLimit * 0.8) {
            return 2; // 明显不足
        } else if (wordCount > wordLimit * 1.2) {
            return 1; // 超字数
        }
        return 0;
    }
}
