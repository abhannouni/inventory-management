import { useTranslation } from 'react-i18next';
import DataTable from '../../components/ui/DataTable';
import { SYNTHESE_STRUCTURE, noteKey, type SyntheseSection } from './syntheseStructure';

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

interface SyntheseSlideProps {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  editable: boolean;
}

type SectionKind = 'mises_en_avant' | 'ruptures';

function sectionKind(section: SyntheseSection): SectionKind {
  return section.startsWith('mises_en_avant') ? 'mises_en_avant' : 'ruptures';
}

const PRODUCT_GROUPS: { key: 'alcool' | 'food'; sections: SyntheseSection[] }[] = [
  { key: 'alcool', sections: ['mises_en_avant_alcool', 'ruptures_alcool'] },
  { key: 'food', sections: ['mises_en_avant_food', 'ruptures_food'] },
];

function NoteCell({
  value,
  editable,
  onChange,
}: {
  value: string;
  editable: boolean;
  onChange?: (v: string) => void;
}) {
  if (!editable) return <span>{value || '—'}</span>;
  return (
    <input
      type="text"
      className="form-input"
      style={{ minWidth: 120 }}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export default function SyntheseSlide({ values, onChange, editable }: SyntheseSlideProps) {
  const { t } = useTranslation('priceSurveys');

  return (
    <div>
      {PRODUCT_GROUPS.map((group) => (
        <div key={group.key} className="synthese-group">
          <div className="synthese-group-title">{t(`slides.synthese.groups.${group.key}`)}</div>
          <div className="synthese-group-grid">
            {group.sections.map((section) => {
              const kind = sectionKind(section);
              return (
                <div key={section} className={`card synthese-section-card kind-${kind}`}>
                  <div className="card-header synthese-section-header">
                    <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: kind === 'mises_en_avant' ? 'var(--primary)' : 'var(--danger)', display: 'flex' }}>
                        {kind === 'mises_en_avant' ? <EyeIcon /> : <AlertIcon />}
                      </span>
                      {t(`slides.synthese.kinds.${kind}`)}
                    </h3>
                  </div>
                  <DataTable
                    columns={[
                      {
                        key: 'zone',
                        header: t('slides.synthese.zone'),
                        render: (subArea: string) => <strong>{subArea}</strong>,
                      },
                      {
                        key: 'own',
                        header: t('slides.synthese.own'),
                        render: (subArea: string) => (
                          <NoteCell
                            value={values[noteKey(section, subArea, 'own')] ?? ''}
                            editable={editable}
                            onChange={(v) => onChange(noteKey(section, subArea, 'own'), v)}
                          />
                        ),
                      },
                      {
                        key: 'competitor',
                        header: t('slides.synthese.competitor'),
                        render: (subArea: string) => (
                          <NoteCell
                            value={values[noteKey(section, subArea, 'competitor')] ?? ''}
                            editable={editable}
                            onChange={(v) => onChange(noteKey(section, subArea, 'competitor'), v)}
                          />
                        ),
                      },
                    ]}
                    data={[...SYNTHESE_STRUCTURE[section]]}
                    keyExtractor={(subArea) => subArea}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
