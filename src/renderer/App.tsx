import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { WelcomeView } from './views/WelcomeView';
import { HomeView } from './views/HomeView';
import { ConfigView } from './views/ConfigView';
import { ProcessingView } from './views/ProcessingView';
import { ResultsView } from './views/ResultsView';
import { ReportView } from './views/ReportView';
import { SessaoDTO } from './services/api';

export type ScreenId = 'welcome' | 'home' | 'config' | 'processing' | 'results' | 'report';

export const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [activeSessaoId, setActiveSessaoId] = useState<string | null>(null);
  const [copiedCount, setCopiedCount] = useState<number>(0);
  const [targetFolderPath, setTargetFolderPath] = useState<string>('');

  const goTo = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  const handleStartSession = (sessao: SessaoDTO) => {
    setActiveSessaoId(sessao.id);
    setTargetFolderPath(sessao.pasta_destino);
    goTo('processing');
  };

  const handleResumeSession = (sessaoId: string) => {
    setActiveSessaoId(sessaoId);
    goTo('processing');
  };

  const handleViewResults = (sessaoId: string) => {
    setActiveSessaoId(sessaoId);
    goTo('results');
  };

  const handleCopyCompleted = (count: number, destination: string) => {
    setCopiedCount(count);
    setTargetFolderPath(destination);
    goTo('report');
  };

  return (
    <div id="app-root">
      {currentScreen === 'welcome' && (
        <WelcomeView
          onStart={() => goTo('home')}
          onNavigateHome={() => goTo('home')}
        />
      )}

      {currentScreen === 'home' && (
        <HomeView
          onNewSearch={() => goTo('config')}
          onResumeSession={handleResumeSession}
          onNavigateResults={handleViewResults}
          onNavigateHome={() => goTo('home')}
        />
      )}

      {currentScreen === 'config' && (
        <ConfigView
          onStartProcessingReal={handleStartSession}
          onCancel={() => goTo('home')}
          onNavigateHome={() => goTo('home')}
        />
      )}

      {currentScreen === 'processing' && (
        <ProcessingView
          sessaoId={activeSessaoId}
          onComplete={() => goTo('results')}
          onCancel={() => goTo('home')}
          onNavigateHome={() => goTo('home')}
        />
      )}

      {currentScreen === 'results' && (
        <ResultsView
          sessaoId={activeSessaoId}
          onCopyCompleted={handleCopyCompleted}
          onNewSearch={() => goTo('config')}
          onNavigateHome={() => goTo('home')}
        />
      )}

      {currentScreen === 'report' && (
        <ReportView
          copiedCount={copiedCount}
          targetFolder={targetFolderPath}
          onNewSearch={() => goTo('config')}
          onNavigateHome={() => goTo('home')}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};
