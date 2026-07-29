import React from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import logoIcon from '../assets/logo_icon.jpg';

interface TopbarProps {
  onNavigateHome: () => void;
  onNewSearch?: () => void;
  showNewSearchButton?: boolean;
  backButtonLabel?: string;
  onBack?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onNavigateHome,
  onNewSearch,
  showNewSearchButton = true,
  backButtonLabel,
  onBack,
}) => {
  return (
    <div className="topbar">
      <div className="topbar-logo" onClick={onNavigateHome}>
        <img src={logoIcon} alt="FacePhoto Logo" />
        <span>FacePhoto</span>
        <span className="version">v1.0</span>
      </div>
      <div className="topbar-right">
        <ThemeSwitcher />
        {onBack && backButtonLabel && (
          <button className="btn btn-ghost btn-sm" onClick={onBack}>
            {backButtonLabel}
          </button>
        )}
        {showNewSearchButton && onNewSearch && (
          <button className="btn btn-primary btn-sm" onClick={onNewSearch}>
            + Nova Busca
          </button>
        )}
      </div>
    </div>
  );
};
