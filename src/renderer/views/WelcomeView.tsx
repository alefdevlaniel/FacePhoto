import React from 'react';
import { Topbar } from '../components/Topbar';
import { useTheme } from '../context/ThemeContext';

interface WelcomeViewProps {
  onStart: () => void;
  onNavigateHome: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStart, onNavigateHome }) => {
  const { bannerImage } = useTheme();

  return (
    <div className="screen active" id="screen-welcome">
      <Topbar
        onNavigateHome={onNavigateHome}
        showNewSearchButton={false}
      />
      <div className="welcome-content-wrap">
        <div className="welcome-wrap">
          <div className="welcome-banner-container">
            <img className="welcome-banner-img" src={bannerImage} alt="FacePhoto Banner" />
          </div>

          <div className="welcome-title">
            Face<span>Photo</span>
          </div>
          <p className="welcome-sub">
            Encontre qualquer pessoa em suas fotos de forma<br />
            simples, rápida e completamente privada.
          </p>

          <div className="welcome-steps">
            <div className="welcome-step">
              <div className="step-num">1</div>
              <div className="step-text">
                <strong>Adicione fotos de referência</strong>
                <span>Fotos da pessoa que você quer encontrar — quantas quiser</span>
              </div>
            </div>
            <div className="welcome-step">
              <div className="step-num">2</div>
              <div className="step-text">
                <strong>Selecione seu acervo de fotos</strong>
                <span>Pasta local, HD externo, pendrive — qualquer origem</span>
              </div>
            </div>
            <div className="welcome-step">
              <div className="step-num">3</div>
              <div className="step-text">
                <strong>Revise e copie os resultados</strong>
                <span>Veja o que foi encontrado e decida o que salvar</span>
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-lg w-full" onClick={onStart}>
            Começar agora →
          </button>
          <p className="welcome-note">100% offline · seus dados nunca saem do seu computador</p>
        </div>
      </div>
    </div>
  );
};
