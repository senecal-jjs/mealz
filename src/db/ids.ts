/** A short unique id for user rows; time-prefixed so ids sort roughly by creation. */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
