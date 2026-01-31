import React, { useState, useEffect } from 'react';
import {
    useMaterials,
    useMaterialAdmin
} from '../services/hooks';
import { materialApi, examApi, questionApi } from '../services/api';
import type { Material, Exam, ParsedExam } from '../services/api';
import imageCompression from 'browser-image-compression';

import './AdminPage.css';

const AdminPage: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'));
    const [adminToken, setAdminToken] = useState('');
    const [activeTab, setActiveTab] = useState<'exams' | 'questions' | 'materials' | 'history' | 'upload'>('exams');

    // 试卷相关状态
    const [exams, setExams] = useState<Exam[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);
    const [parsedExam, setParsedExam] = useState<ParsedExam | null>(null);
    const [isParsingExam, setIsParsingExam] = useState(false);
    const [examTextInput, setExamTextInput] = useState('');
    const [examProgress, setExamProgress] = useState(0);

    // 编辑试卷状态
    const [editingExamId, setEditingExamId] = useState<string | null>(null);
    const [editingExam, setEditingExam] = useState<ParsedExam | null>(null);
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const { materials, refetch: refetchMaterials } = useMaterials();


    const { deleteMaterial } = useMaterialAdmin();


    // 自动加载试卷列表 (只加载一次)
    const hasLoadedExamsRef = React.useRef(false);
    useEffect(() => {
        if (isAuthenticated && activeTab === 'exams' && !hasLoadedExamsRef.current && !loadingExams) {
            hasLoadedExamsRef.current = true;
            setLoadingExams(true);
            examApi.adminList()
                .then(setExams)
                .catch(err => console.error('加载试卷失败:', err.message))
                .finally(() => setLoadingExams(false));
        }
    }, [isAuthenticated, activeTab, loadingExams]);

    // 试卷解析进度模拟 - 持续动态增长
    useEffect(() => {
        if (isParsingExam) {
            setExamProgress(0);
            const interval = setInterval(() => {
                setExamProgress(prev => {
                    // 使用对数曲线让进度条持续增长但越来越慢
                    // 初始快速增长，后期缓慢接近但永远不到100%
                    const remaining = 99 - prev;
                    const increment = Math.max(0.5, remaining * 0.08);
                    return Math.min(prev + increment, 99);
                });
            }, 300);
            return () => clearInterval(interval);
        } else {
            setExamProgress(0);
        }
    }, [isParsingExam]);


    // 素材表单状态
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    const [isMaterialProcessing, setIsMaterialProcessing] = useState(false);
    const [materialProcessingStatus, setMaterialProcessingStatus] = useState('');
    const [materialProgress, setMaterialProgress] = useState(0);
    const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
        category: '科技创新',
        title: '',
        content: '',
        source: '',
        tags: []
    });

    // 素材处理进度模拟 - 持续动态增长
    useEffect(() => {
        if (isMaterialProcessing) {
            setMaterialProgress(0);
            const interval = setInterval(() => {
                setMaterialProgress(prev => {
                    const remaining = 99 - prev;
                    const increment = Math.max(0.5, remaining * 0.08);
                    return Math.min(prev + increment, 99);
                });
            }, 300);
            return () => clearInterval(interval);
        } else {
            setMaterialProgress(0);
        }
    }, [isMaterialProcessing]);

    // 登录鉴权
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminToken) {
            localStorage.setItem('admin_token', adminToken);
            setIsAuthenticated(true);
            window.location.reload();
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        setIsAuthenticated(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="admin-login-page">
                <div className="login-background">
                    <div className="blob"></div>
                    <div className="blob"></div>
                </div>
                <form className="admin-login-card" onSubmit={handleLogin}>
                    <div className="login-header">
                        <div className="login-logo">⚖️</div>
                        <h1>CivicMind</h1>
                        <p>开发者后台管理中心</p>
                    </div>
                    <div className="login-body">
                        <div className="input-group">
                            <label>访问密钥</label>
                            <input
                                type="password"
                                placeholder="输入管理员身份令牌..."
                                value={adminToken}
                                onChange={e => setAdminToken(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        <button type="submit" className="login-submit-btn">
                            验证并授权进入
                            <span className="arrow">→</span>
                        </button>
                    </div>
                    <div className="login-footer">
                        <button type="button" className="btn-link" onClick={() => window.location.hash = ''}>返回主页</button>
                    </div>
                </form>
            </div>
        );
    }


    const handleDeleteMaterial = async (id: string) => {
        if (window.confirm('确定要删除这条素材吗？')) {
            await deleteMaterial(id);
            refetchMaterials();
        }
    };


    const handleSaveMaterial = async () => {
        try {
            await materialApi.create(newMaterial);
            alert('添加成功！');
            setIsAddingMaterial(false);
            refetchMaterials();
        } catch (err: any) {
            alert('添加失败: ' + err.message);
        }
    };

    return (
        <div className="admin-container">
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2>开发者控制台</h2>
                    <div className="header-actions">
                        <button className="btn-text" onClick={() => window.location.hash = ''}>返回首页</button>
                        <button className="btn-logout" onClick={handleLogout}>退出</button>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === 'exams' ? 'active' : ''}`}
                        onClick={() => setActiveTab('exams')}
                    >
                        <span className="icon">📋</span> 试卷管理
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upload')}
                    >
                        <span className="icon">🚀</span> 试卷录入
                    </button>
                    <button
                        className={`nav-item ${activeTab === 'materials' ? 'active' : ''}`}
                        onClick={() => setActiveTab('materials')}
                    >
                        <span className="icon">📚</span> 素材管理
                    </button>
                </nav>
            </aside>

            <main className="admin-content">
                {activeTab === 'exams' && (
                    <div className="tab-pane">
                        <header className="pane-header">
                            <h1>试卷管理</h1>
                            <button className="btn-secondary" onClick={() => {
                                setLoadingExams(true);
                                examApi.adminList()
                                    .then(setExams)
                                    .catch(err => alert('加载失败: ' + err.message))
                                    .finally(() => setLoadingExams(false));
                            }}>刷新列表</button>
                        </header>
                        <div className="table-container">
                            {loadingExams ? (
                                <div className="loading">加载中...</div>
                            ) : exams.length === 0 ? (
                                <div className="empty-state">
                                    <p>📭 暂无试卷数据</p>
                                    <p>请前往「试卷录入」上传试卷</p>
                                </div>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>年份</th>
                                            <th>考试类型</th>
                                            <th>级别</th>
                                            <th>试卷名称</th>
                                            <th>总分</th>
                                            <th>创建时间</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exams.map(exam => (
                                            <tr key={exam.id}>
                                                <td>{exam.year}</td>
                                                <td><span className="badge">{exam.exam_type}</span></td>
                                                <td><span className="badge secondary">{exam.exam_level || '未分类'}</span></td>
                                                <td>{exam.exam_name}</td>
                                                <td>{exam.total_score} 分</td>
                                                <td>{new Date(exam.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <button className="btn-icon" title="查看内容" onClick={() => {
                                                        alert("材料内容:\n\n" + (exam.materials_content?.substring(0, 500) || '无材料') + "...");
                                                    }}>👁️</button>
                                                    <button className="btn-icon" title="编辑试卷" onClick={async () => {
                                                        setIsLoadingEdit(true);
                                                        setEditingExamId(exam.id);
                                                        try {
                                                            const detail = await examApi.getDetail(exam.id);
                                                            setEditingExam(detail);
                                                        } catch (err: any) {
                                                            alert('加载试卷详情失败: ' + err.message);
                                                            setEditingExamId(null);
                                                        } finally {
                                                            setIsLoadingEdit(false);
                                                        }
                                                    }}>✏️</button>
                                                    <button className="btn-icon delete" title="删除试卷" onClick={async () => {
                                                        if (window.confirm("确定要删除试卷「" + exam.exam_name + "」吗？\n这将同时删除关联的所有题目！")) {
                                                            try {
                                                                const result = await examApi.delete(exam.id);
                                                                if (result.success) {
                                                                    setExams(prev => prev.filter(e => e.id !== exam.id));
                                                                    alert('删除成功');
                                                                }
                                                            } catch (err: any) {
                                                                alert('删除失败: ' + err.message);
                                                            }
                                                        }
                                                    }}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}


                {activeTab === 'questions' && (
                    <div className="tab-pane">
                        <header className="pane-header">
                            <h1>题目管理</h1>
                        </header>
                        <div className="empty-state">
                            <p>该模块已移除</p>
                        </div>
                    </div>
                )}
                {
                    activeTab === 'upload' && (
                        <div className="tab-pane">
                            <header className="pane-header">
                                <h1>🚀 AI 智能试卷录入</h1>
                            </header>
                            <div className="admin-form-card">
                                {!parsedExam ? (
                                    <div className="parse-section">
                                        <div className="banner">
                                            <div className="banner-icon">🤖</div>
                                            <div className="banner-content">
                                                <h3>AI 智能解析</h3>
                                                <p>上传 PDF 或粘贴文本进行解析。</p>
                                            </div>
                                        </div>

                                        <div className="parse-options">
                                            <div className="form-group">
                                                <label>📄 方式一：PDF 解析</label>
                                                <div className="pdf-upload-box">
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        id="pdf-upload-input"
                                                        style={{ display: 'none' }}
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            try {
                                                                setIsParsingExam(true);
                                                                const result = await examApi.parsePdf(file);
                                                                console.log('Parsed Exam Result:', JSON.stringify(result, null, 2));
                                                                setParsedExam(result);
                                                            } catch (err: any) {
                                                                alert('解析失败: ' + err.message);
                                                            } finally {
                                                                setIsParsingExam(false);
                                                            }
                                                        }}
                                                    />
                                                    <label htmlFor="pdf-upload-input" className="btn-upload-lg">
                                                        {isParsingExam ? '⏳ 正在解析 PDF...' : '📂 选择 PDF 文件'}
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="divider"><span>或</span></div>

                                            <div className="form-group">
                                                <label>📝 方式二：文本内容解析</label>
                                                <textarea
                                                    rows={10}
                                                    value={examTextInput}
                                                    onChange={e => setExamTextInput(e.target.value)}
                                                    placeholder="在此粘贴试卷文本内容进行 AI 识别..."
                                                    style={{ marginTop: '10px' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    style={{ marginTop: '10px', width: '100%' }}
                                                    disabled={isParsingExam || !examTextInput.trim()}
                                                    onClick={async () => {
                                                        try {
                                                            setIsParsingExam(true);
                                                            const result = await examApi.parseText(examTextInput);
                                                            console.log('Parsed Exam Result:', JSON.stringify(result, null, 2));
                                                            setParsedExam(result);
                                                        } catch (err: any) {
                                                            alert('解析失败: ' + err.message);
                                                        } finally {
                                                            setIsParsingExam(false);
                                                        }
                                                    }}
                                                >
                                                    {isParsingExam ? '🚀 正在解析...' : '🚀 解析当前文本'}
                                                </button>
                                            </div>

                                            {/* AI 解析进度条 */}
                                            {isParsingExam && (
                                                <div className="ai-progress-container">
                                                    <h4><span>🤖</span> AI 正在智能解析试卷内容</h4>
                                                    <div className="ai-progress-bar">
                                                        <div className="ai-progress-bar-inner" style={{ width: Math.min(examProgress, 100) + '%' }}></div>
                                                    </div>
                                                    <p className="ai-progress-percent">{Math.round(Math.min(examProgress, 99))}%</p>
                                                    <p className="ai-progress-status">
                                                        {examProgress > 90
                                                            ? 'AI 正在深度思考中，大模型解析可能需要 1-3 分钟，请耐心等待...'
                                                            : '正在提取题目、答案和评分要点，请稍候...'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="preview-section">
                                        <div className="preview-header">
                                            <h2>📋 解析结果预览</h2>
                                            <button className="btn-text" onClick={() => setParsedExam(null)}>← 重新上传</button>
                                        </div>

                                        <div className="preview-card">
                                            <h3>试卷信息</h3>
                                            <div className="info-grid">
                                                <div className="info-item">
                                                    <label>年份</label>
                                                    <input type="number" value={parsedExam.year} onChange={e => setParsedExam({ ...parsedExam, year: parseInt(e.target.value) })} />
                                                </div>
                                                <div className="info-item">
                                                    <label>类型</label>
                                                    <select value={parsedExam.exam_type} onChange={e => setParsedExam({ ...parsedExam, exam_type: e.target.value })}>
                                                        <option value="国考">国考</option>
                                                        <option value="省考">省考</option>
                                                        <option value="事业单位">事业单位</option>
                                                        <option value="选调生">选调生</option>
                                                    </select>
                                                </div>
                                                <div className="info-item">
                                                    <label>级别</label>
                                                    <select value={parsedExam.exam_level || ''} onChange={e => setParsedExam({ ...parsedExam, exam_level: e.target.value })}>
                                                        <option value="">未分类</option>
                                                        <option value="副省级">副省级</option>
                                                        <option value="市地级">市地级</option>
                                                        <option value="县乡级">县乡级</option>
                                                        <option value="乡镇级">乡镇级</option>
                                                    </select>
                                                </div>
                                                <div className="info-item">
                                                    <label>地区</label>
                                                    <input type="text" value={parsedExam.region || ''} onChange={e => setParsedExam({ ...parsedExam, region: e.target.value })} />
                                                </div>
                                                <div className="info-item wide">
                                                    <label>试卷名称</label>
                                                    <input type="text" value={parsedExam.exam_name || ''} onChange={e => setParsedExam({ ...parsedExam, exam_name: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="preview-card">
                                            <h3>题目 ({parsedExam.questions?.length || 0})</h3>
                                            <div className="questions-preview">
                                                {parsedExam.questions?.map((q, qIdx) => (
                                                    <div key={qIdx} className="question-preview-item" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                                        <div className="q-header" style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                                            <strong>第 {q.question_number} 题</strong>
                                                            <span className="badge">{q.question_type}</span>
                                                            <input
                                                                type="number"
                                                                value={q.score}
                                                                onChange={e => {
                                                                    const newQuestions = [...parsedExam.questions!];
                                                                    newQuestions[qIdx] = { ...q, score: parseInt(e.target.value) || 0 };
                                                                    setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                }}
                                                                style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                            />
                                                            <span>分</span>
                                                            <input
                                                                type="number"
                                                                value={q.word_limit || 0}
                                                                onChange={e => {
                                                                    const newQuestions = [...parsedExam.questions!];
                                                                    newQuestions[qIdx] = { ...q, word_limit: parseInt(e.target.value) || 0 };
                                                                    setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                }}
                                                                style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                            />
                                                            <span>字</span>
                                                        </div>
                                                        <p>{q.title}</p>
                                                        <div style={{ marginTop: '10px', background: '#f9fafb', padding: '10px', borderRadius: '8px' }}>
                                                            <div style={{ marginBottom: '10px' }}>
                                                                <label style={{ display: 'block', fontWeight: 600 }}>参考答案</label>
                                                                <textarea
                                                                    rows={3}
                                                                    value={q.standard_answer?.full_answer || ''}
                                                                    placeholder="输入参考答案..."
                                                                    onChange={e => {
                                                                        const newQuestions = [...parsedExam.questions!];
                                                                        if (!newQuestions[qIdx].standard_answer) {
                                                                            newQuestions[qIdx].standard_answer = { full_answer: '', scoring_points: [] };
                                                                        }
                                                                        newQuestions[qIdx].standard_answer!.full_answer = e.target.value;
                                                                        setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                    }}
                                                                    style={{ width: '100%', padding: '8px' }}
                                                                />
                                                            </div>
                                                            <div className="scoring-points">
                                                                <label style={{ fontWeight: 600 }}>采分点明细 ({q.standard_answer?.scoring_points?.length || 0})</label>
                                                                {(q.standard_answer?.scoring_points || []).map((p, pIdx) => (
                                                                    <div key={pIdx} style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                                                                        <input
                                                                            style={{ flex: 1, padding: '4px' }}
                                                                            value={p.content}
                                                                            onChange={e => {
                                                                                const newQuestions = [...parsedExam.questions!];
                                                                                newQuestions[qIdx].standard_answer!.scoring_points[pIdx].content = e.target.value;
                                                                                setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                            }}
                                                                        />
                                                                        <input
                                                                            style={{ width: '50px', padding: '4px' }}
                                                                            type="number"
                                                                            value={p.score}
                                                                            onChange={e => {
                                                                                const newQuestions = [...parsedExam.questions!];
                                                                                newQuestions[qIdx].standard_answer!.scoring_points[pIdx].score = parseFloat(e.target.value);
                                                                                setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="btn-icon delete"
                                                                            onClick={() => {
                                                                                const newQuestions = [...parsedExam.questions!];
                                                                                newQuestions[qIdx].standard_answer!.scoring_points = newQuestions[qIdx].standard_answer!.scoring_points.filter((_, i) => i !== pIdx);
                                                                                setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                            }}
                                                                        >×</button>
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    className="btn-text"
                                                                    onClick={() => {
                                                                        const newQuestions = [...parsedExam.questions!];
                                                                        if (!newQuestions[qIdx].standard_answer) {
                                                                            newQuestions[qIdx].standard_answer = { full_answer: '', scoring_points: [] };
                                                                        }
                                                                        newQuestions[qIdx].standard_answer!.scoring_points.push({ point_order: (q.standard_answer?.scoring_points?.length || 0) + 1, content: '', score: 2, keywords: [] });
                                                                        setParsedExam({ ...parsedExam, questions: newQuestions });
                                                                    }}
                                                                >+ 添加采分点</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <button className="btn-secondary" onClick={() => setParsedExam(null)}>取消</button>
                                            <button
                                                className="btn-primary"
                                                onClick={async () => {
                                                    const msg = "确认保存试卷「" + parsedExam.exam_name + "」及其 " + (parsedExam.questions?.length || 0) + " 道题目？";
                                                    if (!window.confirm(msg)) return;
                                                    try {
                                                        await examApi.approve(parsedExam);
                                                        alert('保存成功！');
                                                        setParsedExam(null);
                                                        setExamTextInput('');
                                                        examApi.adminList().then(setExams);
                                                        setActiveTab('exams');
                                                    } catch (err: any) {
                                                        alert('保存失败: ' + err.message);
                                                    }
                                                }}
                                            >审核通过并保存</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'materials' && (
                        <div className="tab-pane">
                            <header className="pane-header">
                                <h1>📚 素材管理</h1>
                                {!isAddingMaterial && (
                                    <button className="btn-primary" onClick={() => setIsAddingMaterial(true)}>+ 新增素材</button>
                                )}
                            </header>
                            {isAddingMaterial ? (
                                <div className="admin-form-card">
                                    <div className="banner">
                                        <div className="banner-icon">📝</div>
                                        <div className="banner-content">
                                            <h3>录入素材</h3>
                                            <p>支持 PDF 导入、图片 OCR 识别或直接粘贴文本。</p>
                                        </div>
                                    </div>

                                    <div className="parse-options">
                                        {/* 方式一: PDF 导入 */}
                                        <div className="form-group">
                                            <label>📄 方式一：PDF 导入</label>
                                            <div className="pdf-upload-box">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    id="material-pdf-input"
                                                    style={{ display: 'none' }}
                                                    disabled={isMaterialProcessing}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        try {
                                                            setIsMaterialProcessing(true);
                                                            setMaterialProcessingStatus('正在读取 PDF 内容...');
                                                            const result = await examApi.parsePdf(file);
                                                            if (result.materials_content) {
                                                                setNewMaterial(prev => ({ ...prev, content: (prev.content ? prev.content + '\n' : '') + result.materials_content }));
                                                            }
                                                        } catch (err: any) { alert('PDF 读取失败: ' + err.message); }
                                                        finally { setIsMaterialProcessing(false); setMaterialProcessingStatus(''); }
                                                    }}
                                                />
                                                <label htmlFor="material-pdf-input" className="btn-upload-lg">
                                                    {isMaterialProcessing ? '⚙️ 处理中...' : '📁 选择 PDF 文件'}
                                                </label>
                                            </div>
                                        </div>

                                        <div className="divider"><span>或</span></div>

                                        {/* 方式二: 图片 OCR */}
                                        <div className="form-group">
                                            <label>📸 方式二：图片 OCR 识别</label>
                                            <div className="pdf-upload-box">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    id="material-ocr-input"
                                                    style={{ display: 'none' }}
                                                    disabled={isMaterialProcessing}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        try {
                                                            setIsMaterialProcessing(true);
                                                            setMaterialProcessingStatus('正在压缩图片...');

                                                            // 图片压缩配置
                                                            const options = {
                                                                maxSizeMB: 1,          // 限制最大体积 1MB
                                                                maxWidthOrHeight: 1920, // 限制最大尺寸 1920px
                                                                useWebWorker: true      // 启用 Web Worker 防止卡顿
                                                            };

                                                            let uploadFile = file;
                                                            try {
                                                                const compressedFile = await imageCompression(file, options);
                                                                console.log('压缩前:', (file.size / 1024 / 1024).toFixed(2), 'MB');
                                                                console.log('压缩后:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
                                                                uploadFile = compressedFile;
                                                            } catch (error) {
                                                                console.error('图片压缩失败，将使用原图上传:', error);
                                                            }

                                                            setMaterialProcessingStatus('正在上传并识别...');
                                                            const formData = new FormData();
                                                            formData.append('image', uploadFile);
                                                            const response = await fetch(import.meta.env.VITE_API_URL + "/ocr", {
                                                                method: 'POST',
                                                                headers: { 'X-Admin-Token': localStorage.getItem('admin_token') || '' },
                                                                body: formData
                                                            });
                                                            const data = await response.json();
                                                            if (data.text) {
                                                                setNewMaterial(prev => ({ ...prev, content: (prev.content ? prev.content + '\n' : '') + data.text }));
                                                            }
                                                        } catch (err: any) { alert('OCR 识别失败: ' + err.message); }
                                                        finally { setIsMaterialProcessing(false); setMaterialProcessingStatus(''); }
                                                    }}
                                                />
                                                <label htmlFor="material-ocr-input" className="btn-upload-lg">
                                                    {isMaterialProcessing ? '⚙️ 处理中...' : '📷 上传图片进行识别'}
                                                </label>
                                            </div>
                                        </div>

                                        <div className="divider"><span>或</span></div>

                                        {/* 方式三: 直接输入 */}
                                        <div className="form-group">
                                            <label>📝 方式三：直接输入 / 编辑内容</label>
                                            <textarea
                                                rows={8}
                                                value={newMaterial.content || ''}
                                                onChange={e => setNewMaterial({ ...newMaterial, content: e.target.value })}
                                                placeholder="在此粘贴或编辑素材内容..."
                                            />
                                        </div>

                                        {/* AI 智能提取按钮 */}
                                        {newMaterial.content && !isMaterialProcessing && (
                                            <div className="form-group" style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="btn-primary"
                                                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none' }}
                                                    disabled={isMaterialProcessing}
                                                    onClick={async () => {
                                                        if (!newMaterial.content) return;
                                                        try {
                                                            setIsMaterialProcessing(true);
                                                            setMaterialProcessingStatus('正在智能分析内容...');
                                                            const response = await fetch(import.meta.env.VITE_API_URL + "/materials/extract-metadata", {
                                                                method: 'POST',
                                                                headers: {
                                                                    'Content-Type': 'application/json',
                                                                    'X-Admin-Token': localStorage.getItem('admin_token') || ''
                                                                },
                                                                body: JSON.stringify({ content: newMaterial.content })
                                                            });
                                                            const data = await response.json();
                                                            if (data.title || data.source || data.category) {
                                                                setNewMaterial(prev => ({
                                                                    ...prev,
                                                                    title: data.title || prev.title,
                                                                    source: data.source || prev.source,
                                                                    category: data.category || prev.category
                                                                }));
                                                            }
                                                        } catch (err: any) {
                                                            alert('智能提取失败: ' + err.message);
                                                        } finally {
                                                            setIsMaterialProcessing(false);
                                                            setMaterialProcessingStatus('');
                                                        }
                                                    }}
                                                >
                                                    🤖 智能提取标题和来源
                                                </button>
                                            </div>
                                        )}

                                        {/* 素材处理进度条 */}
                                        {isMaterialProcessing && (
                                            <div className="ai-progress-container">
                                                <h4><span>🤖</span> AI 正在处理中</h4>
                                                <div className="ai-progress-bar">
                                                    <div className="ai-progress-bar-inner" style={{ width: Math.min(materialProgress, 100) + '%' }}></div>
                                                </div>
                                                <p className="ai-progress-percent">{Math.round(Math.min(materialProgress, 100))}%</p>
                                                <p className="ai-progress-status">{materialProcessingStatus || '请稍候...'}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 元信息填写 */}
                                    <div className="form-grid" style={{ marginTop: '20px' }}>
                                        <div className="form-group">
                                            <label>分类</label>
                                            <select
                                                value={newMaterial.category}
                                                onChange={e => setNewMaterial({ ...newMaterial, category: e.target.value })}
                                            >
                                                <option value="科技创新">科技创新</option>
                                                <option value="生态文明">生态文明</option>
                                                <option value="文化建设">文化建设</option>
                                                <option value="政治参与">政治参与</option>
                                                <option value="社会治理">社会治理</option>
                                                <option value="经济发展">经济发展</option>
                                                <option value="其他">其他</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>标题</label>
                                            <input
                                                type="text"
                                                value={newMaterial.title || ''}
                                                onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                                                placeholder="简短标题"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>来源</label>
                                            <input
                                                type="text"
                                                value={newMaterial.source || ''}
                                                onChange={e => setNewMaterial({ ...newMaterial, source: e.target.value })}
                                                placeholder="如：人民日报、半月谈..."
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions">
                                        <button className="btn-secondary" onClick={() => setIsAddingMaterial(false)}>取消</button>
                                        <button className="btn-primary" onClick={handleSaveMaterial}>保存素材</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="admin-table">
                                        <thead>
                                            <tr><th>分类</th><th>标题</th><th>预览</th><th>操作</th></tr>
                                        </thead>
                                        <tbody>
                                            {materials.map(m => (
                                                <tr key={m.id}>
                                                    <td><span className="badge">{m.category}</span></td>
                                                    <td>{m.title}</td>
                                                    <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.content}</td>
                                                    <td>
                                                        <button className="btn-icon delete" onClick={() => handleDeleteMaterial(m.id)}>🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                }
            </main >

            {/* 编辑试卷模态框 */}
            {
                editingExam && (
                    <div className="modal-overlay" onClick={() => { setEditingExam(null); setEditingExamId(null); }}>
                        <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>✏️ 编辑试卷</h2>
                                <button className="modal-close" onClick={() => { setEditingExam(null); setEditingExamId(null); }}>×</button>
                            </div>

                            <div className="modal-body">
                                {isLoadingEdit ? (
                                    <div className="loading">加载中...</div>
                                ) : (
                                    <>
                                        {/* 基本信息 */}
                                        <div className="edit-section">
                                            <h3>📋 基本信息</h3>
                                            <div className="info-grid">
                                                <div className="info-item">
                                                    <label>年份</label>
                                                    <input
                                                        type="number"
                                                        value={editingExam.year}
                                                        onChange={e => setEditingExam({ ...editingExam, year: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="info-item">
                                                    <label>考试类型</label>
                                                    <select
                                                        value={editingExam.exam_type}
                                                        onChange={e => setEditingExam({ ...editingExam, exam_type: e.target.value })}
                                                    >
                                                        <option value="国考">国考</option>
                                                        <option value="省考">省考</option>
                                                        <option value="事业单位">事业单位</option>
                                                        <option value="选调生">选调生</option>
                                                    </select>
                                                </div>
                                                <div className="info-item">
                                                    <label>级别</label>
                                                    <select
                                                        value={editingExam.exam_level || ''}
                                                        onChange={e => setEditingExam({ ...editingExam, exam_level: e.target.value })}
                                                    >
                                                        <option value="">未分类</option>
                                                        <option value="副省级">副省级</option>
                                                        <option value="市地级">市地级</option>
                                                        <option value="县乡级">县乡级</option>
                                                        <option value="乡镇级">乡镇级</option>
                                                    </select>
                                                </div>
                                                <div className="info-item">
                                                    <label>地区</label>
                                                    <input
                                                        type="text"
                                                        placeholder="如：湖南、广东..."
                                                        value={editingExam.region || ''}
                                                        onChange={e => setEditingExam({ ...editingExam, region: e.target.value })}
                                                    />
                                                </div>
                                                <div className="info-item wide">
                                                    <label>试卷名称</label>
                                                    <input
                                                        type="text"
                                                        value={editingExam.exam_name || ''}
                                                        onChange={e => setEditingExam({ ...editingExam, exam_name: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 题目列表 */}
                                        <div className="edit-section">
                                            <h3>📝 题目列表 ({(editingExam.questions || []).length} 道)</h3>
                                            <div className="questions-edit-list">
                                                {(editingExam.questions || []).map((q, idx) => (
                                                    <div key={idx} className="question-edit-item">
                                                        <div className="q-edit-header">
                                                            <span className="q-number">第 {q.question_number} 题</span>
                                                            <span className="badge">{q.question_type}</span>
                                                            <input
                                                                type="number"
                                                                value={q.score}
                                                                onChange={e => {
                                                                    const newQuestions = [...(editingExam.questions || [])];
                                                                    newQuestions[idx] = { ...q, score: parseInt(e.target.value) };
                                                                    setEditingExam({ ...editingExam, questions: newQuestions });
                                                                }}
                                                                style={{ width: '60px' }}
                                                            />
                                                            <span>分</span>
                                                            <input
                                                                type="number"
                                                                value={q.word_limit || 0}
                                                                onChange={e => {
                                                                    const newQuestions = [...(editingExam.questions || [])];
                                                                    newQuestions[idx] = { ...q, word_limit: parseInt(e.target.value) };
                                                                    setEditingExam({ ...editingExam, questions: newQuestions });
                                                                }}
                                                                style={{ width: '60px' }}
                                                            />
                                                            <span>字</span>
                                                        </div>
                                                        <div className="q-edit-body">
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>题目内容</label>
                                                                <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                                                                    {q.title}
                                                                </div>
                                                            </div>

                                                            <div style={{ marginBottom: '12px' }}>
                                                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>参考答案</label>
                                                                <textarea
                                                                    rows={4}
                                                                    value={q.standard_answer?.full_answer || ''}
                                                                    onChange={e => {
                                                                        const newQuestions = [...(editingExam.questions || [])];
                                                                        if (!newQuestions[idx].standard_answer) {
                                                                            newQuestions[idx].standard_answer = { full_answer: '', scoring_points: [] };
                                                                        }
                                                                        newQuestions[idx].standard_answer!.full_answer = e.target.value;
                                                                        setEditingExam({ ...editingExam, questions: newQuestions });
                                                                    }}
                                                                    placeholder="输入参考答案..."
                                                                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                                                />
                                                            </div>

                                                            <div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                                    <label style={{ fontWeight: 600 }}>采分点 ({q.standard_answer?.scoring_points?.length || 0})</label>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-text"
                                                                        style={{ fontSize: '12px' }}
                                                                        onClick={async () => {
                                                                            if (!q.standard_answer?.full_answer) {
                                                                                alert('请先填写参考答案');
                                                                                return;
                                                                            }
                                                                            try {
                                                                                const points = await questionApi.generateScoringPoints(q.title, q.standard_answer.full_answer);
                                                                                const newQuestions = [...(editingExam.questions || [])];
                                                                                if (!newQuestions[idx].standard_answer) {
                                                                                    newQuestions[idx].standard_answer = { full_answer: '', scoring_points: [] };
                                                                                }
                                                                                newQuestions[idx].standard_answer!.scoring_points = points;
                                                                                setEditingExam({ ...editingExam, questions: newQuestions });
                                                                            } catch (err: any) {
                                                                                alert('生成失败: ' + err.message);
                                                                            }
                                                                        }}
                                                                    >⚡ 自动生成</button>
                                                                </div>
                                                                <div className="points-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {(q.standard_answer?.scoring_points || []).map((p, pIdx) => (
                                                                        <div key={pIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '12px', color: '#64748b', width: '20px' }}>{pIdx + 1}</span>
                                                                            <input
                                                                                type="text"
                                                                                value={p.content || ''}
                                                                                onChange={e => {
                                                                                    const newQuestions = [...(editingExam.questions || [])];
                                                                                    newQuestions[idx].standard_answer!.scoring_points[pIdx].content = e.target.value;
                                                                                    setEditingExam({ ...editingExam, questions: newQuestions });
                                                                                }}
                                                                                style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                                                                                placeholder="要点内容"
                                                                            />
                                                                            <input
                                                                                type="number"
                                                                                value={p.score || 0}
                                                                                onChange={e => {
                                                                                    const newQuestions = [...(editingExam.questions || [])];
                                                                                    newQuestions[idx].standard_answer!.scoring_points[pIdx].score = parseFloat(e.target.value);
                                                                                    setEditingExam({ ...editingExam, questions: newQuestions });
                                                                                }}
                                                                                style={{ width: '50px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                className="btn-icon delete"
                                                                                onClick={() => {
                                                                                    const newQuestions = [...(editingExam.questions || [])];
                                                                                    newQuestions[idx].standard_answer!.scoring_points = newQuestions[idx].standard_answer!.scoring_points.filter((_, i) => i !== pIdx);
                                                                                    setEditingExam({ ...editingExam, questions: newQuestions });
                                                                                }}
                                                                            >×</button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button className="btn-secondary" onClick={() => { setEditingExam(null); setEditingExamId(null); }}>取消</button>
                                <button
                                    className="btn-primary"
                                    disabled={isSavingEdit}
                                    onClick={async () => {
                                        if (!editingExamId || !editingExam) return;
                                        setIsSavingEdit(true);
                                        try {
                                            await examApi.update(editingExamId, editingExam);
                                            alert('保存成功！');
                                            setEditingExam(null);
                                            setEditingExamId(null);
                                            examApi.adminList().then(setExams);
                                        } catch (err: any) {
                                            alert('保存失败: ' + err.message);
                                        } finally {
                                            setIsSavingEdit(false);
                                        }
                                    }}
                                >
                                    {isSavingEdit ? '保存中...' : '💾 保存修改'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminPage;
