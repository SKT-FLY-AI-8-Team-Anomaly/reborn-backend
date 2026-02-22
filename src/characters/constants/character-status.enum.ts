/** CharacterPending 상태 (스키마: pending | completed | failed) */
export enum CharacterPendingStatus {
  /** 대기/처리 중 */
  PENDING = 'pending',
  /** 완료 */
  COMPLETED = 'completed',
  /** 실패 */
  FAILED = 'failed',
}
