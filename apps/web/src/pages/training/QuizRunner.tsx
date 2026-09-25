import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { trainingApi, type MyTrainingAssignment, type QuizSession } from '../../api/training.api';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatDuration } from '../../utils/format';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon, ClockIcon, EyeOffIcon, ListIcon } from './icons';
import './training.css';

type RunningSession = Extract<QuizSession, { finished: false }>;
type Stage = 'loading' | 'intro' | 'running' | 'done' | 'missed' | 'error';

const leaveKey = (id: string) => `training-leaves-${id}`;

function readLeaves(id: string): number {
  try {
    return Number(sessionStorage.getItem(leaveKey(id))) || 0;
  } catch {
    return 0;
  }
}

function writeLeaves(id: string, n: number) {
  try {
    sessionStorage.setItem(leaveKey(id), String(n));
  } catch {
    /* storage unavailable — the count just won't survive a reload */
  }
}

/**
 * Full-screen, distraction-free quiz flow, built for phones:
 * intro → one question per screen → "thank you".
 *
 * The server owns the clock (`started_at` + duration) and the shuffle; each
 * answer is saved on "Next", so closing the app mid-way loses nothing and
 * reopening resumes at the first unanswered question.
 */
export default function QuizRunner() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation('training');
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');
  const [info, setInfo] = useState<MyTrainingAssignment | null>(null);
  const [session, setSession] = useState<RunningSession | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  const clockOffset = useRef(0);
  const submittedRef = useRef(false);

  const goBack = useCallback(() => navigate('/training'), [navigate]);

  const openSession = useCallback((s: QuizSession) => {
    if (s.finished) {
      setStage('done');
      return;
    }
    clockOffset.current = new Date(s.server_now).getTime() - Date.now();
    const firstUnanswered = s.questions.findIndex((q) => !s.answers[q.id]?.length);
    setSession(s);
    setPicked(s.answers);
    setIndex(firstUnanswered === -1 ? Math.max(0, s.questions.length - 1) : firstUnanswered);
    setStage('running');
  }, []);

  // Initial load: an attempt already under way resumes straight away,
  // otherwise show the intro.
  useEffect(() => {
    let cancelled = false;
    trainingApi
      .listMine()
      .then(async (list) => {
        if (cancelled) return;
        const found = list.find((a) => a.id === id);
        if (!found) throw new Error(t('runner.notFound'));
        setInfo(found);
        if (found.status === 'completed') setStage('done');
        else if (found.status === 'missed') setStage('missed');
        else if (found.status === 'in_progress') openSession(await trainingApi.start(id));
        else setStage('intro');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setStage('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id, openSession, t]);

  const submit = useCallback(
    async (reason: 'finished' | 'timeout') => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSaving(true);
      try {
        await trainingApi.submit(id, readLeaves(id));
      } catch {
        // The server closes timed-out attempts itself, so a failed submit
        // after the timer never loses the saved answers.
      }
      setSaving(false);
      setTimedOut(reason === 'timeout');
      setStage('done');
    },
    [id],
  );

  // Countdown, against the server's clock.
  useEffect(() => {
    if (stage !== 'running' || !session) return;
    const expires = new Date(session.expires_at).getTime();
    const tick = () => {
      const left = expires - (Date.now() + clockOffset.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0) submit('timeout');
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [stage, session, submit]);

  // "Don't leave this window": count each time the page is hidden, and ask
  // for confirmation before a reload / tab close.
  useEffect(() => {
    if (stage !== 'running') return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        writeLeaves(id, readLeaves(id) + 1);
      } else {
        setShowLeaveWarning(true);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [stage, id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      openSession(await trainingApi.start(id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const question = session?.questions[index];
  const selection = useMemo(() => (question ? picked[question.id] ?? [] : []), [picked, question]);
  const isMultiple = session?.answer_mode === 'multiple';
  const isLast = !!session && index === session.questions.length - 1;

  const toggleOption = (optionId: string) => {
    if (!question) return;
    setPicked((prev) => {
      const current = prev[question.id] ?? [];
      const next = isMultiple
        ? current.includes(optionId)
          ? current.filter((o) => o !== optionId)
          : [...current, optionId]
        : [optionId];
      return { ...prev, [question.id]: next };
    });
  };

  const handleNext = async () => {
    if (!session || !question || !selection.length) return;
    setSaving(true);
    try {
      await trainingApi.saveAnswer(id, question.id, selection);
    } catch (e) {
      setSaving(false);
      if (remainingMs === 0) return submit('timeout');
      toast.error((e as Error).message || t('runner.saveError'));
      return;
    }
    setSaving(false);
    if (isLast) submit('finished');
    else setIndex((i) => i + 1);
  };

  // ─── Screens ─────────────────────────────────────────────────────────────

  if (stage === 'loading') {
    return (
      <div className="quiz-shell">
        <div className="quiz-center"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="quiz-shell">
        <div className="quiz-center">
          <p className="quiz-center-text">{error}</p>
          <Button variant="outline" onClick={goBack}>{t('runner.backToTraining')}</Button>
        </div>
      </div>
    );
  }

  if (stage === 'done' || stage === 'missed') {
    const done = stage === 'done';
    return (
      <div className="quiz-shell">
        <motion.div
          className="quiz-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`quiz-done-icon ${done ? '' : 'is-muted'}`}>
            {done ? <CheckCircleIcon size={44} /> : <ClockIcon size={44} />}
          </div>
          <h2 className="quiz-done-title">{done ? t('runner.doneTitle') : t('runner.missedTitle')}</h2>
          <p className="quiz-center-text">
            {done ? (timedOut ? t('runner.doneTimeout') : t('runner.doneText')) : t('runner.missedText')}
          </p>
          <Button onClick={goBack}>{t('runner.backToTraining')}</Button>
        </motion.div>
      </div>
    );
  }

  if (stage === 'intro' && info) {
    const q = info.quiz;
    return (
      <div className="quiz-shell">
        <header className="quiz-topbar">
          <button type="button" className="quiz-icon-btn" onClick={goBack} aria-label={t('runner.backToTraining')}>
            <ArrowLeftIcon />
          </button>
        </header>
        <div className="quiz-body">
          <motion.div className="quiz-intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="quiz-intro-title">{q.title}</h1>
            {q.description && <p className="quiz-intro-desc">{q.description}</p>}
            <div className="training-meta">
              <span><CalendarIcon /> {t('my.deadline', { date: formatDate(q.deadline, i18n.language) })}</span>
              <span><ListIcon /> {t('questionCount', { count: q.question_count })}</span>
            </div>

            <div className="quiz-rules">
              <h2>{t('runner.rulesTitle')}</h2>
              <ul>
                <li>
                  <span className="quiz-rule-icon"><ClockIcon size={18} /></span>
                  <span>{t('runner.ruleTime', { count: q.duration_minutes })}</span>
                </li>
                <li>
                  <span className="quiz-rule-icon"><EyeOffIcon size={18} /></span>
                  <span>{t('runner.ruleStay')}</span>
                </li>
                <li>
                  <span className="quiz-rule-icon"><ListIcon size={18} /></span>
                  <span>{q.answer_mode === 'multiple' ? t('runner.ruleMultiple') : t('runner.ruleSingle')}</span>
                </li>
                <li>
                  <span className="quiz-rule-icon"><CheckCircleIcon size={18} /></span>
                  <span>{t('runner.ruleAuto')}</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
        <footer className="quiz-footer">
          <Button size="lg" className="quiz-footer-btn" onClick={handleStart} loading={starting}>
            {t('runner.start')}
          </Button>
        </footer>
      </div>
    );
  }

  if (stage !== 'running' || !session || !question) return null;

  const total = session.questions.length;
  const lowTime = remainingMs !== null && remainingMs < 60_000;

  return (
    <div className="quiz-shell">
      <header className="quiz-topbar is-running">
        <span className="quiz-step">{t('runner.questionOf', { current: index + 1, total })}</span>
        <span className={`quiz-timer ${lowTime ? 'is-low' : ''}`} aria-live="off">
          <ClockIcon size={15} /> {formatDuration((remainingMs ?? 0) / 1000)}
        </span>
        <div className="quiz-progress" aria-hidden="true">
          <div className="quiz-progress-bar" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </header>

      {showLeaveWarning && (
        <div className="quiz-leave-warning" role="alert">
          <EyeOffIcon size={16} />
          <span>{t('runner.leaveWarning')}</span>
          <button type="button" onClick={() => setShowLeaveWarning(false)}>{t('runner.ok')}</button>
        </div>
      )}

      <div className="quiz-body">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            className="quiz-question"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="quiz-question-text">{question.text}</h2>
            <p className="quiz-question-hint">{isMultiple ? t('runner.pickMany') : t('runner.pickOne')}</p>

            <div className="quiz-options" role={isMultiple ? 'group' : 'radiogroup'}>
              {question.options.map((o) => {
                const on = selection.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={isMultiple ? 'checkbox' : 'radio'}
                    aria-checked={on}
                    className={`quiz-option ${on ? 'is-selected' : ''}`}
                    onClick={() => toggleOption(o.id)}
                    disabled={saving}
                  >
                    <span className={`quiz-option-mark ${isMultiple ? 'is-box' : 'is-dot'}`} aria-hidden="true">
                      {on && (isMultiple ? <CheckMark /> : <span className="quiz-option-dot" />)}
                    </span>
                    <span className="quiz-option-text">{o.text}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="quiz-footer">
        <Button size="lg" className="quiz-footer-btn" onClick={handleNext} disabled={!selection.length} loading={saving}>
          {isLast ? t('runner.finish') : t('runner.next')}
        </Button>
      </footer>
    </div>
  );
}

function CheckMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}
