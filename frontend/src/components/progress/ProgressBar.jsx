export function ProgressBar({ label, progress, hasEvidence, state, noEvidenceLabel = 'No progress recorded yet', compact = false }) {
  return (
    <div className={`derived-progress${compact ? ' derived-progress--compact' : ''}`}>
      <div className="derived-progress__heading">
        <span>{label}</span>
        <strong>{progress}%</strong>
      </div>
      <div
        className={`derived-progress__track${!hasEvidence ? ' is-empty' : ''}`}
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress}
        aria-valuetext={hasEvidence ? `${progress}% complete` : 'No task evidence yet'}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      {!hasEvidence && <span className="derived-progress__detail">{noEvidenceLabel}</span>}
      {state === 'started' && <span className="derived-progress__detail">Tasks added; none completed yet</span>}
    </div>
  )
}

export default ProgressBar