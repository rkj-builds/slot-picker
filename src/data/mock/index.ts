/**
 * The demo's backend: every `DataClient` method answered in the browser,
 * from fake data, after a simulated round trip. Nothing leaves the page.
 */
import type { DataClient } from "@/data/client";
import { createContext, type MockOptions } from "@/data/mock/context";
import { mockAvailability, mockBookings, mockCustomers } from "@/data/mock/bookings";
import { mockInbox, mockMoney, mockSettings, mockTeam } from "@/data/mock/money";
import { mockEnrolments, mockMemberships, mockProgrammes } from "@/data/mock/programmes";

export function createMockClient(options: MockOptions): DataClient {
  const ctx = createContext(options);
  return {
    bookings: mockBookings(ctx),
    availability: mockAvailability(ctx),
    customers: mockCustomers(ctx),
    programmes: mockProgrammes(ctx),
    enrolments: mockEnrolments(ctx),
    memberships: mockMemberships(ctx),
    money: mockMoney(ctx),
    inbox: mockInbox(ctx),
    team: mockTeam(ctx),
    settings: mockSettings(ctx),
    subscribe: (listener) => options.db.subscribe(listener),
  };
}

export { MockDb } from "@/data/mock/db";
export { seedTables } from "@/data/mock/seed";
