import { useEffect, useRef, useState } from 'react';
import { ArrowRight16Regular, CalendarClockRegular, ClipboardTaskListLtr24Regular, DocumentAddRegular } from '@fluentui/react-icons';
import type { PrototypeScreenId } from './navigation';
import type { FormValues } from '../features/document-filling';
import { INITIAL_FORM_VALUES } from './scenario';
import { PrototypeNavigation } from './components/PrototypeNavigation';
import { TemplateAuthoringFlow } from '../features/template-authoring/prototype/TemplateAuthoringFlow';
import { GuidedFormScreen } from '../features/document-filling';
import { ExportDocumentScreen } from '../features/document-filling/prototype/ExportDocumentScreen';
import { DOCUMENT_DUE_DATE, DOCUMENT_DUE_LABEL, DOCUMENT_TITLE } from '../features/document-filling/prototype/documentWorkflow';
import type { RequiredFieldKey } from '../features/document-filling/prototype/documentWorkflow';
import { ContentCheckScreen } from '../features/document-validation';
import { AssignWorkScreen } from '../features/task-delegation';
import { ReviewSubmissionScreen } from '../features/submission-review';
import { IntegrateResultsScreen } from '../features/subtask-integration';
import './styles.css';
import './polish.css';

export function PrototypeApp() {
  const [currentScreen, setCurrentScreen] = useState<PrototypeScreenId>('home');
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_FORM_VALUES);
  const [templateOpened, setTemplateOpened] = useState(false);
  const [focusField, setFocusField] = useState<RequiredFieldKey>();
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Fill & Deliver · Bản mô phỏng PA02';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if (currentScreen === 'screen2' && focusField) return;
    window.scrollTo(0, 0);
    main.current?.querySelector<HTMLElement>('.pa02-active-screen h1')?.focus({ preventScroll: true });
  }, [currentScreen, focusField]);

  function navigate(screen: PrototypeScreenId) {
    if (screen === 'screen1') setTemplateOpened(true);
    setFocusField(undefined);
    setCurrentScreen(screen);
  }

  function editField(field: RequiredFieldKey) {
    setFocusField(field);
    setCurrentScreen('screen2');
  }

  return (
    <div className="pa02-shell" lang="vi">
      <PrototypeNavigation currentScreen={currentScreen} onSelectScreen={navigate} />
      <main ref={main}>
        <div hidden={currentScreen !== 'screen1'} className={currentScreen === 'screen1' ? 'pa02-active-screen' : undefined}>
          <TemplateAuthoringFlow onHome={() => navigate('home')} />
        </div>
        {currentScreen !== 'screen1' && (
          <div className="pa02-active-screen">
            {currentScreen === 'home' && (
              <div className="pa02-home">
                <header>
                  <p className="pa02-context">Bản mô phỏng PA02</p>
                  <h1 tabIndex={-1}>Bạn muốn làm gì?</h1>
                  <p className="pa02-muted">Thực hành điền tài liệu hoặc chuẩn bị một mẫu để dùng lại.</p>
                </header>
                <div className="pa02-home-grid">
                  <article className="form-card pa02-home-card">
                    <div className="pa02-home-card-meta">
                      <span className="pa02-home-card-icon" aria-hidden="true"><ClipboardTaskListLtr24Regular /></span>
                      <span className="pa02-home-deadline">
                        <CalendarClockRegular aria-hidden="true" />
                        <span>Hạn nộp <time dateTime={DOCUMENT_DUE_DATE}>{DOCUMENT_DUE_LABEL}</time></span>
                      </span>
                    </div>
                    <p className="pa02-context">Việc được giao</p>
                    <h2>{DOCUMENT_TITLE}</h2>
                    <p className="pa02-muted">Điền các ô còn thiếu, kiểm tra nội dung và chọn định dạng xuất.</p>
                    <button className="btn btn-primary" onClick={() => navigate('screen2')}>Mở biểu mẫu được giao<ArrowRight16Regular aria-hidden="true" /></button>
                  </article>
                  <article className="form-card pa02-home-card">
                    <div className="pa02-home-card-meta">
                      <span className="pa02-home-card-icon pa02-home-card-icon-template" aria-hidden="true"><DocumentAddRegular /></span>
                    </div>
                    <p className="pa02-context">Thư viện mẫu</p>
                    <h2>Đơn xin nghỉ học</h2>
                    <p className="pa02-muted">Chọn nguồn, xác nhận các trường và điền thử trước khi lưu mẫu.</p>
                    <button className="btn btn-secondary" onClick={() => navigate('screen1')}>{templateOpened ? 'Mở lại mẫu biểu' : 'Tạo mẫu biểu'}</button>
                  </article>
                </div>
              </div>
            )}
            {currentScreen === 'screen2' && <GuidedFormScreen values={formValues} onChangeValues={setFormValues} onNavigate={navigate} focusField={focusField} />}
            {currentScreen === 'screen3' && <ContentCheckScreen values={formValues} onChangeValues={setFormValues} onNavigate={navigate} onEditField={editField} />}
            {currentScreen === 'export' && <ExportDocumentScreen values={formValues} onBack={() => navigate('screen3')} onEditField={editField} />}
            {currentScreen === 'screen4' && <AssignWorkScreen onNavigate={navigate} />}
            {currentScreen === 'screen5' && <ReviewSubmissionScreen onNavigate={navigate} />}
            {currentScreen === 'screen6' && <IntegrateResultsScreen values={formValues} onChangeValues={setFormValues} onNavigate={navigate} />}
          </div>
        )}
      </main>
    </div>
  );
}

export default PrototypeApp;
