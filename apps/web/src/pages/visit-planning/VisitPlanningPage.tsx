import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import MyPlanningView from './MyPlanningView';
import AllPlanningsView from './AllPlanningsView';
import PlanReviewView from './PlanReviewView';

/** `plan` writes months; `review` approves the ones people submitted. */
type Section = 'plan' | 'review';

/**
 * Visit planning, split by what the person actually does here.
 *
 * A supervisor or merchandiser gets one thing: their own month. A reviewer gets
 * two sections — planning everyone's months, and validating the ones that were
 * submitted to them, which is where the submission notifications land.
 */
export default function VisitPlanningPage() {
  const { t } = useTranslation('planning');
  const p = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const canReview = p.can('visit_plans.review');

  const [section, setSection] = useState<Section>(() =>
    searchParams.get('tab') === 'review' ? 'review' : 'plan',
  );

  const selectSection = (next: Section) => {
    setSection(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    // A plan opened from a notification belongs to the review section.
    if (next !== 'review') { params.delete('planId'); params.delete('userId'); }
    setSearchParams(params, { replace: true });
  };

  // Field users have no sections to switch between — just their own month.
  if (!canReview) return <MyPlanningView editable={p.role === 'supervisor'} />;

  return (
    <div>
      <div className="visits-tab-bar">
        <button
          className={`visits-tab-btn${section === 'plan' ? ' active' : ''}`}
          onClick={() => selectSection('plan')}
        >
          <PlanIcon />
          {t('sections.plan')}
        </button>
        <button
          className={`visits-tab-btn${section === 'review' ? ' active' : ''}`}
          onClick={() => selectSection('review')}
        >
          <CheckIcon />
          {t('sections.review')}
        </button>
      </div>

      {section === 'plan' ? <AllPlanningsView /> : <PlanReviewView />}
    </div>
  );
}

function PlanIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h6a2 2 0 012 2h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h1a2 2 0 012-2z" />
      <path d="M8 12l2 2 4-4M8 17h6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
