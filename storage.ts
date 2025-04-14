import {
  users,
  uavs,
  telemetry,
  components,
  alerts,
  type User,
  type InsertUser,
  type Uav,
  type InsertUav,
  type Telemetry,
  type InsertTelemetry,
  type Component,
  type InsertComponent,
  type Alert,
  type InsertAlert,
  type DashboardStats,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, avg, count, sql } from "drizzle-orm";

import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // UAV methods
  getAllUavs(): Promise<Uav[]>;
  getUav(id: number): Promise<Uav | undefined>;
  createUav(uav: InsertUav): Promise<Uav>;
  updateUav(id: number, uav: Partial<InsertUav>): Promise<Uav | undefined>;

  // Telemetry methods
  getTelemetryByUavId(uavId: number, limit?: number): Promise<Telemetry[]>;
  createTelemetry(telemetry: InsertTelemetry): Promise<Telemetry>;

  // Component methods
  getComponentsByUavId(uavId: number): Promise<Component[]>;
  createComponent(component: InsertComponent): Promise<Component>;
  updateComponent(
    id: number,
    component: Partial<InsertComponent>,
  ): Promise<Component | undefined>;

  // Alert methods
  getAllAlerts(limit?: number): Promise<Alert[]>;
  getAlertsByUavId(uavId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: number, alert: Partial<Alert>): Promise<Alert | undefined>;

  // Dashboard stats
  getDashboardStats(): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // очистка устаревших сессий каждые 24 часа
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // UAV methods
  async getAllUavs(): Promise<Uav[]> {
    return await db.select().from(uavs);
  }

  async getUav(id: number): Promise<Uav | undefined> {
    const [uav] = await db.select().from(uavs).where(eq(uavs.id, id));
    return uav;
  }

  async createUav(insertUav: InsertUav): Promise<Uav> {
    const [uav] = await db.insert(uavs).values(insertUav).returning();
    return uav;
  }

  async updateUav(
    id: number,
    uavData: Partial<InsertUav>,
  ): Promise<Uav | undefined> {
    const [updatedUav] = await db
      .update(uavs)
      .set(uavData)
      .where(eq(uavs.id, id))
      .returning();
    return updatedUav;
  }

  // Telemetry methods
  async getTelemetryByUavId(
    uavId: number,
    limit?: number,
  ): Promise<Telemetry[]> {
    const query = db
      .select()
      .from(telemetry)
      .where(eq(telemetry.uavId, uavId))
      .orderBy(desc(telemetry.timestamp));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  }

  async createTelemetry(insertTelemetry: InsertTelemetry): Promise<Telemetry> {
    const [telemetryData] = await db
      .insert(telemetry)
      .values(insertTelemetry)
      .returning();

    // Update the UAV with the latest telemetry data
    await db
      .update(uavs)
      .set({
        batteryLevel: insertTelemetry.batteryLevel,
        signalStrength: insertTelemetry.signalStrength,
        speed: insertTelemetry.speed,
        altitude: insertTelemetry.altitude,
        lastUpdated: insertTelemetry.timestamp,
      })
      .where(eq(uavs.id, insertTelemetry.uavId));

    return telemetryData;
  }

  // Component methods
  async getComponentsByUavId(uavId: number): Promise<Component[]> {
    return await db
      .select()
      .from(components)
      .where(eq(components.uavId, uavId));
  }

  async createComponent(insertComponent: InsertComponent): Promise<Component> {
    const [component] = await db
      .insert(components)
      .values(insertComponent)
      .returning();
    return component;
  }

  async updateComponent(
    id: number,
    componentData: Partial<InsertComponent>,
  ): Promise<Component | undefined> {
    const [updatedComponent] = await db
      .update(components)
      .set(componentData)
      .where(eq(components.id, id))
      .returning();
    return updatedComponent;
  }

  // Alert methods
  async getAllAlerts(limit?: number): Promise<Alert[]> {
    const query = db.select().from(alerts).orderBy(desc(alerts.timestamp));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  }

  async getAlertsByUavId(uavId: number): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.uavId, uavId))
      .orderBy(desc(alerts.timestamp));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values({
        ...insertAlert,
        acknowledged: false,
        dismissed: false,
      })
      .returning();
    return alert;
  }

  async updateAlert(
    id: number,
    alertData: Partial<Alert>,
  ): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(alerts)
      .set(alertData)
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    // Count active UAVs (status = active, warning, or critical)
    const [activeUavsResult] = await db
      .select({ count: count() })
      .from(uavs)
      .where(
        or(
          eq(uavs.status, "active"),
          eq(uavs.status, "warning"),
          eq(uavs.status, "critical"),
        ),
      );

    // Count offline UAVs
    const [offlineUavsResult] = await db
      .select({ count: count() })
      .from(uavs)
      .where(eq(uavs.status, "offline"));

    // Count active alerts (not acknowledged and not dismissed)
    const [activeAlertsResult] = await db
      .select({ count: count() })
      .from(alerts)
      .where(and(eq(alerts.acknowledged, false), eq(alerts.dismissed, false)));

    // Calculate average battery level for active UAVs
    const [avgBatteryResult] = await db
      .select({ average: avg(uavs.batteryLevel) })
      .from(uavs)
      .where(
        or(
          eq(uavs.status, "active"),
          eq(uavs.status, "warning"),
          eq(uavs.status, "critical"),
        ),
      );

    return {
      activeUavs: activeUavsResult.count,
      offlineUavs: offlineUavsResult.count,
      activeAlerts: activeAlertsResult.count,
      avgBattery: Math.round(Number(avgBatteryResult.average || 0)),
    };
  }

  // Initialize database with demo data if empty
  async initializeDemoData() {
    // Check if we already have UAVs in the database
    const existingUavs = await db.select().from(uavs);
    if (existingUavs.length > 0) {
      return; // Database already has data
    }

    console.log("Initializing database with demo data...");

    // Create demo UAVs
    const uavData: InsertUav[] = [
      {
        name: "UAV-Alpha01",
        status: "active",
        batteryLevel: 92,
        signalStrength: 98,
        speed: 12,
        altitude: 120,
        lastUpdated: new Date(),
      },
      {
        name: "UAV-Bravo02",
        status: "warning",
        batteryLevel: 31,
        signalStrength: 85,
        speed: 8,
        altitude: 85,
        lastUpdated: new Date(),
      },
      {
        name: "UAV-Charlie03",
        status: "critical",
        batteryLevel: 54,
        signalStrength: 15,
        speed: 15,
        altitude: 210,
        lastUpdated: new Date(),
      },
      {
        name: "UAV-Delta04",
        status: "active",
        batteryLevel: 87,
        signalStrength: 92,
        speed: 9,
        altitude: 75,
        lastUpdated: new Date(),
      },
      {
        name: "UAV-Echo05",
        status: "offline",
        batteryLevel: 0,
        signalStrength: 0,
        speed: 0,
        altitude: 0,
        lastUpdated: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        name: "UAV-Foxtrot06",
        status: "offline",
        batteryLevel: 0,
        signalStrength: 0,
        speed: 0,
        altitude: 0,
        lastUpdated: new Date(Date.now() - 172800000), // 2 days ago
      },
    ];

    // Insert UAVs and collect their IDs
    const insertedUavs = await db.insert(uavs).values(uavData).returning();

    // Add components for each UAV
    for (const uav of insertedUavs) {
      if (uav.status === "offline") continue;

      // Components to add
      const componentData: InsertComponent[] = [
        // Motors
        {
          uavId: uav.id,
          type: "motor",
          status: "normal",
          details: "All motors functioning normally",
          value: 35,
          lastUpdated: new Date(),
        },
        // Camera
        {
          uavId: uav.id,
          type: "camera",
          status: "normal",
          details: "4K camera operational",
          value: 42,
          lastUpdated: new Date(),
        },
        // GPS
        {
          uavId: uav.id,
          type: "gps",
          status: "normal",
          details: "12 satellites connected",
          value: 85,
          lastUpdated: new Date(),
        },
        // Battery
        {
          uavId: uav.id,
          type: "battery",
          status: "normal",
          details: "5200mAh LiPo battery",
          value: uav.batteryLevel,
          lastUpdated: new Date(),
        },
        // Gyroscope - UAV-Bravo02 has a warning
        {
          uavId: uav.id,
          type: "gyroscope",
          status: uav.name === "UAV-Bravo02" ? "warning" : "normal",
          details:
            uav.name === "UAV-Bravo02"
              ? "Minor calibration needed"
              : "Calibrated and operational",
          value: uav.name === "UAV-Bravo02" ? 68 : 95,
          lastUpdated: new Date(),
        },
        // Radio Control - UAV-Charlie03 has a critical issue
        {
          uavId: uav.id,
          type: "radio",
          status: uav.name === "UAV-Charlie03" ? "critical" : "normal",
          details:
            uav.name === "UAV-Charlie03"
              ? "Signal interference detected"
              : "2.4GHz connection stable",
          value: uav.name === "UAV-Charlie03" ? 15 : 95,
          lastUpdated: new Date(),
        },
      ];

      await db.insert(components).values(componentData);

      // Add telemetry history (30 minutes of data at 1-minute intervals)
      const now = new Date();
      const telemetryEntries: InsertTelemetry[] = [];

      for (let i = 0; i < 30; i++) {
        const timestamp = new Date(now.getTime() - i * 60000);

        // Generate slightly varying telemetry values
        const variation = Math.random() * 10 - 5; // -5 to +5

        telemetryEntries.push({
          uavId: uav.id,
          timestamp,
          batteryLevel: Math.round(
            Math.max(0, Math.min(100, uav.batteryLevel - i * 0.15)),
          ),
          signalStrength: Math.round(
            Math.max(0, Math.min(100, uav.signalStrength + variation / 2)),
          ),
          speed: Number(Math.max(0, uav.speed + variation / 3).toFixed(2)),
          altitude: Math.round(Math.max(0, uav.altitude + variation)),
          latitude: Number((37.7749 + variation / 1000).toFixed(6)),
          longitude: Number((-122.4194 + variation / 1000).toFixed(6)),
          temperature: Number((25 + variation / 5).toFixed(2)),
        });
      }

      if (telemetryEntries.length > 0) {
        await db.insert(telemetry).values(telemetryEntries);
      }
    }

    // Create alerts
    const alertsData: InsertAlert[] = [
      {
        uavId: 3, // UAV-Charlie03
        severity: "critical",
        message:
          "Signal Loss Detected: UAV-Charlie03 has weak signal strength (15%).",
        timestamp: new Date(Date.now() - 10 * 60000), // 10 minutes ago
        acknowledged: false,
        dismissed: false,
      },
      {
        uavId: 2, // UAV-Bravo02
        severity: "warning",
        message: "Low Battery Warning: UAV-Bravo02 battery level below 35%.",
        timestamp: new Date(Date.now() - 25 * 60000), // 25 minutes ago
        acknowledged: false,
        dismissed: false,
      },
      {
        uavId: 1, // UAV-Alpha01
        severity: "info",
        message:
          "Maintenance Due: UAV-Alpha01 scheduled maintenance due in 3 days.",
        timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
        acknowledged: false,
        dismissed: false,
      },
    ];

    await db.insert(alerts).values(alertsData);

    console.log("Demo data initialization complete.");
  }
}

// Create and export the database storage instance
export const storage = new DatabaseStorage();
