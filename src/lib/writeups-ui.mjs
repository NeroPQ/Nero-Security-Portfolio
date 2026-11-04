export const platformName = platform => platform === 'THM' ? 'TryHackMe' : 'Hack The Box Academy';

export const evidenceLabel = status => ({ pending: 'Evidence Pending', verified: 'Evidence verified', 'not-required': 'Evidence not required' })[status];

export const unitLabel = report => report.unitType === 'path-overview' ? 'Learning path overview'
  : report.unitType === 'room' ? 'Room' : /^\d+$/.test(report.unitId) ? `Module ${report.unitId}` : 'Module';
