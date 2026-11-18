import { useState } from 'react';
import type { ScreenId, FormValues } from './types';
import { INITIAL_FORM_VALUES } from './mockData';
import { Sidebar } from './components/Sidebar';
import { Screen1FieldConfig } from './components/Screen1FieldConfig';
import { Screen2GuidedForm } from './components/Screen2GuidedForm';
import { Screen3ContentCheck } from './components/Screen3ContentCheck';
import { Screen4AssignWork } from './components/Screen4AssignWork';
import { Screen5ReviewSubmission } from './components/Screen5ReviewSubmission';
import { Screen6IntegrateResults } from './components/Screen6IntegrateResults';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('screen2');
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
            <Screen1FieldConfig onNavigate={setCurrentScreen} />
          )}
          {currentScreen === 'screen2' && (
            <Screen2GuidedForm
              values={formValues}
              onChangeValues={setFormValues}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'screen3' && (
            <Screen3ContentCheck
              values={formValues}
              onChangeValues={setFormValues}
              onNavigate={setCurrentScreen}
            />
          )}
          {currentScreen === 'screen4' && (
            <Screen4AssignWork onNavigate={setCurrentScreen} />
          )}
          {currentScreen === 'screen5' && (
            <Screen5ReviewSubmission onNavigate={setCurrentScreen} />
          )}
          {currentScreen === 'screen6' && (
            <Screen6IntegrateResults
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

export default App;
