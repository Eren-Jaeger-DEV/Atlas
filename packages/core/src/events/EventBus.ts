/**
 * Atlas Studio EventBus
 *
 * Strongly-typed pub/sub event bus replacing direct component coupling.
 */

export type AtlasEventName =
  | "WorkspaceOpened"
  | "FileOpened"
  | "FileSaved"
  | "ActiveEditorChanged"
  | "GitStatusChanged"
  | "TerminalCreated"
  | "ThemeChanged"
  | "SettingsChanged"
  | "CommandExecuted";

export type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on<T = any>(event: AtlasEventName, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public emit<T = any>(event: AtlasEventName, payload?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`[EventBus] Error in listener for event ${event}:`, e);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
