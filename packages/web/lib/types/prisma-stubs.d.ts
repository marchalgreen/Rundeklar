declare module '@prisma/client' {
  export namespace Prisma {
    // Minimal loose shapes to satisfy calendar-focused type-checks
    type JsonValue = any;
    type JsonObject = any;

    interface TransactionClient {
      vendorCatalogItem: {
        create(args: any): Promise<any>;
        update(args: any): Promise<any>;
        deleteMany(args: any): Promise<any>;
      };
      vendorSyncState: {
        upsert(args: any): Promise<any>;
      };
      [key: string]: any;
    }
  }

  export type Product = any;
  export enum ProductCategory {
    Accessories = 'Accessories',
    Frames = 'Frames',
    Lenses = 'Lenses',
    Other = 'Other',
  }
  export type StoreStock = any;
  export type VendorCatalogItem = any;
  export type VendorIntegration = any;
  export type VendorSyncState = any;
  export type Vendor = any;
  export type VendorSyncRun = any;

  export enum VendorSyncRunStatus {
    Pending = 'Pending',
    Running = 'Running',
    Success = 'Success',
    Failed = 'Failed',
    pending = 'pending',
    running = 'running',
    completed = 'completed',
    failed = 'failed',
  }

  export enum IntegrationType {
    SCRAPER = 'SCRAPER',
    API = 'API',
    manual = 'manual',
    automated = 'automated',
  }
}
