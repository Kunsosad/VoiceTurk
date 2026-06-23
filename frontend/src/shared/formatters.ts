import { RecordingStatus } from './types';

/**
 * Formats a numeric value into VND format, e.g. "500.000 VND"
 */
export function formatMoneyVND(amount: number): string {
  if (amount === undefined || amount === null) return '0 VND';
  return amount.toLocaleString('vi-VN') + ' VND';
}

/**
 * Formats a duration in seconds to "Xm Ys", e.g. "1m 15s"
 */
export function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

/**
 * Formats standard date-time string into a human-readable local representation
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return dateStr; // Fallback
    }
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Localized human labels for recording states without system abbreviations
 */
export function formatRecordingStatus(status: RecordingStatus): string {
  switch (status) {
    case 'Pending review':
      return 'Chờ duyệt';
    case 'Accepted':
      return 'Chấp thuận';
    case 'Retake requested':
      return 'Yêu cầu thu lại';
    case 'Rejected':
      return 'Từ chối';
    default:
      return status;
  }
}

/**
 * Localized campaign status formats
 */
export function formatCampaignStatus(status: string): string {
  switch (status) {
    case 'Draft':
      return 'Bản nháp';
    case 'TermsPending':
      return 'Chờ lập quỹ';
    case 'Active':
      return 'Đang hoạt động';
    case 'Completed':
      return 'Đã hoàn thành';
    default:
      return status;
  }
}
