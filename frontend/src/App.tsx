import { useState, useEffect } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MobileLayout from './components/mobile/MobileLayout'
import { useIsMobile } from './hooks/useIsMobile'
import ExamListPage from './pages/ExamListPage'
import ExamDetailPage from './pages/ExamDetailPage'
import AnswerPage from './pages/AnswerPage'
import ReportPage from './pages/ReportPage'
import MaterialsPage from './pages/MaterialsPage'
import AdminPage from './pages/AdminPage'
import HistoryPage from './pages/HistoryPage'
import { gradingApi } from './services/api'
import type { Question, UserAnswer, Exam } from './services/api'
import { UserProvider } from './contexts/UserContext'
import './App.css'

type Page = 'exams' | 'exam-detail' | 'questions' | 'answer' | 'report' | 'materials' | 'admin' | 'history'

function App() {
  const isMobile = useIsMobile()
  const [currentPage, setCurrentPage] = useState<Page>('exams')
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [gradingResult, setGradingResult] = useState<UserAnswer | null>(null)

  // 处理哈希路由（用于管理员页面）
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/super-admin') {
        setCurrentPage('admin')
      } else if (currentPage === 'admin' && window.location.hash === '') {
        setCurrentPage('exams')
      }
    }

    // 初始化检查
    handleHashChange()

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [currentPage])

  const handleSelectExam = (examId: string) => {
    setSelectedExamId(examId)
    setCurrentPage('exam-detail')
  }

  const handleSelectQuestion = (question: Question, exam?: Exam) => {
    setSelectedQuestion(question)
    if (exam) setSelectedExam(exam)
    setCurrentPage('answer')
  }

  const handleSubmitAnswer = (result: any) => {
    setGradingResult(result)
    setCurrentPage('report')
  }

  const handleBackToExams = () => {
    setCurrentPage('exams')
    setSelectedExamId(null)
    setSelectedExam(null)
    setSelectedQuestion(null)
    setGradingResult(null)
  }

  const handleBackToExamDetail = () => {
    setCurrentPage('exam-detail')
    setSelectedQuestion(null)
    setGradingResult(null)
  }

  const handleBackToQuestions = () => {
    // 如果是从试卷进入的，返回试卷详情；否则返回题库列表
    if (selectedExamId) {
      handleBackToExamDetail()
    } else {
      setCurrentPage('questions')
      setSelectedQuestion(null)
      setGradingResult(null)
    }
  }

  // 从侧边栏历史记录查看报告
  const handleViewReport = async (answerId: string) => {
    try {
      const report = await gradingApi.report(answerId)
      setGradingResult(report)
      // 如果报告中带有题目信息，同步更新 selectedQuestion
      if ((report as any).question) {
        setSelectedQuestion((report as any).question);
      }
      setCurrentPage('report')
    } catch (err) {
      console.error('获取报告失败:', err)
      alert('获取报告失败，请稍后重试')
    }
  }

  // 进入批改记录管理页面
  const handleManageHistory = () => {
    setCurrentPage('history')
  }

  // 从历史记录页返回
  const handleBackFromHistory = () => {
    setCurrentPage('exams')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'exams':
        return <ExamListPage onSelectExam={handleSelectExam} />
      case 'exam-detail':
        return selectedExamId ? (
          <ExamDetailPage
            examId={selectedExamId}
            onSelectQuestion={handleSelectQuestion}
            onBack={handleBackToExams}
          />
        ) : null

      case 'answer':
        return selectedQuestion ? (
          <AnswerPage
            question={selectedQuestion}
            exam={selectedExam || undefined}
            onSubmit={handleSubmitAnswer}
            onBack={handleBackToQuestions}
          />
        ) : null
      case 'report':
        return gradingResult ? (
          <ReportPage
            result={gradingResult}
            question={selectedQuestion}
            onBack={handleBackToQuestions}
          />
        ) : null
      case 'materials':
        return <MaterialsPage />
      case 'history':
        return (
          <HistoryPage
            onViewReport={handleViewReport}
            onBack={handleBackFromHistory}
          />
        )
      default:
        return <ExamListPage onSelectExam={handleSelectExam} />
    }
  }

  // 如果是管理员页面，渲染独立布局
  if (currentPage === 'admin') {
    return <AdminPage />;
  }

  return (
    <UserProvider>
      {isMobile ? (
        <MobileLayout
          currentPage={currentPage}
          onNavigate={(page: string) => {
            setCurrentPage(page as any)
            if (page === 'exams') {
              handleBackToExams()
            }
          }}
        >
          {renderPage()}
        </MobileLayout>
      ) : (
        <div className="app">
          <Header />
          <div className="app-layout">
            <Sidebar
              currentPage={currentPage}
              onNavigate={(page) => {
                setCurrentPage(page as any)
                if (page === 'exams') {
                  handleBackToExams()
                } else if (page === 'questions') {
                  setSelectedQuestion(null)
                  setGradingResult(null)
                }
              }}
              onViewReport={handleViewReport}
              onManageHistory={handleManageHistory}
            />
            <main className="main-content">
              {renderPage()}
            </main>
          </div>
        </div>
      )}
    </UserProvider>
  )
}

export default App
