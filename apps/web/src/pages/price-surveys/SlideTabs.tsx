import Button from '../../components/ui/Button';

export interface Slide {
  key: string;
  label: string;
}

interface SlideTabsProps {
  slides: Slide[];
  active: string;
  onChange: (key: string) => void;
}

/** The `.tabs`/`.tab-item` strip used elsewhere in the app, plus prev/next paging. */
export default function SlideTabs({ slides, active, onChange }: SlideTabsProps) {
  const idx = slides.findIndex((s) => s.key === active);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => idx > 0 && onChange(slides[idx - 1].key)}
        disabled={idx <= 0}
        aria-label="prev"
      >
        ‹
      </Button>
      <div className="tabs" style={{ flex: 1, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {slides.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`tab-item ${s.key === active ? 'active' : ''}`}
            onClick={() => onChange(s.key)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => idx < slides.length - 1 && onChange(slides[idx + 1].key)}
        disabled={idx < 0 || idx >= slides.length - 1}
        aria-label="next"
      >
        ›
      </Button>
    </div>
  );
}
