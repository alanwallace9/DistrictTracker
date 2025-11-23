/**
 * Shared event bus for tenant switching
 * Allows AdminTenantContext to notify DemoRoleContext of changes
 * Zero-overhead client-side event system (no server polling)
 */

type TenantChangeEvent = {
  tenantId: string | null;
  isDemo: boolean;
};

type EventCallback = (data: TenantChangeEvent) => void;

class TenantEventEmitter {
  private listeners: EventCallback[] = [];

  on(callback: EventCallback) {
    this.listeners.push(callback);
  }

  off(callback: EventCallback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  emit(data: TenantChangeEvent) {
    this.listeners.forEach(callback => callback(data));
  }
}

export const tenantEvents = new TenantEventEmitter();
