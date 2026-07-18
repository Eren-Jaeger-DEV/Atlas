/**
 * ServiceContainer
 *
 * Central Dependency Injection container for all platform services in Atlas Studio.
 */

import { EventBus } from "../events/EventBus.js";
import { CommandService } from "../services/CommandService.js";
import { SettingsService } from "../services/SettingsService.js";
import { ExtensionHost } from "../services/ExtensionHost.js";

export class ServiceContainer {
  private static instance: ServiceContainer;

  public readonly eventBus: EventBus;
  public readonly commandService: CommandService;
  public readonly settingsService: SettingsService;
  public readonly extensionHost: ExtensionHost;

  private services: Map<string, any> = new Map();

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.commandService = new CommandService(this.eventBus);
    this.settingsService = new SettingsService(this.eventBus);
    this.extensionHost = new ExtensionHost(this.commandService, this.eventBus);

    // Register built-in services
    this.register("EventBus", this.eventBus);
    this.register("CommandService", this.commandService);
    this.register("SettingsService", this.settingsService);
    this.register("ExtensionHost", this.extensionHost);
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  public get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`[ServiceContainer] Service not registered: ${name}`);
    }
    return service as T;
  }

  public has(name: string): boolean {
    return this.services.has(name);
  }
}
