/** CharacterPending 상태 (수락 후 4방향 생성) */
export enum CharacterPendingStatus {
  /** 모션 4방향 생성 중 */
  MOTION_PROCESSING = 'motion_processing',
  /** 완료 */
  DONE = 'done',
  /** 실패 */
  FAILED = 'failed',
}
