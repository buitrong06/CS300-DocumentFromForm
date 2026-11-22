import { useState } from 'react';
import type { PrototypeScreenId } from './navigation';
import type { FormValues } from '../features/document-filling';
import { INITIAL_FORM_VALUES } from './scenario';
import { Sidebar } from './components/Sidebar';
import { FieldConfigurationScreen } from '../features/template-authoring';
import { GuidedFormScreen } from '../features/document-filling';
import { ContentCheckScreen } from '../features/document-validation';
import { AssignWorkScreen } from '../features/task-delegation';
import { ReviewSubmissionScreen } from '../features/submission-review';
import { IntegrateResultsScreen } from '../features/subtask-integration';
import './styles.css';

export function PrototypeApp() {
  const [currentScreen, setCurrentScreen] = useState<PrototypeScreenId>('screen2');
  const [activeNavTab, setActiveNavTab] = useState<string>('tasks');
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_FORM_VALUES);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSelectNavTab = (tab: string) => {
    setActiveNavTab(tab);
    if (tab === 'templates') setCurrentScreen('screen1');
    else if (tab === 'tasks') setCurrentScreen('screen2');
  };

  return (
    <div className="app-shell">
      <Sidebar
        currentScreen={currentScreen}
        onSelectScreen={setCurrentScreen}
        activeNavTab={activeNavTab}
        onSelectNavTab={handleSelectNavTab}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      <div className="main-col">
        <div className="page-body">
          {currentScreen === 'screen1' && (
            <FieldConfigurationScreen onNavigate={setCurrentScreen} />
          )}
          {currentScreen === 'screen2' && (
            <GuidedFormScreen
              values={formValues}
              onChangeValues={setFormValues}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'screen3' && (
            <ContentCheckScreen
              values={formValues}
              onChangeValues={setFormValues}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'screen4' && (
            <AssignWorkScreen onNavigate={setCurrentScreen} />
          )}
          {currentScreen === 'screen5' && (
            <ReviewSubmissionScreen onNavigate={setCurrentScreen} />
          )}
          {currentScreen === 'screen6' && (
            <IntegrateResultsScreen
              values={formValues}
              onChangeValues={setFormValues}
              onNavigate={setCurrentScreen}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PrototypeApp;
