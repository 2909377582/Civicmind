/**
 * 图片压缩工具
 * 用于在前端压缩图片，减少上传时间
 */

interface CompressOptions {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    maxSizeMB?: number
}

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的 Blob
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<Blob> {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.8
    } = options

    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            // 计算新尺寸
            let { width, height } = img

            if (width > maxWidth) {
                height = (height * maxWidth) / width
                width = maxWidth
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height
                height = maxHeight
            }

            // 创建 canvas 并绘制
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('无法创建 Canvas 上下文'))
                return
            }

            // 白色背景（防止透明 PNG 变黑）
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, width, height)
            ctx.drawImage(img, 0, 0, width, height)

            // 转换为 Blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        console.log(`图片压缩: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`)
                        resolve(blob)
                    } else {
                        reject(new Error('图片压缩失败'))
                    }
                },
                'image/jpeg',
                quality
            )
        }

        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = URL.createObjectURL(file)
    })
}

/**
 * 上传进度回调类型
 */
export interface UploadProgress {
    stage: 'compressing' | 'uploading' | 'processing' | 'completed' | 'error'
    progress: number  // 0-100
    message: string
}

/**
 * 带进度的图片上传（包含压缩和 OCR）
 * @param file 原始图片文件
 * @param onProgress 进度回调
 * @returns OCR 结果
 */
export async function uploadImageWithProgress(
    file: File,
    onProgress: (progress: UploadProgress) => void
): Promise<{ url: string; text: string }> {
    const startTime = Date.now()

    try {
        // 阶段1: 压缩图片 (0-20%)
        onProgress({ stage: 'compressing', progress: 5, message: '正在压缩图片...' })

        let imageBlob: Blob = file
        if (file.size > 500 * 1024) { // 大于 500KB 则压缩
            imageBlob = await compressImage(file, {
                maxWidth: 1600,
                maxHeight: 2400,
                quality: 0.85
            })
        }

        onProgress({ stage: 'compressing', progress: 20, message: '压缩完成' })

        // 阶段2: 上传图片 (20-50%)
        onProgress({ stage: 'uploading', progress: 25, message: '正在上传...' })

        const formData = new FormData()
        formData.append('image', imageBlob, file.name.replace(/\.\w+$/, '.jpg'))

        // 使用 XMLHttpRequest 以获取上传进度
        const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api/v1'

        const uploadResult = await new Promise<{ url: string; text: string }>((resolve, reject) => {
            const xhr = new XMLHttpRequest(); // Re-added missing declaration

            // 模拟 OCR 处理进度的定时器
            let processingTimer: ReturnType<typeof setInterval> | null = null;
            let currentProcessingProgress = 50;
            const processingMessages = [
                { percent: 55, msg: '🚀 图片已送达，正在唤醒 OCR 引擎...' },
                { percent: 65, msg: '🔍 AI 正在识别图文布局...' },
                { percent: 75, msg: '📝 正在逐行提取文字内容...' },
                { percent: 85, msg: '✨ 正在进行智能纠错与排版...' },
                { percent: 95, msg: '📥 结果即将返回...' }
            ];

            const startProcessingSimulation = () => {
                if (processingTimer) return;

                let msgIndex = 0;
                processingTimer = setInterval(() => {
                    // 使用对数曲线让进度条持续增长但越来越慢，永远不会完全停止
                    const remaining = 99 - currentProcessingProgress;
                    const increment = Math.max(0.3, remaining * 0.05);
                    currentProcessingProgress = Math.min(currentProcessingProgress + increment, 99);

                    // 检查是否需要更新消息
                    if (msgIndex < processingMessages.length && currentProcessingProgress >= processingMessages[msgIndex].percent) {
                        onProgress({
                            stage: 'processing',
                            progress: Math.round(currentProcessingProgress),
                            message: processingMessages[msgIndex].msg
                        });
                        msgIndex++;
                    } else {
                        // 只更新进度条，不更新消息（保持上一条消息）
                        onProgress({
                            stage: 'processing',
                            progress: Math.round(currentProcessingProgress),
                            message: msgIndex > 0 ? processingMessages[msgIndex - 1].msg : '正在处理中...'
                        });
                    }
                }, 250); // 每 250ms 更新一次
            };

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    // 上传阶段占 20% -> 50%
                    const uploadPercent = (e.loaded / e.total) * 30 + 20

                    onProgress({
                        stage: 'uploading',
                        progress: Math.round(uploadPercent),
                        message: `正在上传图片 ${Math.round((e.loaded / e.total) * 100)}%`
                    })

                    // 如果上传完成，启动处理模拟
                    if (e.loaded === e.total) {
                        startProcessingSimulation();
                    }
                }
            }

            xhr.onload = () => {
                // 清除模拟定时器
                if (processingTimer) clearInterval(processingTimer);

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText)
                        resolve(response)
                    } catch {
                        reject(new Error('解析响应失败'))
                    }
                } else {
                    // 提供更详细的错误信息
                    let errorMsg = `上传失败: ${xhr.status}`
                    try {
                        const errData = JSON.parse(xhr.responseText)
                        if (errData.detail) errorMsg = errData.detail
                    } catch { }
                    reject(new Error(errorMsg))
                }
            }

            xhr.onerror = () => {
                if (processingTimer) clearInterval(processingTimer);
                reject(new Error('网络错误，请检查网络连接'));
            }

            xhr.ontimeout = () => {
                if (processingTimer) clearInterval(processingTimer);
                reject(new Error(`上传超时（超过60秒），百度OCR服务可能繁忙，请稍后重试`));
            }

            xhr.open('POST', `${API_BASE}/upload/image-ocr`)
            xhr.timeout = 120000 // 120秒超时
            xhr.send(formData)
        })

        // 处理后端返回的结果
        const response = uploadResult as any

        // 检查 OCR 是否成功
        if (response.ocr_success) {
            const timeStr = response.processing_time ? `(${(response.processing_time / 1000).toFixed(1)}秒)` : ''
            onProgress({
                stage: 'completed',
                progress: 100,
                message: `✅ OCR识别成功 ${timeStr}`
            })
        } else if (response.ocr_error) {
            // OCR 失败但上传成功
            console.warn('OCR失败:', response.ocr_error)
            onProgress({
                stage: 'completed',
                progress: 100,
                message: `⚠️ 图片已上传，OCR失败: ${response.ocr_error}`
            })
        } else {
            onProgress({
                stage: 'completed',
                progress: 100,
                message: '✅ 上传完成'
            })
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`图片上传+OCR 总耗时: ${elapsed}秒`)

        return { url: response.url, text: response.text || '' }

    } catch (error: any) {
        const errorMsg = error.message || '上传失败'
        console.error('上传错误:', errorMsg)
        onProgress({
            stage: 'error',
            progress: 0,
            message: `❌ ${errorMsg}`
        })
        throw error
    }
}
