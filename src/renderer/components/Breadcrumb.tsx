import React from 'react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <div className="breadcrumb">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="breadcrumb-sep">›</span>}
          <div
            className={`breadcrumb-item ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
          >
            {item.label}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
